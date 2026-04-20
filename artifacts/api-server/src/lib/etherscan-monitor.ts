/**
 * Etherscan-based deposit monitor.
 *
 * Strategy:
 *   ETH    (chainid=1)   — Etherscan V2 API (free key ETHERSCAN_API_KEY)
 *   POLYGON (chainid=137) — Etherscan V2 API (free key ETHERSCAN_API_KEY)
 *   BSC    (chainid=56)  — BscScan API (free key BSCSCAN_API_KEY) if set,
 *                          otherwise skipped (public RPCs rate-limit getLogs)
 *
 * Etherscan/BscScan `tokentx` and `txlist` endpoints return ALL historical
 * transactions for a given address — no block-range issues, no getLogs prune errors.
 * Rate limit on free plan: 5 calls/sec; we poll every 60s so it's fine.
 *
 * For native coins (ETH, POL, BNB) we use `txlist` filtered to incoming.
 */

import { ethers } from "ethers";
import { eq, and } from "drizzle-orm";
import { db, depositAddressesTable, cryptoTransactionsTable, balancesTable, customTokensTable } from "@workspace/db";
import { logger } from "./logger";
import { getRequiredConfirmations, getProvider } from "./blockchain";
import { sweepDepositAddress } from "./sweep-service";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";

// Networks + their Etherscan V2 chain IDs (ETHERSCAN_API_KEY covers ETH + POLYGON free)
const ETHERSCAN_CHAIN_IDS: Record<string, number> = {
  ETH:     1,
  POLYGON: 137,
};

// BSC via Etherscan V2 with chainid=56 — requires a key registered on bscscan.com
// (BscScan migrated to Etherscan V2: "Access 50+ EVM chains with a single API key")
const BSC_CHAIN_ID = 56;

// Native asset symbol per network (all networks including BSC)
const NATIVE_ASSET: Record<string, string> = {
  ETH:     "ETH",
  POLYGON: "POL",
  BSC:     "BNB",
};

// Track last processed block per network to avoid re-processing
const lastProcessedBlock: Record<string, number> = {};

async function explorerFetch(
  baseUrl: string,
  apiKey: string,
  params: Record<string, string>,
  chainIdParam?: number,
): Promise<unknown[]> {
  const qs = new URLSearchParams({
    ...(chainIdParam !== undefined ? { chainid: String(chainIdParam) } : {}),
    apikey: apiKey,
    ...params,
  }).toString();

  const url = `${baseUrl}?${qs}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Explorer API HTTP ${res.status}`);

  const json = await res.json() as { status: string; message: string; result: unknown };
  if (json.status !== "1") {
    if (json.message === "No transactions found" || json.result === "No transactions found") {
      return [];
    }
    throw new Error(`Explorer API error: ${json.message} — ${JSON.stringify(json.result).slice(0, 100)}`);
  }
  return Array.isArray(json.result) ? json.result : [];
}

async function etherscanFetch(chainId: number, params: Record<string, string>): Promise<unknown[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY not set");
  return explorerFetch(ETHERSCAN_BASE, apiKey, params, chainId);
}

async function bscscanFetch(params: Record<string, string>): Promise<unknown[]> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) throw new Error("BSCSCAN_API_KEY not set");
  // BscScan migrated to Etherscan V2 — use same endpoint with chainid=56
  return explorerFetch(ETHERSCAN_BASE, apiKey, params, BSC_CHAIN_ID);
}

interface EtherscanTokenTx {
  blockNumber:      string;
  hash:             string;
  from:             string;
  to:               string;
  value:            string;
  tokenSymbol:      string;
  tokenDecimal:     string;
  contractAddress:  string;
  confirmations:    string;
}

interface EtherscanNativeTx {
  blockNumber:   string;
  hash:          string;
  from:          string;
  to:            string;
  value:         string;          // in wei
  confirmations: string;
  isError:       string;
}

type FetchFn = (params: Record<string, string>) => Promise<unknown[]>;

/**
 * Scan a single deposit address on one network using a block explorer API.
 * Fetches ERC-20 token transfers + native coin transactions.
 */
async function scanAddressOnChain(
  network:    string,
  fetchFn:    FetchFn,
  depAddr:    { userId: number; address: string },
) {
  const addr       = depAddr.address.toLowerCase();
  const required   = getRequiredConfirmations(network);
  const startBlock = lastProcessedBlock[`${network}:${addr}`] ?? 0;

  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // ── ERC-20 token transfers ──────────────────────────────────────────────
  let tokenTxs: EtherscanTokenTx[] = [];
  try {
    tokenTxs = (await fetchFn({
      module:     "account",
      action:     "tokentx",
      address:    depAddr.address,
      startblock: String(startBlock),
      endblock:   "99999999",
      sort:       "asc",
      page:       "1",
      offset:     "200",
    })) as EtherscanTokenTx[];
  } catch (err) {
    logger.warn({ err, network, address: addr }, "Explorer tokentx fetch failed");
  }

  for (const tx of tokenTxs) {
    // Only transfers TO our address
    if (tx.to.toLowerCase() !== addr) continue;

    const confs = parseInt(tx.confirmations, 10);
    if (confs < required) continue;

    const txHash = tx.hash;
    const symbol = tx.tokenSymbol;
    const decimals = parseInt(tx.tokenDecimal, 10);
    const amount = ethers.formatUnits(tx.value, decimals);

    await processTx(depAddr.userId, symbol, network, amount, txHash, tx.from, tx.to, confs);
  }

  // Pause between tokentx and txlist to stay under rate limit (free plan: 5 req/sec)
  await delay(500);

  // ── Native coin transfers (ETH / POL / BNB) ────────────────────────────
  const nativeAsset = NATIVE_ASSET[network];
  if (nativeAsset) {
    let nativeTxs: EtherscanNativeTx[] = [];
    try {
      nativeTxs = (await fetchFn({
        module:     "account",
        action:     "txlist",
        address:    depAddr.address,
        startblock: String(startBlock),
        endblock:   "99999999",
        sort:       "asc",
        page:       "1",
        offset:     "200",
      })) as EtherscanNativeTx[];
    } catch (err) {
      logger.warn({ err, network, address: addr }, "Explorer txlist fetch failed");
    }

    for (const tx of nativeTxs) {
      if (tx.isError === "1") continue;                         // failed tx
      if (tx.to.toLowerCase() !== addr) continue;              // not incoming
      if (tx.value === "0" || tx.value === "0x0") continue;    // zero value

      const confs = parseInt(tx.confirmations, 10);
      if (confs < required) continue;

      const amount = ethers.formatEther(tx.value);
      if (parseFloat(amount) < 0.000001) continue;

      await processTx(depAddr.userId, nativeAsset, network, amount, tx.hash, tx.from, tx.to, confs);
    }
  }

  // Advance the startblock watermark to avoid re-fetching old txs
  const allBlocks = tokenTxs.map(t => parseInt(t.blockNumber, 10));
  if (allBlocks.length > 0) {
    const maxBlock = Math.max(...allBlocks);
    lastProcessedBlock[`${network}:${addr}`] = maxBlock + 1;
  }
}

// ── Moralis BSC scanner ─────────────────────────────────────────────────────
const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

interface MoralisTokenTx {
  transaction_hash: string;
  from_address:     string;
  to_address:       string;
  token_symbol:     string;
  token_decimals:   string;
  value_decimal:    string;
  block_number:     string;
  possible_spam:    boolean;
}

interface MoralisNativeTx {
  hash:             string;
  from_address:     string;
  to_address:       string;
  value:            string; // wei
  block_number:     string;
  receipt_status:   string;
}

async function moralisFetch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) throw new Error("MORALIS_API_KEY not set");

  const qs = new URLSearchParams(params).toString();
  const url = `${MORALIS_BASE}${path}?${qs}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Moralis API HTTP ${res.status}`);
  const json = await res.json() as { result: T[] };
  return Array.isArray(json.result) ? json.result : [];
}

/**
 * Scan a single deposit address on BSC using Moralis API.
 * Used when MORALIS_API_KEY is set and BSCSCAN_API_KEY is not available.
 */
async function scanAddressOnBscMoralis(
  depAddr: { userId: number; address: string },
) {
  const addr      = depAddr.address.toLowerCase();
  const required  = getRequiredConfirmations("BSC");
  const fromBlock = lastProcessedBlock[`BSC:${addr}`] ?? 0;
  const fromBlockStr = String(fromBlock);

  // ── ERC-20 token transfers ──────────────────────────────────────────────
  let tokenTxs: MoralisTokenTx[] = [];
  try {
    const tokenParams: Record<string, string> = { chain: "bsc", limit: "100" };
    if (fromBlock > 0) tokenParams.from_block = fromBlockStr;
    tokenTxs = await moralisFetch<MoralisTokenTx>(
      `/${depAddr.address}/erc20/transfers`,
      tokenParams,
    );
  } catch (err) {
    logger.warn({ err, address: addr }, "Moralis BSC tokentx fetch failed");
  }

  let maxBlock = fromBlock;

  for (const tx of tokenTxs) {
    if (tx.possible_spam) continue;
    if (tx.to_address.toLowerCase() !== addr) continue;

    const amt = parseFloat(tx.value_decimal);
    if (isNaN(amt) || amt <= 0) continue;

    const blockNum = parseInt(tx.block_number, 10);
    if (blockNum > maxBlock) maxBlock = blockNum;

    // Moralis doesn't give confirmations — derive from current block (approximation)
    const currentBlock = lastProcessedBlock[`BSC:__head`] ?? blockNum + required + 1;
    const confs = Math.max(0, currentBlock - blockNum);
    if (confs < required) continue;

    await processTx(
      depAddr.userId, tx.token_symbol, "BSC",
      tx.value_decimal, tx.transaction_hash,
      tx.from_address, tx.to_address, confs,
    );
  }

  // ── Native BNB transfers ────────────────────────────────────────────────
  let nativeTxs: MoralisNativeTx[] = [];
  try {
    const nativeParams: Record<string, string> = { chain: "bsc", limit: "100" };
    if (fromBlock > 0) nativeParams.from_block = fromBlockStr;
    nativeTxs = await moralisFetch<MoralisNativeTx>(
      `/${depAddr.address}`,
      nativeParams,
    );
  } catch (err) {
    logger.warn({ err, address: addr }, "Moralis BSC native fetch failed");
  }

  for (const tx of nativeTxs) {
    if (tx.receipt_status === "0") continue;                     // failed tx
    if (tx.to_address.toLowerCase() !== addr) continue;         // not incoming
    if (!tx.value || tx.value === "0") continue;

    const amount = ethers.formatEther(tx.value);
    if (parseFloat(amount) < 0.000001) continue;

    const blockNum = parseInt(tx.block_number, 10);
    if (blockNum > maxBlock) maxBlock = blockNum;

    const currentBlock = lastProcessedBlock[`BSC:__head`] ?? blockNum + required + 1;
    const confs = Math.max(0, currentBlock - blockNum);
    if (confs < required) continue;

    await processTx(
      depAddr.userId, "BNB", "BSC",
      amount, tx.hash, tx.from_address, tx.to_address, confs,
    );
  }

  // Advance watermark
  if (maxBlock > fromBlock) {
    lastProcessedBlock[`BSC:${addr}`] = maxBlock + 1;
  }
}

async function triggerSweep(userId: number, asset: string, network: string, depositAddress: string) {
  try {
    let addr = depositAddress;
    if (!addr) {
      const [row] = await db.select().from(depositAddressesTable).where(eq(depositAddressesTable.userId, userId));
      addr = row?.address ?? "";
    }
    if (addr) {
      await sweepDepositAddress(userId, asset, network, addr);
    }
  } catch (err) {
    logger.warn({ err, userId, asset, network }, "Auto-sweep trigger failed");
  }
}

async function processTx(
  userId:      number,
  asset:       string,
  network:     string,
  amount:      string,
  txHash:      string,
  fromAddress: string,
  toAddress:   string,
  confirmations: number,
) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;

  // Atomically upgrade pending → confirmed (only if currently pending).
  // RETURNING ensures we credit only when this process wins the race.
  const upgraded = await db.update(cryptoTransactionsTable)
    .set({ status: "confirmed", confirmations })
    .where(and(
      eq(cryptoTransactionsTable.txHash, txHash),
      eq(cryptoTransactionsTable.status, "pending"),
    ))
    .returning({ id: cryptoTransactionsTable.id });

  if (upgraded.length > 0) {
    await creditBalance(userId, asset, network, amount);
    logger.info({ userId, asset, network, amount, txHash }, "Deposit confirmed (was pending)");
    // Auto-sweep: move funds to hot wallet (non-blocking)
    void triggerSweep(userId, asset, network, toAddress);
    return;
  }

  // Atomically insert a new confirmed deposit.
  // ON CONFLICT DO NOTHING + RETURNING guarantees creditBalance runs exactly once
  // even when multiple concurrent force-rescans process the same txHash.
  const inserted = await db.insert(cryptoTransactionsTable).values({
    userId,
    type:        "deposit",
    asset,
    network,
    amount,
    txHash,
    status:      "confirmed",
    fromAddress,
    toAddress,
    confirmations,
  }).onConflictDoNothing().returning({ id: cryptoTransactionsTable.id });

  if (inserted.length > 0) {
    await creditBalance(userId, asset, network, amount);
    logger.info({ userId, asset, network, amount, txHash }, "Deposit credited via Etherscan");
    // Auto-sweep: move funds to hot wallet (non-blocking)
    void triggerSweep(userId, asset, network, toAddress);
  } else {
    logger.debug({ txHash, asset, network }, "Deposit already recorded — skipping credit (concurrent rescan)");
  }
}

async function creditBalance(userId: number, asset: string, network: string, amount: string) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;

  const [existing] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (existing) {
    const newAvail = (parseFloat(existing.available) + amt).toFixed(8);
    await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, existing.id));
  } else {
    await db.insert(balancesTable).values({
      userId,
      asset,
      available: amt.toFixed(8),
      locked:    "0",
      network,
    });
  }
}

/**
 * Check pending withdrawal transactions and update their status.
 * Polls the RPC for transaction receipts and confirms/fails withdrawals.
 */
async function confirmPendingWithdrawals() {
  const NETWORK_RPC: Record<string, string> = { ETH: "ETH", POLYGON: "POLYGON", BSC: "BSC" };

  const pendingWithdrawals = await db
    .select()
    .from(cryptoTransactionsTable)
    .where(and(
      eq(cryptoTransactionsTable.type, "withdrawal"),
      eq(cryptoTransactionsTable.status, "pending"),
    ));

  for (const tx of pendingWithdrawals) {
    if (!tx.txHash) continue;

    const rpcNetwork = NETWORK_RPC[tx.network];
    if (!rpcNetwork) continue;

    try {
      const provider = getProvider(rpcNetwork);
      const receipt = await Promise.race([
        provider.getTransactionReceipt(tx.txHash),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);

      if (!receipt) continue; // not mined yet

      if (receipt.status === 1) {
        await db.update(cryptoTransactionsTable)
          .set({ status: "confirmed", confirmations: getRequiredConfirmations(rpcNetwork) })
          .where(eq(cryptoTransactionsTable.id, tx.id));
        logger.info({ txHash: tx.txHash, userId: tx.userId, asset: tx.asset, amount: tx.amount }, "Withdrawal confirmed on-chain");
      } else if (receipt.status === 0) {
        // Transaction failed on-chain — refund balance
        await db.update(cryptoTransactionsTable)
          .set({ status: "failed" })
          .where(eq(cryptoTransactionsTable.id, tx.id));

        const [bal] = await db.select().from(balancesTable)
          .where(and(eq(balancesTable.userId, tx.userId), eq(balancesTable.asset, tx.asset)));
        if (bal) {
          const refunded = (parseFloat(bal.available) + parseFloat(tx.amount)).toFixed(8);
          await db.update(balancesTable).set({ available: refunded }).where(eq(balancesTable.id, bal.id));
        }
        logger.warn({ txHash: tx.txHash, userId: tx.userId, asset: tx.asset }, "Withdrawal failed on-chain — balance refunded");
      }
    } catch (err) {
      logger.debug({ err, txHash: tx.txHash }, "Could not check withdrawal receipt (will retry)");
    }
  }
}

/**
 * Run one scan cycle for all explorer-supported networks.
 * ETH + POLYGON via Etherscan V2 API (ETHERSCAN_API_KEY).
 * BSC via BscScan API (BSCSCAN_API_KEY) — if key is set, otherwise skipped.
 * Called every 60 seconds (explorer APIs return full history, nothing is missed between polls).
 */
export async function scanEtherscanNetworks() {
  const depositAddresses = await db.select().from(depositAddressesTable);
  if (depositAddresses.length === 0) return;

  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // Build list of networks + their fetch functions
  type NetworkScan = { network: string; fetchFn: FetchFn };
  const networksToScan: NetworkScan[] = [];

  // ETH + POLYGON via Etherscan V2
  for (const [network, chainId] of Object.entries(ETHERSCAN_CHAIN_IDS)) {
    const cid = chainId;
    networksToScan.push({
      network,
      fetchFn: (params) => etherscanFetch(cid, params),
    });
  }

  // BSC via BscScan API (only if BSCSCAN_API_KEY is set)
  if (process.env.BSCSCAN_API_KEY) {
    networksToScan.push({
      network: "BSC",
      fetchFn: (params) => bscscanFetch(params),
    });
  }

  for (const { network, fetchFn } of networksToScan) {
    for (const depAddr of depositAddresses) {
      try {
        await scanAddressOnChain(network, fetchFn, depAddr);
        // Each address makes 2 API calls (tokentx + txlist) + 500ms internal delay.
        // Free plan limit: 5 req/sec (sometimes 3/sec burst). 1500ms between addresses
        // keeps us at ~1.3 addresses/sec = ~2.7 API calls/sec — safely under limit.
        await delay(1500);
      } catch (err) {
        logger.warn({ err, network, address: depAddr.address }, "Explorer scan error");
        await delay(2000); // extra back-off on error
      }
    }
    await delay(1000); // gap between networks
  }

  // BSC via Moralis API (if MORALIS_API_KEY set and BSCSCAN_API_KEY is not)
  if (process.env.MORALIS_API_KEY && !process.env.BSCSCAN_API_KEY) {
    // Fetch current BSC block head so we can calculate confirmations
    try {
      const headRes = await fetch(
        `${MORALIS_BASE}/block/latest?chain=bsc`,
        { headers: { "X-API-Key": process.env.MORALIS_API_KEY }, signal: AbortSignal.timeout(5_000) },
      );
      if (headRes.ok) {
        const headJson = await headRes.json() as { number?: string };
        if (headJson.number) lastProcessedBlock["BSC:__head"] = parseInt(headJson.number, 10);
      }
    } catch { /* ignore */ }

    for (const depAddr of depositAddresses) {
      try {
        await scanAddressOnBscMoralis(depAddr);
        await delay(500); // Moralis free: 5 req/sec — one address = 2 calls
      } catch (err) {
        logger.warn({ err, address: depAddr.address }, "Moralis BSC scan error");
        await delay(2000);
      }
    }
  }
}

// Track interval handle
let etherscanInterval: NodeJS.Timeout | null = null;

export function startEtherscanMonitor() {
  if (etherscanInterval) return;
  if (!process.env.ETHERSCAN_API_KEY) {
    logger.warn("ETHERSCAN_API_KEY not set — Etherscan deposit monitor disabled");
    return;
  }

  const hasBscScan  = !!process.env.BSCSCAN_API_KEY;
  const hasMoralis  = !!process.env.MORALIS_API_KEY;
  const bscProvider = hasBscScan ? "BscScan" : hasMoralis ? "Moralis" : null;
  logger.info(
    { bscEnabled: !!(hasBscScan || hasMoralis) },
    `Starting explorer deposit monitor (ETH + POLYGON${bscProvider ? ` + BSC via ${bscProvider}` : " — BSC skipped (no BSCSCAN_API_KEY / MORALIS_API_KEY)"})`,
  );

  const run = async () => {
    try {
      await confirmPendingWithdrawals();
    } catch (err) {
      logger.warn({ err }, "Withdrawal confirmation check error");
    }
    try {
      await scanEtherscanNetworks();
    } catch (err) {
      logger.warn({ err }, "Explorer monitor cycle error");
    }
  };

  run();
  // Poll every 60s — explorer APIs return full history so we don't miss anything between polls
  etherscanInterval = setInterval(run, 60_000);
}

export function stopEtherscanMonitor() {
  if (etherscanInterval) {
    clearInterval(etherscanInterval);
    etherscanInterval = null;
  }
}

/** Called by admin force-rescan: clears the watermark so all history is re-scanned */
export function resetEtherscanScan(network?: string) {
  if (network) {
    // clear all keys for this network
    for (const key of Object.keys(lastProcessedBlock)) {
      if (key.startsWith(`${network}:`)) delete lastProcessedBlock[key];
    }
  } else {
    for (const key of Object.keys(lastProcessedBlock)) delete lastProcessedBlock[key];
  }
}
