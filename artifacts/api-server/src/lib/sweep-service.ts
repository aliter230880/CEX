import { ethers } from "ethers";
import { eq } from "drizzle-orm";
import { db, customTokensTable, depositAddressesTable } from "@workspace/db";
import { logger } from "./logger";
import {
  getProvider,
  getHDWallet,
  getHotWallet,
  getAssetConfig,
  getERC20Balance,
  SUPPORTED_DEPOSIT_ASSETS,
} from "./blockchain";

// Minimum native balance to leave on deposit address (to avoid stranded dust)
const NATIVE_KEEP: Record<string, bigint> = {
  ETH:     ethers.parseEther("0.002"),
  BSC:     ethers.parseEther("0.001"),
  POLYGON: ethers.parseEther("0.002"),
};

// Amount of native coin to top up deposit address with so it can pay ERC20 gas
const GAS_TOP_UP: Record<string, bigint> = {
  ETH:     ethers.parseEther("0.005"),
  BSC:     ethers.parseEther("0.001"),
  POLYGON: ethers.parseEther("0.01"),
};

// How long to wait after sending gas before attempting ERC20 transfer
const GAS_WAIT_MS: Record<string, number> = {
  ETH:     90_000,
  BSC:     30_000,
  POLYGON: 20_000,
};

// Scheduled sweep interval (30 seconds)
const SWEEP_INTERVAL_MS = 30_000;

// Minimum ERC-20 token amount worth sweeping (avoid dust)
const ERC20_DUST_THRESHOLD = 0.0001;

// Track addresses currently being swept to avoid concurrent sweeps
const sweepInProgress = new Set<string>();

// ─────────────────────────────────────────────────────────────────────────────

async function resolveAssetConfig(
  asset: string,
  network: string,
): Promise<{ isNative: boolean; contractAddress?: string; decimals: number } | null> {
  try {
    return getAssetConfig(asset, network);
  } catch {
    const rows = await db.select().from(customTokensTable);
    const row = rows.find(
      (r) => r.symbol === asset && r.network.toUpperCase() === network.toUpperCase(),
    );
    if (!row || !row.contractAddress) return null;
    return { isNative: false, contractAddress: row.contractAddress, decimals: row.decimals ?? 18 };
  }
}

/**
 * Sweep all tokens of `asset` from the user's deposit address to the hot wallet.
 * Called after every confirmed deposit AND by the scheduled sweep.
 * Never throws — logs and returns on any error.
 */
export async function sweepDepositAddress(
  userId: number,
  asset: string,
  network: string,
  depositAddress: string,
): Promise<void> {
  const lockKey = `${network}:${depositAddress.toLowerCase()}:${asset}`;
  if (sweepInProgress.has(lockKey)) return; // already sweeping this asset
  sweepInProgress.add(lockKey);

  try {
    const cfg = await resolveAssetConfig(asset, network);
    if (!cfg) {
      logger.warn({ userId, asset, network }, "Sweep: unknown asset, skipping");
      return;
    }

    const provider = getProvider(network);
    const hotWallet = getHotWallet();
    const hotAddress = hotWallet.address;
    const depositWallet = getHDWallet(userId).connect(provider);

    if (cfg.isNative) {
      // ── Native coin sweep ──────────────────────────────────────────────────
      const balance = await provider.getBalance(depositAddress);
      const keep = NATIVE_KEEP[network] ?? ethers.parseEther("0.002");
      const sweepAmount = balance > keep ? balance - keep : 0n;

      if (sweepAmount === 0n) return;

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("30", "gwei");
      const gasCost = gasPrice * 21000n;
      const finalAmount = sweepAmount > gasCost ? sweepAmount - gasCost : 0n;
      if (finalAmount === 0n) return;

      const tx = await depositWallet.sendTransaction({
        to: hotAddress,
        value: finalAmount,
        gasLimit: 21000n,
        gasPrice,
      });
      logger.info({ userId, asset, network, txHash: tx.hash, amount: ethers.formatEther(finalAmount) }, "Sweep: native sent to hot wallet");

    } else {
      // ── ERC-20 sweep ───────────────────────────────────────────────────────
      const contractAddress = cfg.contractAddress!;
      const { balance: tokenBalance, decimals } = await getERC20Balance(depositAddress, network, contractAddress);

      if (tokenBalance === 0n) return;
      if (parseFloat(ethers.formatUnits(tokenBalance, decimals)) < ERC20_DUST_THRESHOLD) return;

      // Ensure deposit address has enough native coin for gas
      const nativeBalance = await provider.getBalance(depositAddress);
      const topUpAmount = GAS_TOP_UP[network] ?? ethers.parseEther("0.01");

      if (nativeBalance < topUpAmount / 2n) {
        const sendAmount = topUpAmount - nativeBalance;
        logger.info({ userId, asset, network, depositAddress, sendAmount: ethers.formatEther(sendAmount) }, "Sweep: topping up deposit address with gas");
        const connectedHot = hotWallet.connect(provider);
        const gasTx = await connectedHot.sendTransaction({ to: depositAddress, value: sendAmount });
        logger.info({ userId, gasTxHash: gasTx.hash }, "Sweep: gas top-up sent, waiting...");
        await new Promise<void>((r) => setTimeout(r, GAS_WAIT_MS[network] ?? 30_000));
      }

      const contract = new ethers.Contract(
        contractAddress,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        depositWallet,
      );
      const tx = await (
        contract.transfer as (to: string, amount: bigint) => Promise<ethers.TransactionResponse>
      )(hotAddress, tokenBalance);

      logger.info(
        { userId, asset, network, txHash: tx.hash, amount: ethers.formatUnits(tokenBalance, decimals) },
        "Sweep: ERC20 sent to hot wallet",
      );
    }
  } catch (err) {
    logger.warn({ err, userId, asset, network, depositAddress }, "Sweep: failed (non-fatal)");
  } finally {
    sweepInProgress.delete(lockKey);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled sweep — runs every 30s, checks all deposit addresses on all networks
// ─────────────────────────────────────────────────────────────────────────────

async function runScheduledSweep(): Promise<void> {
  try {
    const depositAddresses = await db.select().from(depositAddressesTable);
    if (depositAddresses.length === 0) return;

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // Load custom tokens once per cycle
    const customTokens = await db.select().from(customTokensTable);

    const networks = Object.keys(SUPPORTED_DEPOSIT_ASSETS);

    for (const depAddr of depositAddresses) {
      for (const network of networks) {
        try {
          const provider = getProvider(network);

          // 1. Native coin check
          const nativeBalance = await provider.getBalance(depAddr.address);
          const keep = NATIVE_KEEP[network] ?? ethers.parseEther("0.002");
          if (nativeBalance > keep) {
            void sweepDepositAddress(depAddr.userId, nativeAssetForNetwork(network), network, depAddr.address);
          }

          await delay(300);

          // 2. Standard ERC-20 tokens (USDT, USDC, etc.)
          const standardAssets = (SUPPORTED_DEPOSIT_ASSETS[network] ?? []).filter(
            (a) => a !== nativeAssetForNetwork(network),
          );
          for (const asset of standardAssets) {
            try {
              const cfg = getAssetConfig(asset, network);
              if (!cfg.contractAddress) continue;
              const { balance } = await getERC20Balance(depAddr.address, network, cfg.contractAddress);
              if (balance > 0n && parseFloat(ethers.formatUnits(balance, cfg.decimals)) >= ERC20_DUST_THRESHOLD) {
                void sweepDepositAddress(depAddr.userId, asset, network, depAddr.address);
              }
              await delay(200);
            } catch { /* unsupported asset/network combo — skip */ }
          }

          // 3. Custom tokens (LUX, etc.)
          const netCustomTokens = customTokens.filter(
            (t) => t.network.toUpperCase() === network.toUpperCase() && t.contractAddress,
          );
          for (const token of netCustomTokens) {
            try {
              const { balance } = await getERC20Balance(depAddr.address, network, token.contractAddress!);
              if (balance > 0n && parseFloat(ethers.formatUnits(balance, token.decimals ?? 18)) >= ERC20_DUST_THRESHOLD) {
                void sweepDepositAddress(depAddr.userId, token.symbol, network, depAddr.address);
              }
              await delay(200);
            } catch { /* skip */ }
          }

        } catch (err) {
          logger.warn({ err, address: depAddr.address, network }, "Scheduled sweep: network scan error");
        }

        await delay(500); // between networks per address
      }

      await delay(1000); // between addresses
    }
  } catch (err) {
    logger.warn({ err }, "Scheduled sweep cycle error");
  }
}

function nativeAssetForNetwork(network: string): string {
  const map: Record<string, string> = { ETH: "ETH", BSC: "BNB", POLYGON: "POL" };
  return map[network] ?? network;
}

let sweepInterval: NodeJS.Timeout | null = null;

export function startScheduledSweep(): void {
  if (sweepInterval) return;
  logger.info({ intervalMs: SWEEP_INTERVAL_MS }, "Scheduled sweep started");

  // First run after 10s (let server fully start up)
  setTimeout(() => {
    void runScheduledSweep();
    sweepInterval = setInterval(() => void runScheduledSweep(), SWEEP_INTERVAL_MS);
  }, 10_000);
}

export function stopScheduledSweep(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
