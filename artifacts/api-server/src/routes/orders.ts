import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, ordersTable, balancesTable } from "@workspace/db";
import { CreateOrderBody, GetOrdersQueryParams, CancelOrderParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { matchOrders } from "../lib/matching-engine";
import { getSeedPrice } from "../lib/market-data";

const router = Router();

router.get("/orders", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const params = GetOrdersQueryParams.safeParse(req.query);
  const queryParams = params.success ? params.data : { limit: 50, pair: undefined, status: undefined };

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(queryParams.limit ?? 50);

  const filtered = orders.filter((o) => {
    if (queryParams.pair && o.pair !== queryParams.pair) return false;
    if (queryParams.status && o.status !== queryParams.status) return false;
    return true;
  });

  res.json(
    filtered.map((o) => ({
      id: o.id,
      userId: o.userId,
      pair: o.pair,
      side: o.side,
      type: o.type,
      status: o.status,
      price: o.price,
      quantity: o.quantity,
      filled: o.filled,
      total: o.total,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
  );
});

router.post("/orders", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { pair, side, type, price, quantity } = parsed.data;
  const qty = parseFloat(quantity);

  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: "invalid_quantity", message: "Quantity must be positive" });
    return;
  }

  const [baseAsset, quoteAsset] = pair.split("/");
  if (!baseAsset || !quoteAsset) {
    res.status(400).json({ error: "invalid_pair", message: "Invalid trading pair" });
    return;
  }

  // Determine execution price
  const execPrice = type === "market"
    ? getSeedPrice(pair)
    : parseFloat(price ?? "0");

  if (type === "limit" && execPrice <= 0) {
    res.status(400).json({ error: "invalid_price", message: "Price must be positive for limit orders" });
    return;
  }

  const totalCost = qty * execPrice;

  // Check and lock balance
  const lockAsset = side === "buy" ? quoteAsset : baseAsset;
  const lockAmount = side === "buy" ? totalCost : qty;

  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, lockAsset)));

  if (!bal || parseFloat(bal.available) < lockAmount) {
    res.status(400).json({ error: "insufficient_funds", message: `Insufficient ${lockAsset} balance` });
    return;
  }

  // Lock the funds
  await db
    .update(balancesTable)
    .set({
      available: (parseFloat(bal.available) - lockAmount).toFixed(8),
      locked: (parseFloat(bal.locked) + lockAmount).toFixed(8),
    })
    .where(eq(balancesTable.id, bal.id));

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      pair,
      side,
      type,
      price: type === "limit" ? execPrice.toFixed(8) : null,
      quantity: qty.toFixed(8),
      filled: "0",
      total: totalCost.toFixed(8),
      status: "open",
    })
    .returning();

  if (!order) {
    res.status(500).json({ error: "server_error", message: "Failed to create order" });
    return;
  }

  // Run matching engine asynchronously
  matchOrders(order.id).catch((err) => {
    req.log.error({ err }, "Matching engine error");
  });

  res.status(201).json({
    id: order.id,
    userId: order.userId,
    pair: order.pair,
    side: order.side,
    type: order.type,
    status: order.status,
    price: order.price,
    quantity: order.quantity,
    filled: order.filled,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "not_authenticated", message: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, userId)));

  if (!order) {
    res.status(404).json({ error: "not_found", message: "Order not found" });
    return;
  }

  if (order.status !== "open" && order.status !== "partial") {
    res.status(400).json({ error: "cannot_cancel", message: "Order cannot be cancelled" });
    return;
  }

  // Unlock remaining funds
  const [baseAsset, quoteAsset] = order.pair.split("/");
  if (!baseAsset || !quoteAsset) {
    res.status(400).json({ error: "invalid_pair", message: "Invalid pair" });
    return;
  }

  const remaining = parseFloat(order.quantity) - parseFloat(order.filled);
  const execPrice = parseFloat(order.price ?? "0");
  const unlockAsset = order.side === "buy" ? quoteAsset : baseAsset;
  const unlockAmount = order.side === "buy" ? remaining * execPrice : remaining;

  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, unlockAsset)));

  if (bal) {
    await db
      .update(balancesTable)
      .set({
        available: (parseFloat(bal.available) + unlockAmount).toFixed(8),
        locked: Math.max(0, parseFloat(bal.locked) - unlockAmount).toFixed(8),
      })
      .where(eq(balancesTable.id, bal.id));
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  res.json({
    id: updated!.id,
    userId: updated!.userId,
    pair: updated!.pair,
    side: updated!.side,
    type: updated!.type,
    status: updated!.status,
    price: updated!.price,
    quantity: updated!.quantity,
    filled: updated!.filled,
    total: updated!.total,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
  });
});

export default router;
