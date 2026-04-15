import { db, ordersTable, tradesTable, balancesTable } from "@workspace/db";
import { eq, and, asc, desc, or } from "drizzle-orm";
import { logger } from "./logger";

const FEE_RATE = 0.001; // 0.1%

export async function matchOrders(newOrderId: number): Promise<void> {
  const [newOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, newOrderId));
  if (!newOrder || newOrder.status !== "open") return;

  const [baseAsset, quoteAsset] = newOrder.pair.split("/");
  if (!baseAsset || !quoteAsset) return;

  // Find matching orders (opposite side)
  const oppositeSide = newOrder.side === "buy" ? "sell" : "buy";

  let matchingOrders;
  if (newOrder.type === "market") {
    // Market order matches any open limit orders on the other side
    matchingOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.pair, newOrder.pair),
          eq(ordersTable.side, oppositeSide),
          or(eq(ordersTable.status, "open"), eq(ordersTable.status, "partial")),
        ),
      )
      .orderBy(newOrder.side === "buy" ? asc(ordersTable.price) : desc(ordersTable.price));
  } else {
    // Limit order: buy matches sells at price <= buy price; sell matches buys at price >= sell price
    matchingOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.pair, newOrder.pair),
          eq(ordersTable.side, oppositeSide),
          or(eq(ordersTable.status, "open"), eq(ordersTable.status, "partial")),
        ),
      )
      .orderBy(newOrder.side === "buy" ? asc(ordersTable.price) : desc(ordersTable.price));
  }

  let remainingQty = parseFloat(newOrder.quantity) - parseFloat(newOrder.filled);

  for (const matchOrder of matchingOrders) {
    if (remainingQty <= 0) break;

    const matchPrice = parseFloat(matchOrder.price ?? "0");
    const newPrice = newOrder.type === "limit" ? parseFloat(newOrder.price ?? "0") : matchPrice;

    // Check price compatibility for limit orders
    if (newOrder.type === "limit") {
      if (newOrder.side === "buy" && newPrice < matchPrice) continue;
      if (newOrder.side === "sell" && newPrice > matchPrice) continue;
    }

    const matchRemaining = parseFloat(matchOrder.quantity) - parseFloat(matchOrder.filled);
    const execQty = Math.min(remainingQty, matchRemaining);
    const execPrice = matchPrice;
    const execTotal = execQty * execPrice;

    const buyOrderId = newOrder.side === "buy" ? newOrder.id : matchOrder.id;
    const sellOrderId = newOrder.side === "sell" ? newOrder.id : matchOrder.id;
    const buyUserId = newOrder.side === "buy" ? newOrder.userId : matchOrder.userId;
    const sellUserId = newOrder.side === "sell" ? newOrder.userId : matchOrder.userId;

    const buyFee = execQty * FEE_RATE;
    const sellFee = execTotal * FEE_RATE;

    try {
      // Create trade for buyer
      await db.insert(tradesTable).values({
        userId: buyUserId,
        orderId: buyOrderId,
        pair: newOrder.pair,
        side: "buy",
        price: execPrice.toFixed(8),
        quantity: execQty.toFixed(8),
        total: execTotal.toFixed(8),
        fee: buyFee.toFixed(8),
        feeAsset: baseAsset,
      });

      // Create trade for seller
      await db.insert(tradesTable).values({
        userId: sellUserId,
        orderId: sellOrderId,
        pair: newOrder.pair,
        side: "sell",
        price: execPrice.toFixed(8),
        quantity: execQty.toFixed(8),
        total: execTotal.toFixed(8),
        fee: sellFee.toFixed(8),
        feeAsset: quoteAsset,
      });

      // Update matched order
      const matchNewFilled = parseFloat(matchOrder.filled) + execQty;
      const matchStatus = matchNewFilled >= parseFloat(matchOrder.quantity) ? "filled" : "partial";
      await db
        .update(ordersTable)
        .set({
          filled: matchNewFilled.toFixed(8),
          status: matchStatus,
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, matchOrder.id));

      // Update balances for buyer: unlock USDT (quote), give base asset
      await adjustBalance(buyUserId, quoteAsset, -(execTotal + execTotal * FEE_RATE), execTotal);
      await adjustBalance(buyUserId, baseAsset, execQty - buyFee, 0);

      // Update balances for seller: unlock base asset, give USDT (quote)
      await adjustBalance(sellUserId, baseAsset, -execQty, execQty);
      await adjustBalance(sellUserId, quoteAsset, execTotal - sellFee, 0);

      remainingQty -= execQty;
    } catch (err) {
      logger.error({ err }, "Error matching orders");
    }
  }

  // Update new order status
  const totalFilled = parseFloat(newOrder.quantity) - remainingQty;
  const newStatus = totalFilled >= parseFloat(newOrder.quantity)
    ? "filled"
    : totalFilled > 0
    ? "partial"
    : "open";

  await db
    .update(ordersTable)
    .set({
      filled: totalFilled.toFixed(8),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, newOrderId));
}

async function adjustBalance(
  userId: number,
  asset: string,
  availableDelta: number,
  lockedDelta: number,
): Promise<void> {
  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (!bal) return;

  const newAvailable = parseFloat(bal.available) + availableDelta;
  const newLocked = parseFloat(bal.locked) - lockedDelta;

  await db
    .update(balancesTable)
    .set({
      available: Math.max(0, newAvailable).toFixed(8),
      locked: Math.max(0, newLocked).toFixed(8),
    })
    .where(eq(balancesTable.id, bal.id));
}
