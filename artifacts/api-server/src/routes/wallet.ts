import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, depositAddressesTable, cryptoTransactionsTable, balancesTable, usersTable, customTokensTable } from "@workspace/db";
import { requireAuth } from "../lib/session";
import {
  generateDepositAddress,
  isValidEVMAddress,
  getAssetConfig,
  getHDWallet,
  sendNative,
  sendERC20,
  parseAmount,
  SUPPORTED_DEPOSIT_ASSETS,
} from "../lib/blockchain";
import { logger } from "../lib/logger";

const router = Router();

// Network name mapping: API uses uppercase ("POLYGON"), DB stores lowercase ("polygon")
const NETWORK_TO_DB: Record<string, string> = {
  ETH: "eth",
  BSC: "bsc",
  POLYGON: "polygon",
};

// Helper: get all supported assets for a network (built-in + custom tokens)
async function getSupportedAssets(network: string): Promise<string[]> {
  const builtin = SUPPORTED_DEPOSIT_ASSETS[network] ?? [];
  const dbNetwork = NETWORK_TO_DB[network] ?? network.toLowerCase();
  const custom = await db
    .select({ symbol: customTokensTable.symbol })
    .from(customTokensTable)
    .where(and(eq(customTokensTable.network, dbNetwork), eq(customTokensTable.status, "active")));
  const customSymbols = custom.map(t => t.symbol).filter(s => !builtin.includes(s));
  return [...builtin, ...customSymbols];
}

// Helper: resolve asset config — checks built-in first, then custom_tokens table
async function resolveAssetConfig(
  asset: string,
  network: string,
): Promise<{ isNative: boolean; contractAddress?: string; decimals: number }> {
  // Try built-in first
  try {
    return getAssetConfig(asset, network);
  } catch {
    // Fall back to custom_tokens
    const [token] = await db
      .select()
      .from(customTokensTable)
      .where(and(eq(customTokensTable.symbol, asset), eq(customTokensTable.status, "active")));
    if (!token) throw new Error(`Asset ${asset} is not supported on network ${network}`);
    if (!token.contractAddress) throw new Error(`No contract address found for ${asset}`);
    return { isNative: false, contractAddress: token.contractAddress, decimals: token.decimals };
  }
}

// GET /api/wallet/deposit-address/:network
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

  const assets = await getSupportedAssets(network);

  // EVM address is the same across ETH/BSC/Polygon
  const [existing] = await db
    .select()
    .from(depositAddressesTable)
    .where(eq(depositAddressesTable.userId, userId));

  if (existing) {
    res.json({ address: existing.address, network, assets });
    return;
  }

  const address = generateDepositAddress(userId);
  const [created] = await db
    .insert(depositAddressesTable)
    .values({ userId, address, derivationIndex: userId })
    .returning();

  res.json({ address: created!.address, network, assets });
});

// GET /api/wallet/transactions
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
router.post("/wallet/withdraw", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user?.status === "frozen") {
    res.status(403).json({ error: "account_frozen", message: "Your account is suspended and cannot process withdrawals." });
    return;
  }

  const { asset, network, amount, toAddress } = req.body as {
    asset: string; network: string; amount: string; toAddress: string;
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

  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (!bal || parseFloat(bal.available) < amt) {
    res.status(400).json({ error: "insufficient_funds", message: "Insufficient balance" });
    return;
  }

  // Resolve config — supports both built-in and custom tokens
  let config: { isNative: boolean; contractAddress?: string; decimals: number };
  try {
    config = await resolveAssetConfig(asset, network);
  } catch (err) {
    res.status(400).json({ error: "unsupported_asset", message: (err as Error).message });
    return;
  }

  // Determine sender wallet:
  // 1. Use user's HD deposit wallet — their funds live there after deposit
  // 2. Fall back to hot wallet only if WALLET_MNEMONIC is not set
  const senderWallet = process.env.WALLET_MNEMONIC
    ? getHDWallet(userId)
    : null;

  if (!senderWallet && !process.env.HOT_WALLET_PRIVATE_KEY) {
    res.status(503).json({ error: "wallet_not_configured", message: "Wallet not configured. Contact support." });
    return;
  }

  // Deduct balance optimistically
  const newAvail = (parseFloat(bal.available) - amt).toFixed(8);
  await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, bal.id));

  const [txRecord] = await db.insert(cryptoTransactionsTable).values({
    userId,
    type: "withdrawal",
    asset,
    network,
    amount: amt.toFixed(8),
    status: "pending",
    toAddress,
  }).returning();

  try {
    const amountBig = parseAmount(amt.toFixed(8), config.decimals);
    let txHash: string;

    if (config.isNative) {
      txHash = await sendNative(toAddress, network, amountBig, senderWallet ?? undefined);
    } else {
      txHash = await sendERC20(toAddress, network, config.contractAddress!, amountBig, senderWallet ?? undefined);
    }

    await db.update(cryptoTransactionsTable)
      .set({ txHash, status: "pending" })
      .where(eq(cryptoTransactionsTable.id, txRecord!.id));

    logger.info({ userId, asset, network, amount, txHash, toAddress, fromWallet: senderWallet?.address }, "Withdrawal initiated");
    res.json({ success: true, txHash, message: "Withdrawal submitted to blockchain" });
  } catch (err) {
    await db.update(balancesTable).set({ available: bal.available }).where(eq(balancesTable.id, bal.id));
    await db.update(cryptoTransactionsTable)
      .set({ status: "failed" })
      .where(eq(cryptoTransactionsTable.id, txRecord!.id));
    logger.error({ err, userId, asset, network, amount, toAddress }, "Withdrawal failed");
    res.status(500).json({ error: "withdrawal_failed", message: "Failed to send transaction. Please try again." });
  }
});

// GET /api/wallet/supported-assets
// Returns all supported deposit/withdraw assets per network (including custom tokens)
router.get("/wallet/supported-assets", async (_req, res): Promise<void> => {
  const networks = ["ETH", "BSC", "POLYGON"];
  const result: Record<string, string[]> = {};
  for (const network of networks) {
    result[network] = await getSupportedAssets(network);
  }
  res.json(result);
});

export default router;
