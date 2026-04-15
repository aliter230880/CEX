import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, depositAddressesTable, cryptoTransactionsTable, balancesTable } from "@workspace/db";
import { requireAuth } from "../lib/session";
import {
  generateDepositAddress,
  isValidEVMAddress,
  getAssetConfig,
  sendNative,
  sendERC20,
  parseAmount,
  formatAmount,
  SUPPORTED_DEPOSIT_ASSETS,
  getProvider,
} from "../lib/blockchain";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/wallet/deposit-address/:network
// Returns (or creates) the user's deposit address for a given EVM network
router.get("/wallet/deposit-address/:network", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const { network } = req.params as { network: string };
  const supported = ["ETH", "BSC", "POLYGON"];
  if (!supported.includes(network)) {
    res.status(400).json({ error: "unsupported_network", message: `Network must be one of: ${supported.join(", ")}` });
    return;
  }

  if (!process.env.WALLET_MNEMONIC) {
    res.status(503).json({ error: "wallet_not_configured", message: "Exchange wallet not configured" });
    return;
  }

  // EVM address is the same across ETH/BSC/Polygon, so one address per user
  const [existing] = await db
    .select()
    .from(depositAddressesTable)
    .where(eq(depositAddressesTable.userId, userId));

  if (existing) {
    res.json({ address: existing.address, network, assets: SUPPORTED_DEPOSIT_ASSETS[network] ?? [] });
    return;
  }

  // Generate new address
  const address = generateDepositAddress(userId);
  const [created] = await db
    .insert(depositAddressesTable)
    .values({ userId, address, derivationIndex: userId })
    .returning();

  res.json({ address: created!.address, network, assets: SUPPORTED_DEPOSIT_ASSETS[network] ?? [] });
});

// GET /api/wallet/transactions
// Returns the user's crypto transaction history
router.get("/wallet/transactions", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const transactions = await db
    .select()
    .from(cryptoTransactionsTable)
    .where(eq(cryptoTransactionsTable.userId, userId))
    .orderBy(desc(cryptoTransactionsTable.createdAt))
    .limit(50);

  res.json(
    transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      asset: tx.asset,
      network: tx.network,
      amount: tx.amount,
      txHash: tx.txHash,
      status: tx.status,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      confirmations: tx.confirmations,
      createdAt: tx.createdAt,
    })),
  );
});

// POST /api/wallet/withdraw
// Initiates a real on-chain withdrawal
router.post("/wallet/withdraw", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const { asset, network, amount, toAddress } = req.body as {
    asset: string;
    network: string;
    amount: string;
    toAddress: string;
  };

  if (!asset || !network || !amount || !toAddress) {
    res.status(400).json({ error: "validation_error", message: "asset, network, amount, toAddress are required" });
    return;
  }

  if (!isValidEVMAddress(toAddress)) {
    res.status(400).json({ error: "invalid_address", message: "Invalid EVM address" });
    return;
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    res.status(400).json({ error: "invalid_amount", message: "Amount must be positive" });
    return;
  }

  // Check user balance
  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (!bal || parseFloat(bal.available) < amt) {
    res.status(400).json({ error: "insufficient_funds", message: "Insufficient balance" });
    return;
  }

  // Validate asset/network combo
  let config: ReturnType<typeof getAssetConfig>;
  try {
    config = getAssetConfig(asset, network);
  } catch (err) {
    res.status(400).json({ error: "unsupported_asset", message: (err as Error).message });
    return;
  }

  if (!process.env.HOT_WALLET_PRIVATE_KEY) {
    res.status(503).json({ error: "wallet_not_configured", message: "Hot wallet not configured. Contact support." });
    return;
  }

  // Deduct balance first (optimistic)
  const newAvail = (parseFloat(bal.available) - amt).toFixed(8);
  await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, bal.id));

  // Create pending transaction record
  const [txRecord] = await db.insert(cryptoTransactionsTable).values({
    userId,
    type: "withdrawal",
    asset,
    network,
    amount: amt.toFixed(8),
    status: "pending",
    toAddress,
  }).returning();

  // Send on-chain transaction
  try {
    const amountBig = parseAmount(amt.toFixed(8), config.decimals);
    let txHash: string;

    if (config.isNative) {
      txHash = await sendNative(toAddress, network, amountBig);
    } else {
      txHash = await sendERC20(toAddress, network, config.contractAddress!, amountBig);
    }

    await db.update(cryptoTransactionsTable)
      .set({ txHash, status: "pending" })
      .where(eq(cryptoTransactionsTable.id, txRecord!.id));

    logger.info({ userId, asset, network, amount, txHash, toAddress }, "Withdrawal initiated");
    res.json({ success: true, txHash, message: "Withdrawal submitted to blockchain" });
  } catch (err) {
    // Refund balance on failure
    await db.update(balancesTable).set({ available: bal.available }).where(eq(balancesTable.id, bal.id));
    await db.update(cryptoTransactionsTable)
      .set({ status: "failed" })
      .where(eq(cryptoTransactionsTable.id, txRecord!.id));

    logger.error({ err, userId, asset, network, amount, toAddress }, "Withdrawal failed");
    res.status(500).json({ error: "withdrawal_failed", message: "Failed to send transaction. Please try again." });
  }
});

// GET /api/wallet/supported-assets
router.get("/wallet/supported-assets", (_req, res) => {
  res.json(SUPPORTED_DEPOSIT_ASSETS);
});

export default router;
