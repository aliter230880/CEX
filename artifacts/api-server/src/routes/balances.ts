import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, balancesTable, usersTable } from "@workspace/db";
import { DepositBody, WithdrawBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";

const router = Router();

router.get("/balances", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const balances = await db
    .select()
    .from(balancesTable)
    .where(eq(balancesTable.userId, userId));

  res.json(
    balances.map((b) => ({
      id: b.id,
      userId: b.userId,
      asset: b.asset,
      available: b.available,
      locked: b.locked,
      network: b.network,
    })),
  );
});

router.post("/balances/deposit", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { asset, amount, network } = parsed.data;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    res.status(400).json({ error: "invalid_amount", message: "Amount must be positive" });
    return;
  }

  const [existing] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (existing) {
    const newAvailable = parseFloat(existing.available) + amt;
    const [updated] = await db
      .update(balancesTable)
      .set({ available: newAvailable.toFixed(8), network })
      .where(eq(balancesTable.id, existing.id))
      .returning();
    res.json({ id: updated!.id, userId: updated!.userId, asset: updated!.asset, available: updated!.available, locked: updated!.locked, network: updated!.network });
    return;
  }

  const [created] = await db
    .insert(balancesTable)
    .values({ userId, asset, available: amt.toFixed(8), locked: "0", network })
    .returning();

  res.json({ id: created!.id, userId: created!.userId, asset: created!.asset, available: created!.available, locked: created!.locked, network: created!.network });
});

router.post("/balances/withdraw", async (req, res): Promise<void> => {
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

  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { asset, amount, network } = parsed.data;
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

  const newAvailable = parseFloat(bal.available) - amt;
  const [updated] = await db
    .update(balancesTable)
    .set({ available: newAvailable.toFixed(8), network })
    .where(eq(balancesTable.id, bal.id))
    .returning();

  res.json({ id: updated!.id, userId: updated!.userId, asset: updated!.asset, available: updated!.available, locked: updated!.locked, network: updated!.network });
});

export default router;
