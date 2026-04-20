import { ethers } from "ethers";
import { eq } from "drizzle-orm";
import { db, customTokensTable } from "@workspace/db";
import { logger } from "./logger";
import {
  getProvider,
  getHDWallet,
  getHotWallet,
  getAssetConfig,
  getERC20Balance,
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
  ETH:     90_000,  // ~7 blocks
  BSC:     30_000,  // ~10 blocks
  POLYGON: 20_000,  // ~10 blocks
};

async function resolveAssetConfig(
  asset: string,
  network: string,
): Promise<{ isNative: boolean; contractAddress?: string; decimals: number } | null> {
  try {
    return getAssetConfig(asset, network);
  } catch {
    // Fall back to custom_tokens table (e.g. LUX)
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
 * Called automatically after every confirmed deposit — runs in background, never throws.
 */
export async function sweepDepositAddress(
  userId: number,
  asset: string,
  network: string,
  depositAddress: string,
): Promise<void> {
  try {
    const cfg = await resolveAssetConfig(asset, network);
    if (!cfg) {
      logger.warn({ userId, asset, network }, "Sweep: unknown asset, skipping");
      return;
    }

    const provider = getProvider(network);
    const hotWallet = getHotWallet();
    const hotAddress = hotWallet.address;

    // Derive the deposit wallet (HD child wallet for this user)
    const depositWallet = getHDWallet(userId).connect(provider);

    if (cfg.isNative) {
      // ── Native coin sweep ────────────────────────────────────────────────
      const balance = await provider.getBalance(depositAddress);
      const keep = NATIVE_KEEP[network] ?? ethers.parseEther("0.002");
      const sweepAmount = balance > keep ? balance - keep : 0n;

      if (sweepAmount === 0n) {
        logger.info({ userId, asset, network, balance: ethers.formatEther(balance) }, "Sweep: native balance too low, skipping");
        return;
      }

      const tx = await depositWallet.sendTransaction({ to: hotAddress, value: sweepAmount });
      logger.info(
        { userId, asset, network, txHash: tx.hash, amount: ethers.formatEther(sweepAmount) },
        "Sweep: native coins sent to hot wallet",
      );

    } else {
      // ── ERC-20 sweep ─────────────────────────────────────────────────────
      const contractAddress = cfg.contractAddress!;
      const { balance: tokenBalance, decimals } = await getERC20Balance(depositAddress, network, contractAddress);

      if (tokenBalance === 0n) {
        logger.info({ userId, asset, network }, "Sweep: ERC20 balance is zero, skipping");
        return;
      }

      // Ensure deposit address has enough native coin for gas
      const nativeBalance = await provider.getBalance(depositAddress);
      const topUpAmount = GAS_TOP_UP[network] ?? ethers.parseEther("0.01");

      if (nativeBalance < topUpAmount / 2n) {
        // Hot wallet refuels the deposit address
        const sendAmount = topUpAmount - nativeBalance;
        logger.info(
          { userId, asset, network, depositAddress, sendAmount: ethers.formatEther(sendAmount) },
          "Sweep: topping up deposit address with gas",
        );
        const connectedHot = hotWallet.connect(provider);
        const gasTx = await connectedHot.sendTransaction({ to: depositAddress, value: sendAmount });
        logger.info({ userId, gasTxHash: gasTx.hash }, "Sweep: gas top-up sent, waiting for confirmation");

        // Wait for gas tx to be mined before sending tokens
        const waitMs = GAS_WAIT_MS[network] ?? 30_000;
        await new Promise<void>((r) => setTimeout(r, waitMs));
      }

      // Transfer ERC-20 tokens to hot wallet
      const contract = new ethers.Contract(
        contractAddress,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        depositWallet,
      );
      const tx = await (
        contract.transfer as (to: string, amount: bigint) => Promise<ethers.TransactionResponse>
      )(hotAddress, tokenBalance);

      logger.info(
        {
          userId, asset, network,
          txHash: tx.hash,
          amount: ethers.formatUnits(tokenBalance, decimals),
          hotAddress,
        },
        "Sweep: ERC20 tokens sent to hot wallet",
      );
    }
  } catch (err) {
    // Never crash the deposit flow — log and continue
    logger.warn({ err, userId, asset, network, depositAddress }, "Sweep: failed (non-fatal, deposit already credited)");
  }
}
