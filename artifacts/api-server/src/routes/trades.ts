import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, tradesTable } from "@workspace/db";
import { GetTradesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";

const router = Router();

router.get("/trades", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const params = GetTradesQueryParams.safeParse(req.query);
  const queryParams = params.success ? params.data : { limit: 50, pair: undefined };

  const trades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt))
    .limit(queryParams.limit ?? 50);

  const filtered = trades.filter((t) => {
    if (queryParams.pair && t.pair !== queryParams.pair) return false;
    return true;
  });

  res.json(
    filtered.map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side,
      price: t.price,
      quantity: t.quantity,
      total: t.total,
      fee: t.fee,
      feeAsset: t.feeAsset,
      orderId: t.orderId,
      createdAt: t.createdAt,
    })),
  );
});

export default router;
