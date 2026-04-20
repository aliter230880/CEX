import { ethers } from "ethers";
import { eq, and } from "drizzle-orm";
import { db, depositAddressesTable, cryptoTransactionsTable, balancesTable, customTokensTable } from "@workspace/db";
import { logger } from "./logger";
import {
  getProvider,
  rotateProvider,
  getAssetConfig,
  formatAmount,
  SUPPORTED_DEPOSIT_ASSETS,
  getRequiredConfirmations,
} from "./blockchain";
import { startEtherscanMonitor, stopEtherscanMonitor, resetEtherscanScan } from "./etherscan-monitor";
import { sweepDepositAddress } from "./sweep-service";

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// Track last scanned block per network
const lastScannedBlock: Record<string, bigint> = {};

// How far back to scan on FIRST start per network (blocks)
// Polygon ~2 sec/block → 80 000 blocks ≈ 1.9 days  (publicnode.com max history)
// BSC     ~3 sec/block → 50 000 blocks ≈ 1.7 days
// ETH    ~12 sec/block →  5 000 blocks ≈ 0.7 days
const STARTUP_LOOKBACK: Record<string, bigint> = {
  POLYGON:  80_000n,
  BSC:      50_000n,
  ETH:       5_000n,
};

// Max blocks to scan per 30-sec cycle
// Larger chunks = faster historical catch-up; publicnode supports up to ~50k per getLogs call
const MAX_BLOCKS_PER_CYCLE: Record<string, bigint> = {
  POLYGON: 5_000n,
  BSC:     2_000n,
  ETH:     1_000n,
};

// Public API: reset scan head so admin can force a historical re-scan
export function resetScanBlock(network: string, blockNumber: bigint) {
  lastScannedBlock[network] = blockNumber;
}

async function scanNetwork(network: string) {
  let provider = getProvider(network);
  let currentBlock: bigint;
  try {
    currentBlock = BigInt(await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]));
  } catch {
    return; // RPC unavailable or slow, skip this round
  }

  // Use a safety buffer to avoid "invalid block range" errors on fresh blocks
  const safeBlock = currentBlock > 10n ? currentBlock - 10n : currentBlock;

  if (!lastScannedBlock[network]) {
    const lookback = STARTUP_LOOKBACK[network] ?? 10n;
    lastScannedBlock[network] = safeBlock > lookback ? safeBlock - lookback : 0n;
    logger.info({ network, fromBlock: lastScannedBlock[network].toString(), currentBlock: safeBlock.toString() }, "Deposit monitor starting — scanning historical blocks");
  }

  const fromBlock = lastScannedBlock[network] + 1n;
  if (fromBlock > safeBlock) return;

  // Limit scan range per cycle to keep each getLogs call within RPC limits
  const maxChunk = MAX_BLOCKS_PER_CYCLE[network] ?? 500n;
  const toBlock = safeBlock > fromBlock + maxChunk ? fromBlock + maxChunk : safeBlock;

  // Get all deposit addresses (we'll filter by matching)
  const depositAddresses = await db.select().from(depositAddressesTable);
  if (depositAddresses.length === 0) {
    lastScannedBlock[network] = toBlock;
    return;
  }

  const addressSet = new Set(depositAddresses.map((d) => d.address.toLowerCase()));
  const assets = SUPPORTED_DEPOSIT_ASSETS[network] ?? [];

  // Small delay helper to avoid rate limiting on batch RPC calls
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  for (const asset of assets) {
    try {
      const config = getAssetConfig(asset, network);
      if (config.isNative) {
        await scanNativeTransfers(network, provider, fromBlock, toBlock, depositAddresses, addressSet, asset);
      } else if (config.contractAddress) {
        await scanERC20Transfers(network, provider, fromBlock, toBlock, depositAddresses, addressSet, asset, config.contractAddress, config.decimals);
      }
    } catch (err) {
      logger.warn({ err, network, asset }, "Error scanning asset — rotating provider");
      try { provider = rotateProvider(network); } catch { /* ignore */ }
    }
    await delay(600); // avoid rate limits on public BSC RPC nodes
  }

  // Also scan custom tokens on this network
  // custom_tokens.network is stored uppercase (POLYGON/ETH/BSC) — match directly
  const customTokenNetwork = network; // "POLYGON", "ETH", "BSC"
  {
    const customTokens = await db.select().from(customTokensTable).where(
      eq(customTokensTable.network, customTokenNetwork),
    );
    for (const token of customTokens) {
      if (!token.contractAddress) continue;
      try {
        await scanERC20Transfers(
          network, provider, fromBlock, toBlock,
          depositAddresses, addressSet,
          token.symbol, token.contractAddress, token.decimals ?? 18,
        );
      } catch (err) {
        logger.warn({ err, network, token: token.symbol }, "Error scanning custom token — rotating provider");
        try { provider = rotateProvider(network); } catch { /* ignore */ }
      }
      await delay(600);
    }
  }

  lastScannedBlock[network] = toBlock;
}

async function scanNativeTransfers(
  network: string,
  provider: ethers.JsonRpcProvider,
  fromBlock: bigint,
  toBlock: bigint,
  depositAddresses: { userId: number; address: string }[],
  addressSet: Set<string>,
  asset: string,
) {
  // For native transfers we need to check each block (expensive), so use a lighter approach:
  // Check current on-chain balance vs last known balance
  // Use "latest" tag instead of specific block number to avoid "missing trie node" on non-archive nodes

  for (const da of depositAddresses) {
    try {
      const balance = await provider.getBalance(da.address, "latest");
      if (balance === 0n) continue;

      // Check if we already have a confirmed deposit for this balance
      const existingConfirmed = await db
        .select()
        .from(cryptoTransactionsTable)
        .where(
          and(
            eq(cryptoTransactionsTable.userId, da.userId),
            eq(cryptoTransactionsTable.asset, asset),
            eq(cryptoTransactionsTable.network, network),
            eq(cryptoTransactionsTable.type, "deposit"),
            eq(cryptoTransactionsTable.status, "confirmed"),
          ),
        );

      const totalConfirmed = existingConfirmed.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      const onChainAmount = parseFloat(ethers.formatEther(balance));

      // If on-chain balance is more than confirmed deposits, record a new deposit
      const newAmount = onChainAmount - totalConfirmed;
      if (newAmount > 0.00001) {
        // Check for existing pending tx
        const pending = await db
          .select()
          .from(cryptoTransactionsTable)
          .where(
            and(
              eq(cryptoTransactionsTable.userId, da.userId),
              eq(cryptoTransactionsTable.asset, asset),
              eq(cryptoTransactionsTable.network, network),
              eq(cryptoTransactionsTable.type, "deposit"),
              eq(cryptoTransactionsTable.status, "pending"),
            ),
          );

        if (pending.length === 0) {
          await creditDeposit(da.userId, asset, network, newAmount.toFixed(8));
        }
      }
    } catch (err) {
      logger.warn({ err, address: da.address, network }, "Error checking native balance");
    }
  }
}

async function scanERC20Transfers(
  network: string,
  provider: ethers.JsonRpcProvider,
  fromBlock: bigint,
  toBlock: bigint,
  depositAddresses: { userId: number; address: string }[],
  addressSet: Set<string>,
  asset: string,
  contractAddress: string,
  decimals: number,
) {
  try {
    const iface = new ethers.Interface(ERC20_ABI);
    const transferTopic = ethers.id("Transfer(address,address,uint256)");

    // Pad deposit addresses to 32-byte topic values for indexed "to" filtering.
    // This filters at the node level so we only receive transfers TO our wallets —
    // avoiding downloading millions of unrelated Transfer events.
    const paddedAddresses = depositAddresses.map(
      (d) => "0x" + d.address.slice(2).toLowerCase().padStart(64, "0"),
    );

    const logs = await provider.getLogs({
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      address: contractAddress,
      topics: [transferTopic, null, paddedAddresses],
    });

    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;

        const toAddr: string = parsed.args[1];
        const value: bigint = parsed.args[2];

        if (!addressSet.has(toAddr.toLowerCase())) continue;

        const txHash = log.transactionHash;
        const fromAddr: string = parsed.args[0];

        // Check if already recorded
        const exists = await db
          .select()
          .from(cryptoTransactionsTable)
          .where(eq(cryptoTransactionsTable.txHash, txHash));

        if (exists.length > 0) continue;

        const da = depositAddresses.find((d) => d.address.toLowerCase() === toAddr.toLowerCase());
        if (!da) continue;

        const amount = formatAmount(value, decimals);

        // Get current block for confirmations
        const currentBlock = await provider.getBlockNumber();
        const txBlock = log.blockNumber;
        const confirmations = currentBlock - txBlock;
        const required = getRequiredConfirmations(network);

        if (confirmations >= required) {
          await creditDeposit(da.userId, asset, network, amount, txHash, fromAddr, toAddr);
        } else {
          // Record as pending
          await db.insert(cryptoTransactionsTable).values({
            userId: da.userId,
            type: "deposit",
            asset,
            network,
            amount,
            txHash,
            status: "pending",
            fromAddress: fromAddr,
            toAddress: toAddr,
            confirmations,
          }).onConflictDoNothing();
        }
      } catch (err) {
        logger.warn({ err }, "Error parsing ERC20 transfer log");
      }
    }

    // Process pending ERC20 deposits - check if they now have enough confirmations
    const pendingDeposits = await db
      .select()
      .from(cryptoTransactionsTable)
      .where(
        and(
          eq(cryptoTransactionsTable.type, "deposit"),
          eq(cryptoTransactionsTable.status, "pending"),
          eq(cryptoTransactionsTable.network, network),
          eq(cryptoTransactionsTable.asset, asset),
        ),
      );

    const currentBlock = await provider.getBlockNumber();
    const required = getRequiredConfirmations(network);

    for (const pending of pendingDeposits) {
      if (!pending.txHash) continue;
      try {
        const receipt = await provider.getTransactionReceipt(pending.txHash);
        if (!receipt || !receipt.blockNumber) continue;
        const confirmations = currentBlock - receipt.blockNumber;
        if (confirmations >= required) {
          await creditDeposit(
            pending.userId,
            pending.asset,
            pending.network,
            pending.amount,
            pending.txHash,
            pending.fromAddress ?? undefined,
            pending.toAddress ?? undefined,
            pending.id,
          );
        } else {
          await db.update(cryptoTransactionsTable)
            .set({ confirmations })
            .where(eq(cryptoTransactionsTable.id, pending.id));
        }
      } catch {
        // skip
      }
    }
  } catch (err) {
    logger.warn({ err, network, contractAddress }, "Error scanning ERC20 transfers");
  }
}

async function creditDeposit(
  userId: number,
  asset: string,
  network: string,
  amount: string,
  txHash?: string,
  fromAddress?: string,
  toAddress?: string,
  existingId?: number,
) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;

  // Update or create transaction record
  if (existingId) {
    await db.update(cryptoTransactionsTable)
      .set({ status: "confirmed", confirmations: getRequiredConfirmations(network) })
      .where(eq(cryptoTransactionsTable.id, existingId));
  } else {
    await db.insert(cryptoTransactionsTable).values({
      userId,
      type: "deposit",
      asset,
      network,
      amount,
      txHash: txHash ?? null,
      status: "confirmed",
      fromAddress: fromAddress ?? null,
      toAddress: toAddress ?? null,
      confirmations: getRequiredConfirmations(network),
    });
  }

  // Credit user balance
  const [existing] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (existing) {
    const newAvail = (parseFloat(existing.available) + amt).toFixed(8);
    await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, existing.id));
  } else {
    await db.insert(balancesTable).values({ userId, asset, available: amt.toFixed(8), locked: "0", network });
  }

  logger.info({ userId, asset, network, amount, txHash }, "Deposit credited");

  // Auto-sweep: move funds from deposit address to hot wallet (non-blocking)
  // Resolve deposit address: use toAddress if available, otherwise look up from DB
  (async () => {
    try {
      let depositAddr = toAddress;
      if (!depositAddr) {
        const [row] = await db
          .select()
          .from(depositAddressesTable)
          .where(eq(depositAddressesTable.userId, userId));
        depositAddr = row?.address;
      }
      if (depositAddr) {
        await sweepDepositAddress(userId, asset, network, depositAddr);
      }
    } catch (err) {
      logger.warn({ err, userId, asset, network }, "Auto-sweep trigger failed");
    }
  })();
}

// ETH and POLYGON are handled by the Etherscan monitor (more reliable, full history).
// BSC is also handled by the Etherscan monitor if BSCSCAN_API_KEY is set.
// If BSCSCAN_API_KEY is NOT set, BSC deposits are not monitored via explorer API —
// public BSC RPCs rate-limit getLogs requests (error -32005).
// Add your free BscScan API key at https://bscscan.com/apis as BSCSCAN_API_KEY.
const POLL_INTERVAL_MS = 30_000;

let monitorInterval: NodeJS.Timeout | null = null;

export function startDepositMonitor() {
  if (monitorInterval) return;
  logger.info("Starting deposit monitor (Etherscan/BscScan API)");

  // Etherscan monitor for ETH + POLYGON (+ BSC if BSCSCAN_API_KEY is set)
  startEtherscanMonitor();

  // Keep a heartbeat interval so stopDepositMonitor can clean up
  monitorInterval = setInterval(() => { /* heartbeat */ }, POLL_INTERVAL_MS);
}

export function stopDepositMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  stopEtherscanMonitor();
}

export function resetAllScanBlocks() {
  for (const network of NETWORKS) {
    lastScannedBlock[network] = 0n;
  }
  resetEtherscanScan();
}
