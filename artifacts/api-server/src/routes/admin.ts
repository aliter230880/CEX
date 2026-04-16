import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { ethers } from "ethers";
import {
  db,
  usersTable,
  balancesTable,
  ordersTable,
  tradesTable,
  cryptoTransactionsTable,
  depositAddressesTable,
  adminAuditLogTable,
  tradingPairsTable,
  feeConfigTable,
  referralConfigTable,
  customTokensTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/session";
import {
  getHDWallet,
  getAssetConfig,
  sendNative,
  sendERC20,
  parseAmount,
  getNativeBalance,
  getERC20Balance,
  getProvider,
  SUPPORTED_DEPOSIT_ASSETS,
} from "../lib/blockchain";
import { logger } from "../lib/logger";
import { generateKlines } from "../lib/market-data";
import { resetScanBlock, resetAllScanBlocks } from "../lib/deposit-monitor";

const router = Router();

// ── Middlewares ────────────────────────────────────────────────────────────
function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: "forbidden", message: "Admin access required" });
    return;
  }
  next();
}

// ── Audit log helper ───────────────────────────────────────────────────────
// adminId is a stable identifier for the admin performing the action.
// In a single-admin setup we use "admin"; extend this if multi-admin auth is added.
async function audit(
  action: string,
  targetUserId: number | null,
  details: unknown,
  reason?: string,
  adminId = "admin",
) {
  await db.insert(adminAuditLogTable).values({
    adminId,
    action,
    targetUserId,
    details: details as Record<string, unknown>,
    reason: reason ?? null,
  });
}

// ── Admin password check helper ────────────────────────────────────────────
// ADMIN_PASSWORD can be either a bcrypt hash ($2a$/$2b$) or a plain-text password.
// ADMIN_PASSWORD_HASH is a legacy alias (always treated as bcrypt).
async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? process.env.ADMIN_PASSWORD;
  if (!stored) return false;
  // If it looks like a bcrypt hash, use bcrypt comparison
  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compare(password, stored);
  }
  // Otherwise treat as plain-text (direct comparison)
  return password === stored;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/login
// ────────────────────────────────────────────────────────────────────────────
router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: "validation_error", message: "Password required" });
    return;
  }

  if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD) {
    res.status(503).json({ error: "not_configured", message: "Admin password not configured. Set ADMIN_PASSWORD to a bcrypt hash." });
    return;
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid password" });
    return;
  }

  req.session.isAdmin = true;
  res.json({ success: true, message: "Admin logged in" });
});

// POST /api/admin/logout
router.post("/admin/logout", (req: Request, res: Response): void => {
  req.session.isAdmin = false;
  res.json({ message: "Logged out" });
});

// GET /api/admin/me
router.get("/admin/me", (req: Request, res: Response): void => {
  if (!requireAdmin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json({ isAdmin: true });
});

// ────────────────────────────────────────────────────────────────────────────
// All routes below require admin
// ────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats — dashboard summary
router.get("/admin/stats", adminGuard, async (_req: Request, res: Response): Promise<void> => {
  const [users, balances, txs] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(balancesTable),
    db.select().from(cryptoTransactionsTable).orderBy(desc(cryptoTransactionsTable.createdAt)).limit(10),
  ]);

  const totalUsers = users.length;
  const frozenUsers = users.filter((u) => u.status === "frozen").length;

  const balanceByAsset: Record<string, number> = {};
  for (const b of balances) {
    balanceByAsset[b.asset] = (balanceByAsset[b.asset] ?? 0) + parseFloat(b.available) + parseFloat(b.locked);
  }

  res.json({
    totalUsers,
    frozenUsers,
    activeUsers: totalUsers - frozenUsers,
    balanceByAsset,
    recentTransactions: txs,
  });
});

// GET /api/admin/users — server-side search + paginated user list
router.get("/admin/users", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = ((req.query["search"] as string) ?? "").trim();

  // Build WHERE clause at SQL level so search + pagination work together correctly
  const whereClause = search
    ? or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.username, `%${search}%`))
    : undefined;

  // Get total count for pagination metadata
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(whereClause);

  const users = whereClause
    ? await db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset)
    : await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

  const userIds = users.map((u) => u.id);
  let balancesByUser: Record<number, { asset: string; available: string; locked: string }[]> = {};

  if (userIds.length > 0) {
    const allBalances = await db.select().from(balancesTable).where(inArray(balancesTable.userId, userIds));
    for (const b of allBalances) {
      if (!balancesByUser[b.userId]) balancesByUser[b.userId] = [];
      balancesByUser[b.userId].push({ asset: b.asset, available: b.available, locked: b.locked });
    }
  }

  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      status: u.status,
      createdAt: u.createdAt,
      balances: balancesByUser[u.id] ?? [],
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/admin/users/:id — full user detail
router.get("/admin/users/:id", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "not_found" }); return; }

  const [balances, orders, trades, txs, depositAddr] = await Promise.all([
    db.select().from(balancesTable).where(eq(balancesTable.userId, userId)),
    db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt)).limit(50),
    db.select().from(tradesTable).where(eq(tradesTable.userId, userId)).orderBy(desc(tradesTable.createdAt)).limit(50),
    db.select().from(cryptoTransactionsTable).where(eq(cryptoTransactionsTable.userId, userId)).orderBy(desc(cryptoTransactionsTable.createdAt)).limit(50),
    db.select().from(depositAddressesTable).where(eq(depositAddressesTable.userId, userId)),
  ]);

  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    status: user.status,
    createdAt: user.createdAt,
    depositAddress: depositAddr[0]?.address ?? null,
    balances: balances.map((b) => ({ asset: b.asset, available: b.available, locked: b.locked, network: b.network })),
    orders: orders.map((o) => ({ id: o.id, pair: o.pair, side: o.side, type: o.type, status: o.status, price: o.price, quantity: o.quantity, createdAt: o.createdAt })),
    trades: trades.map((t) => ({ id: t.id, pair: t.pair, side: t.side, price: t.price, quantity: t.quantity, total: t.total, fee: t.fee, feeAsset: t.feeAsset, createdAt: t.createdAt })),
    transactions: txs.map((t) => ({ id: t.id, type: t.type, asset: t.asset, network: t.network, amount: t.amount, txHash: t.txHash, status: t.status, createdAt: t.createdAt })),
  });
});

// POST /api/admin/users/:id/freeze
router.post("/admin/users/:id/freeze", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    res.status(400).json({ error: "validation_error", message: "reason is required for compliance audit trail" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "not_found" }); return; }

  // Freeze the account
  await db.update(usersTable).set({ status: "frozen" }).where(eq(usersTable.id, userId));

  // Auto-cancel all open/partial orders and refund locked balances
  const openOrders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.userId, userId), or(eq(ordersTable.status, "open"), eq(ordersTable.status, "partial"))));

  let cancelledCount = 0;
  for (const order of openOrders) {
    const [baseAsset, quoteAsset] = order.pair.split("/");
    if (!baseAsset || !quoteAsset) continue;

    const remaining = parseFloat(order.quantity) - parseFloat(order.filled);
    const execPrice = parseFloat(order.price ?? "0");
    const unlockAsset = order.side === "buy" ? quoteAsset : baseAsset;
    const unlockAmount = order.side === "buy" ? remaining * execPrice : remaining;

    // Refund locked funds
    const [bal] = await db
      .select()
      .from(balancesTable)
      .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, unlockAsset)));

    if (bal && unlockAmount > 0) {
      await db.update(balancesTable).set({
        available: (parseFloat(bal.available) + unlockAmount).toFixed(8),
        locked: Math.max(0, parseFloat(bal.locked) - unlockAmount).toFixed(8),
      }).where(eq(balancesTable.id, bal.id));
    }

    await db.update(ordersTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
    cancelledCount++;
  }

  await audit("freeze", userId, { previousStatus: user.status, cancelledOrders: cancelledCount }, reason);

  logger.info({ userId, reason, cancelledOrders: cancelledCount }, "Account frozen by admin");
  res.json({ success: true, message: `Account ${user.username} frozen. ${cancelledCount} open order(s) cancelled.` });
});

// POST /api/admin/users/:id/unfreeze
router.post("/admin/users/:id/unfreeze", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    res.status(400).json({ error: "validation_error", message: "reason is required for compliance audit trail" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "not_found" }); return; }

  await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, userId));
  await audit("unfreeze", userId, { previousStatus: user.status }, reason);

  logger.info({ userId, reason }, "Account unfrozen by admin");
  res.json({ success: true, message: `Account ${user.username} unfrozen` });
});

// POST /api/admin/users/:id/balance-adjustment
router.post("/admin/users/:id/balance-adjustment", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const { asset, amount, reason } = req.body as { asset?: string; amount?: string; reason?: string };

  if (!asset || amount === undefined || !reason) {
    res.status(400).json({ error: "validation_error", message: "asset, amount, reason required" });
    return;
  }

  // Verify user exists before any balance operations
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!targetUser) {
    res.status(404).json({ error: "not_found", message: `User ${userId} does not exist` });
    return;
  }

  const adj = parseFloat(amount);
  if (isNaN(adj)) {
    res.status(400).json({ error: "invalid_amount", message: "Amount must be a number (positive=credit, negative=debit)" });
    return;
  }

  const assetBals = await db.select().from(balancesTable).where(eq(balancesTable.userId, userId));
  const assetBal = assetBals.find((b) => b.asset === asset);

  if (assetBal) {
    const currentAvail = parseFloat(assetBal.available);
    // For debits: reject if the requested amount exceeds available balance
    if (adj < 0 && Math.abs(adj) > currentAvail) {
      res.status(400).json({
        error: "insufficient_funds",
        message: `Cannot debit ${Math.abs(adj)} ${asset}: only ${currentAvail.toFixed(8)} available`,
      });
      return;
    }
    const newAvail = (currentAvail + adj).toFixed(8);
    await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, assetBal.id));
  } else if (adj > 0) {
    await db.insert(balancesTable).values({ userId, asset, available: adj.toFixed(8), locked: "0", network: "ETH" });
  } else {
    res.status(400).json({ error: "no_balance", message: "No existing balance to debit" });
    return;
  }

  await audit("balance_adjustment", userId, { asset, amount: adj, reason });
  logger.info({ userId, asset, amount: adj, reason }, "Admin balance adjustment");
  res.json({ success: true, message: `Balance adjusted: ${adj > 0 ? "+" : ""}${adj} ${asset}` });
});

// POST /api/admin/users/:id/escrow-key — derive deposit private key (requires re-auth)
router.post("/admin/users/:id/escrow-key", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const { adminPassword, reason } = req.body as { adminPassword?: string; reason?: string };

  if (!adminPassword) {
    res.status(400).json({ error: "validation_error", message: "Admin password required for escrow key access" });
    return;
  }

  if (!reason?.trim()) {
    res.status(400).json({ error: "validation_error", message: "reason is required for compliance audit trail" });
    return;
  }

  const valid = await verifyAdminPassword(adminPassword);
  if (!valid) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid admin password" });
    return;
  }

  if (!process.env.WALLET_MNEMONIC) {
    res.status(503).json({ error: "not_configured", message: "WALLET_MNEMONIC not set" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "not_found" }); return; }

  const wallet = getHDWallet(userId);
  await audit("escrow_key_reveal", userId, { address: wallet.address }, reason);

  logger.warn({ userId, address: wallet.address }, "Escrow key revealed by admin");
  res.json({
    address: wallet.address,
    privateKey: wallet.privateKey,
    warning: "Store this key securely. This action has been logged.",
  });
});

// POST /api/admin/users/:id/sweep — move funds from deposit address to hot wallet
router.post("/admin/users/:id/sweep", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt((req.params.id as string) ?? "0");
  const { network, reason } = req.body as { network?: string; reason?: string };

  if (!network) {
    res.status(400).json({ error: "validation_error", message: "network required (ETH | BSC | POLYGON)" });
    return;
  }

  if (!reason?.trim()) {
    res.status(400).json({ error: "validation_error", message: "reason is required for compliance audit trail" });
    return;
  }

  if (!process.env.WALLET_MNEMONIC || !process.env.HOT_WALLET_PRIVATE_KEY) {
    res.status(503).json({ error: "not_configured", message: "Wallet keys not configured" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "not_found" }); return; }

  const depositWallet = getHDWallet(userId);
  const depositAddr = depositWallet.address;
  const provider = getProvider(network);

  const rawPk = process.env.HOT_WALLET_PRIVATE_KEY!;
  const pk = rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`;
  const hotAddr = new ethers.Wallet(pk).address;

  const results: { asset: string; txHash?: string; amount?: string; error?: string }[] = [];
  const assets = SUPPORTED_DEPOSIT_ASSETS[network] ?? [];

  for (const asset of assets) {
    try {
      const cfg = getAssetConfig(asset, network);
      const sweepWallet = depositWallet.connect(provider);

      if (cfg.isNative) {
        const balance = await getNativeBalance(depositAddr, network);
        const gasReserve = ethers.parseEther("0.002");
        const sweepAmount = balance > gasReserve ? balance - gasReserve : 0n;
        if (sweepAmount <= 0n) continue;

        const tx = await sweepWallet.sendTransaction({ to: hotAddr, value: sweepAmount });
        results.push({ asset, txHash: tx.hash, amount: ethers.formatEther(sweepAmount) });
      } else if (cfg.contractAddress) {
        const { balance, decimals } = await getERC20Balance(depositAddr, network, cfg.contractAddress);
        if (balance === 0n) continue;

        const contract = new ethers.Contract(
          cfg.contractAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          sweepWallet,
        );
        const tx = await (contract["transfer"] as (to: string, amt: bigint) => Promise<ethers.TransactionResponse>)(hotAddr, balance);
        results.push({ asset, txHash: tx.hash, amount: ethers.formatUnits(balance, decimals) });
      }
    } catch (err) {
      results.push({ asset, error: (err as Error).message });
    }
  }

  await audit("sweep", userId, { network, depositAddr, hotAddr, results }, reason);
  logger.info({ userId, network, results }, "Admin sweep executed");
  res.json({ success: true, depositAddress: depositAddr, hotWallet: hotAddr, results });
});

// GET /api/admin/audit-log
router.get("/admin/audit-log", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(adminAuditLogTable);

  const logs = await db
    .select()
    .from(adminAuditLogTable)
    .orderBy(desc(adminAuditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRADING PAIRS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/trading-pairs
router.get("/admin/trading-pairs", adminGuard, async (_req: Request, res: Response): Promise<void> => {
  const pairs = await db.select().from(tradingPairsTable).orderBy(tradingPairsTable.symbol);
  res.json({ pairs });
});

// POST /api/admin/trading-pairs
router.post("/admin/trading-pairs", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const { symbol, baseAsset, quoteAsset, network, minOrderSize, tickSize, stepSize } = req.body as {
    symbol: string; baseAsset: string; quoteAsset: string; network: string;
    minOrderSize?: string; tickSize?: string; stepSize?: string;
  };
  if (!symbol || !baseAsset || !quoteAsset || !network) {
    res.status(400).json({ error: "validation_error", message: "symbol, baseAsset, quoteAsset, network required" });
    return;
  }
  const [pair] = await db.insert(tradingPairsTable).values({
    symbol: symbol.toUpperCase(),
    baseAsset: baseAsset.toUpperCase(),
    quoteAsset: quoteAsset.toUpperCase(),
    network,
    minOrderSize: minOrderSize ?? "0.00001",
    tickSize: tickSize ?? "0.01",
    stepSize: stepSize ?? "0.00001",
    status: "active",
  }).returning();
  await audit("trading_pair_add", null, { symbol, network });
  res.json({ success: true, pair });
});

// PATCH /api/admin/trading-pairs/:id
router.patch("/admin/trading-pairs/:id", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { status } = req.body as { status: string };
  if (!["active", "inactive"].includes(status)) {
    res.status(400).json({ error: "validation_error", message: "status must be active or inactive" });
    return;
  }
  await db.update(tradingPairsTable).set({ status }).where(eq(tradingPairsTable.id, id));
  await audit("trading_pair_update", null, { id, status });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOKENS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/tokens
router.get("/admin/tokens", adminGuard, async (_req: Request, res: Response): Promise<void> => {
  const tokens = await db.select().from(customTokensTable).orderBy(desc(customTokensTable.createdAt));
  // Enrich with pair existence info
  const pairs = await db.select({ symbol: tradingPairsTable.symbol }).from(tradingPairsTable);
  const pairSet = new Set(pairs.map(p => p.symbol));
  const enriched = tokens.map(t => ({
    ...t,
    hasPair: pairSet.has(`${t.symbol}/USDT`) || pairSet.has(`${t.symbol}/ETH`) || pairSet.has(`${t.symbol}/BNB`),
    pairSymbol: pairSet.has(`${t.symbol}/USDT`) ? `${t.symbol}/USDT` :
                pairSet.has(`${t.symbol}/ETH`) ? `${t.symbol}/ETH` :
                pairSet.has(`${t.symbol}/BNB`) ? `${t.symbol}/BNB` : null,
  }));
  res.json({ tokens: enriched });
});

// POST /api/admin/tokens/:id/create-pair  — create trading pair for existing listed token
router.post("/admin/tokens/:id/create-pair", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [token] = await db.select().from(customTokensTable).where(eq(customTokensTable.id, id));
  if (!token) { res.status(404).json({ error: "not_found" }); return; }

  const { quoteAsset = "USDT", manualPriceUsd } = req.body as { quoteAsset?: string; manualPriceUsd?: number };
  const pairSymbol = `${token.symbol}/${quoteAsset.toUpperCase()}`;
  const existing = await db.select().from(tradingPairsTable).where(eq(tradingPairsTable.symbol, pairSymbol));
  if (existing.length > 0) {
    res.json({ success: true, pairCreated: false, pair: pairSymbol, message: "Pair already exists" });
    return;
  }

  await db.insert(tradingPairsTable).values({
    symbol: pairSymbol,
    baseAsset: token.symbol,
    quoteAsset: quoteAsset.toUpperCase(),
    status: "active",
    network: token.network,
    minOrderSize: "1",
    tickSize: "0.0001",
    stepSize: "1",
  });

  // Set manual price if provided
  if (manualPriceUsd) {
    await db.update(customTokensTable).set({ manualPriceUsd: String(manualPriceUsd) }).where(eq(customTokensTable.id, id));
  }

  try {
    await generateKlines(pairSymbol, "30m", 200);
    await generateKlines(pairSymbol, "1h", 200);
    await generateKlines(pairSymbol, "4h", 100);
    await generateKlines(pairSymbol, "1d", 60);
  } catch (err) {
    logger.warn({ pair: pairSymbol, err }, "Failed to generate seed klines for create-pair");
  }

  await audit("token_pair_create", null, { tokenId: id, pairSymbol });
  res.json({ success: true, pairCreated: true, pair: pairSymbol });
});

// POST /api/admin/tokens
router.post("/admin/tokens", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const { symbol, name, network, contractAddress, decimals, iconUrl, manualPriceUsd, quoteAsset, priceContractAddress } = req.body as {
    symbol: string; name: string; network: string; contractAddress: string;
    decimals?: number; iconUrl?: string; manualPriceUsd?: number; quoteAsset?: string; priceContractAddress?: string;
  };
  if (!symbol || !name || !network || !contractAddress) {
    res.status(400).json({ error: "validation_error", message: "symbol, name, network, contractAddress required" });
    return;
  }

  const sym = symbol.toUpperCase();
  const quote = (quoteAsset ?? "USDT").toUpperCase();

  const [token] = await db.insert(customTokensTable).values({
    symbol: sym,
    name,
    network,
    contractAddress,
    decimals: decimals ?? 18,
    iconUrl: iconUrl ?? null,
    status: "active",
    manualPriceUsd: manualPriceUsd ? String(manualPriceUsd) : null,
    priceContractAddress: priceContractAddress ?? null,
  }).returning();

  // Auto-create trading pair if it doesn't exist yet
  const pairSymbol = `${sym}/${quote}`;
  const existing = await db.select().from(tradingPairsTable).where(eq(tradingPairsTable.symbol, pairSymbol));
  if (existing.length === 0) {
    await db.insert(tradingPairsTable).values({
      symbol: pairSymbol,
      baseAsset: sym,
      quoteAsset: quote,
      status: "active",
      network,
      minOrderSize: "1",
      tickSize: "0.0001",
      stepSize: "1",
    });

    // Generate seed klines for the new pair using initial price
    const seedPrice = manualPriceUsd ?? 0.01;
    try {
      await generateKlines(pairSymbol, "30m", 200);
      await generateKlines(pairSymbol, "1h", 200);
      await generateKlines(pairSymbol, "4h", 100);
      await generateKlines(pairSymbol, "1d", 60);
      logger.info({ pair: pairSymbol, seedPrice }, "Auto-created trading pair with seed klines");
    } catch (err) {
      logger.warn({ pair: pairSymbol, err }, "Failed to generate seed klines");
    }
  }

  await audit("token_listing_add", null, { symbol: sym, network, contractAddress, pairSymbol });
  res.json({ success: true, token, pairCreated: existing.length === 0, pair: pairSymbol });
});

// PATCH /api/admin/tokens/:id/price  — update manual price
router.patch("/admin/tokens/:id/price", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { manualPriceUsd, priceContractAddress } = req.body as { manualPriceUsd?: number; priceContractAddress?: string };
  if (!manualPriceUsd && !priceContractAddress) {
    res.status(400).json({ error: "validation_error", message: "manualPriceUsd or priceContractAddress required" });
    return;
  }
  const updates: Record<string, string | null> = {};
  if (manualPriceUsd !== undefined) updates.manualPriceUsd = String(manualPriceUsd);
  if (priceContractAddress !== undefined) updates.priceContractAddress = priceContractAddress;
  await db.update(customTokensTable).set(updates).where(eq(customTokensTable.id, id));
  await audit("token_price_update", null, { id, manualPriceUsd, priceContractAddress });
  res.json({ success: true });
});

// PATCH /api/admin/tokens/:id
router.patch("/admin/tokens/:id", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { status } = req.body as { status: string };
  if (!["active", "delisted"].includes(status)) {
    res.status(400).json({ error: "validation_error", message: "status must be active or delisted" });
    return;
  }
  await db.update(customTokensTable).set({ status }).where(eq(customTokensTable.id, id));
  await audit("token_listing_update", null, { id, status });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/fees
router.get("/admin/fees", adminGuard, async (_req: Request, res: Response): Promise<void> => {
  const fees = await db.select().from(feeConfigTable).orderBy(feeConfigTable.asset);
  res.json({ fees });
});

// PUT /api/admin/fees/:asset
router.put("/admin/fees/:asset", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const asset = (req.params.asset as string).toUpperCase();
  const { makerFee, takerFee, withdrawalFee } = req.body as {
    makerFee?: string; takerFee?: string; withdrawalFee?: string;
  };
  const existing = await db.select().from(feeConfigTable).where(eq(feeConfigTable.asset, asset));
  if (existing.length > 0) {
    await db.update(feeConfigTable).set({
      ...(makerFee !== undefined ? { makerFee } : {}),
      ...(takerFee !== undefined ? { takerFee } : {}),
      ...(withdrawalFee !== undefined ? { withdrawalFee } : {}),
      updatedAt: new Date(),
    }).where(eq(feeConfigTable.asset, asset));
  } else {
    await db.insert(feeConfigTable).values({
      asset,
      makerFee: makerFee ?? "0.001",
      takerFee: takerFee ?? "0.001",
      withdrawalFee: withdrawalFee ?? "0",
    });
  }
  await audit("fee_config_update", null, { asset, makerFee, takerFee, withdrawalFee });
  res.json({ success: true });
});

// DELETE /api/admin/fees/:asset
router.delete("/admin/fees/:asset", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const asset = (req.params.asset as string).toUpperCase();
  await db.delete(feeConfigTable).where(eq(feeConfigTable.asset, asset));
  await audit("fee_config_delete", null, { asset });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/referrals
router.get("/admin/referrals", adminGuard, async (_req: Request, res: Response): Promise<void> => {
  const [config] = await db.select().from(referralConfigTable).limit(1);
  res.json({ config: config ?? null });
});

// PUT /api/admin/referrals
router.put("/admin/referrals", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const { enabled, rewardType, rewardValue, minTradeVolume } = req.body as {
    enabled?: boolean; rewardType?: string; rewardValue?: string; minTradeVolume?: string;
  };
  const existing = await db.select().from(referralConfigTable).limit(1);
  if (existing.length > 0) {
    await db.update(referralConfigTable).set({
      ...(enabled !== undefined ? { enabled } : {}),
      ...(rewardType ? { rewardType } : {}),
      ...(rewardValue !== undefined ? { rewardValue } : {}),
      ...(minTradeVolume !== undefined ? { minTradeVolume } : {}),
      updatedAt: new Date(),
    }).where(eq(referralConfigTable.id, existing[0].id));
  } else {
    await db.insert(referralConfigTable).values({
      enabled: enabled ?? false,
      rewardType: rewardType ?? "percentage",
      rewardValue: rewardValue ?? "10",
      minTradeVolume: minTradeVolume ?? "0",
    });
  }
  await audit("referral_config_update", null, { enabled, rewardType, rewardValue, minTradeVolume });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION MONITORING
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/transactions
router.get("/admin/transactions", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;
  const type = (req.query["type"] as string) ?? "";
  const status = (req.query["status"] as string) ?? "";
  const asset = (req.query["asset"] as string) ?? "";

  const conditions = [];
  if (type) conditions.push(eq(cryptoTransactionsTable.type, type));
  if (status) conditions.push(eq(cryptoTransactionsTable.status, status));
  if (asset) conditions.push(eq(cryptoTransactionsTable.asset, asset.toUpperCase()));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cryptoTransactionsTable)
    .where(where);

  const txs = await db
    .select({
      id: cryptoTransactionsTable.id,
      userId: cryptoTransactionsTable.userId,
      type: cryptoTransactionsTable.type,
      asset: cryptoTransactionsTable.asset,
      network: cryptoTransactionsTable.network,
      amount: cryptoTransactionsTable.amount,
      txHash: cryptoTransactionsTable.txHash,
      status: cryptoTransactionsTable.status,
      fromAddress: cryptoTransactionsTable.fromAddress,
      toAddress: cryptoTransactionsTable.toAddress,
      confirmations: cryptoTransactionsTable.confirmations,
      createdAt: cryptoTransactionsTable.createdAt,
      userEmail: usersTable.email,
      username: usersTable.username,
    })
    .from(cryptoTransactionsTable)
    .leftJoin(usersTable, eq(cryptoTransactionsTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(cryptoTransactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    transactions: txs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/admin/force-rescan
// Reset deposit scanner to N blocks in the past so it re-processes historical deposits
router.post("/admin/force-rescan", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const { network, lookbackBlocks } = req.body as { network?: string; lookbackBlocks?: number };
  const networks = network ? [network.toUpperCase()] : ["ETH", "BSC", "POLYGON"];
  const validNetworks = ["ETH", "BSC", "POLYGON"];

  const defaultLookback: Record<string, bigint> = {
    POLYGON: 200_000n,
    BSC:      50_000n,
    ETH:       5_000n,
  };

  const results: Record<string, string> = {};
  for (const net of networks) {
    if (!validNetworks.includes(net)) {
      res.status(400).json({ error: "invalid_network", message: `Unknown network: ${net}` });
      return;
    }
    const lb = lookbackBlocks ? BigInt(lookbackBlocks) : defaultLookback[net] ?? 10_000n;
    // Reset RPC scanner
    resetScanBlock(net, 0n);
    results[net] = `Reset — will re-scan back ${lb.toString()} blocks (RPC) + full history (Etherscan)`;
  }

  // Also reset Etherscan watermarks so it re-fetches all history
  resetAllScanBlocks();

  await audit("force_rescan", null, { networks, lookbackBlocks: lookbackBlocks ?? "default" });
  logger.warn({ networks, lookbackBlocks }, "Admin triggered force deposit rescan (RPC + Etherscan)");
  res.json({ success: true, results });
});

// POST /api/admin/reset-test-balances — zero out all user balances (one-time cleanup)
router.post("/admin/reset-test-balances", adminGuard, async (req: Request, res: Response): Promise<void> => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== "RESET") {
    res.status(400).json({ error: "confirmation_required", message: 'Send { confirm: "RESET" } to proceed' });
    return;
  }
  const result = await db.update(balancesTable).set({ available: "0", locked: "0" });
  await audit("reset_test_balances", null, { rows: (result as any).rowCount ?? "unknown" });
  logger.warn("Admin reset all user balances to 0");
  res.json({ success: true, message: "All user balances have been reset to 0" });
});

export default router;

