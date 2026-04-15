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
// ADMIN_PASSWORD must be a bcrypt hash. ADMIN_PASSWORD_HASH is a legacy alias.
// Plaintext comparison is intentionally not supported.
async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminHash = process.env.ADMIN_PASSWORD_HASH ?? process.env.ADMIN_PASSWORD;
  if (!adminHash) return false;
  return bcrypt.compare(password, adminHash);
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

export default router;
