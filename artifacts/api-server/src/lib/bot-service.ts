/**
 * ATEX Bot Trading Service
 *
 * Simulates market activity by placing matched limit orders between two bot accounts.
 * Works directly via the database and matching engine — no HTTP calls, no gas fees.
 *
 * Behavior:
 *  - 2 bot users trade against each other every 30-90 seconds
 *  - All major pairs (BTC, ETH, BNB, POL, SOL, LUX)
 *  - LUX price drifts with sinusoidal trend + noise (slow growth pattern)
 *  - Other pairs track real market price ±0.2% variation
 *  - Balances auto-refill when low — bots never run dry
 */

import { db, usersTable, balancesTable, ordersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import { matchOrders } from "./matching-engine";
import { logger } from "./logger";
import { getSeedPrice } from "./market-data";
import { setLuxPrice } from "./price-feed";

// ─── LuxEx on-chain price oracle ─────────────────────────────────────────────

const LUXEX_CONTRACT = "0xe5646EBf223499E0d15Af09F8e42cC6586B0512b";
const POLYGON_USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // 6 decimals
const POLYGON_POL  = "0x0000000000000000000000000000000000001010"; // 18 decimals (native)

const LUXEX_ABI = [
  {
    inputs: [{ name: "token", type: "address" }],
    name: "getPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const POLYGON_RPCS = [
  "https://1rpc.io/matic",
  "https://rpc-mainnet.maticvigil.com",
  "https://polygon-bor-rpc.publicnode.com",
];

interface LuxRates { usdt: number; pol: number }

async function fetchLuxPriceFromChain(): Promise<LuxRates> {
  for (const rpc of POLYGON_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc, 137, { batchMaxCount: 1 });
      const contract = new ethers.Contract(LUXEX_CONTRACT, LUXEX_ABI, provider);

      const timeout = <T>(p: Promise<T>) =>
        Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);

      const [usdtWei, polWei] = await Promise.all([
        timeout(contract.getPrice(POLYGON_USDT) as Promise<bigint>),
        timeout(contract.getPrice(POLYGON_POL)  as Promise<bigint>),
      ]);

      const usdt = Number(usdtWei) / 1e6;  // USDT: 6 decimals
      const pol  = Number(polWei)  / 1e18; // POL:  18 decimals

      if (usdt > 0 && pol > 0) {
        logger.info({ rpc, priceUSDT: usdt, pricePOL: pol }, "LUX rates fetched from LuxEx chain");
        return { usdt, pol };
      }
    } catch (err) {
      logger.warn({ rpc, err }, "LuxEx RPC failed, trying next");
    }
  }
  logger.warn("All Polygon RPCs failed — using default LUX rates");
  return { usdt: 0.0100, pol: 0.11 };
}

// ─── Bot accounts ────────────────────────────────────────────────────────────

const BOT_USERS = [
  {
    email: "bot1@atex.internal",
    username: "_MarketBot_A",
    password: "xK9#mPw2@vL5nQ8!zt",
  },
  {
    email: "bot2@atex.internal",
    username: "_MarketBot_B",
    password: "rT7$hJs3@nK6pM4!qw",
  },
];

// Large starting balances — enough for months of trading without running dry
const BOT_STARTING_BALANCES: Record<string, number> = {
  USDT: 10_000_000,
  USDC: 5_000_000,
  BTC: 200,
  ETH: 4_000,
  BNB: 20_000,
  POL: 2_000_000,
  SOL: 40_000,
  UNI: 500_000,
  LUX: 500_000_000,
};

// Minimum threshold before auto-refill triggers (10% of starting balance)
const REFILL_THRESHOLD_RATIO = 0.1;

// ─── Trading pairs ────────────────────────────────────────────────────────────

const PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "POL/USDT",
  "SOL/USDT",
  "LUX/USDT",
  "UNI/USDT",
  "USDC/USDT",
  "USDT/ETH",
  "POL/LUX",
  "USDC/LUX",
];

// Trade volume per pair (base asset quantity per trade)
const PAIR_VOLUME: Record<string, { min: number; max: number }> = {
  "BTC/USDT":  { min: 0.0005, max: 0.05    },
  "ETH/USDT":  { min: 0.005,  max: 0.5     },
  "BNB/USDT":  { min: 0.05,   max: 5       },
  "POL/USDT":  { min: 20,     max: 1000    },
  "SOL/USDT":  { min: 0.1,    max: 15      },
  "LUX/USDT":  { min: 5000,   max: 200_000 },
  "UNI/USDT":  { min: 5,      max: 500     },
  "USDC/USDT": { min: 100,    max: 10_000  },
  "USDT/ETH":  { min: 100,    max: 5_000   },
  "POL/LUX":   { min: 50,     max: 2_000   },
  "USDC/LUX":  { min: 10,     max: 500     },
};

// ─── LUX Price Simulator ──────────────────────────────────────────────────────

class LuxPriceSimulator {
  private price: number;
  private phase: number;
  private lastUpdate: number;

  // Slow oscillation: 8-hour period, 5% amplitude
  private readonly periodMs = 8 * 60 * 60 * 1000;
  private readonly trendAmplitude = 0.05;

  // Micro upward drift per tick: accumulates to ~2% growth per day at 60s intervals
  private readonly driftPerTick = 0.000023;

  constructor(startPrice: number) {
    this.price = startPrice;
    this.phase = Math.random() * Math.PI * 2; // random start in cycle
    this.lastUpdate = Date.now();
  }

  next(): number {
    const now = Date.now();
    const dtMs = now - this.lastUpdate;
    this.lastUpdate = now;

    // Advance sinusoidal phase proportional to elapsed time
    this.phase += (dtMs / this.periodMs) * Math.PI * 2;

    // Trend component (sinusoidal — slow oscillation around drift)
    const trend = Math.sin(this.phase) * this.trendAmplitude * 0.01;

    // Random noise ±0.25%
    const noise = (Math.random() - 0.5) * 0.005;

    // Micro drift upward
    const drift = this.driftPerTick;

    this.price = this.price * (1 + trend + noise + drift);

    // Sanity clamp: don't go below 0.0001 or above 100× start
    this.price = Math.max(0.0001, this.price);

    return this.price;
  }

  current(): number {
    return this.price;
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

let luxSim: LuxPriceSimulator | null = null;
let botUserIds: [number, number] | null = null;
let isRunning = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureBalance(
  userId: number,
  asset: string,
  startingAmount: number,
): Promise<void> {
  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  const threshold = startingAmount * REFILL_THRESHOLD_RATIO;

  if (!bal) {
    await db.insert(balancesTable).values({
      userId,
      asset,
      available: startingAmount.toFixed(8),
      locked: "0",
    });
  } else if (parseFloat(bal.available) + parseFloat(bal.locked) < threshold) {
    // Refill available balance
    await db
      .update(balancesTable)
      .set({
        available: (parseFloat(bal.available) + startingAmount).toFixed(8),
      })
      .where(eq(balancesTable.id, bal.id));

    logger.info({ userId, asset, refillAmount: startingAmount }, "Bot balance refilled");
  }
}

async function placeOrder(
  userId: number,
  pair: string,
  side: "buy" | "sell",
  price: number,
  quantity: number,
): Promise<number | null> {
  const [baseAsset, quoteAsset] = pair.split("/") as [string, string];

  const lockAsset = side === "buy" ? quoteAsset : baseAsset;
  const lockAmount = side === "buy" ? quantity * price : quantity;

  const [bal] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, lockAsset)));

  if (!bal || parseFloat(bal.available) < lockAmount) {
    logger.warn(
      { userId, pair, side, lockAsset, need: lockAmount, have: bal?.available ?? 0 },
      "Bot insufficient balance — skipping",
    );
    return null;
  }

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
      type: "limit",
      price: price.toFixed(8),
      quantity: quantity.toFixed(8),
      filled: "0",
      total: (quantity * price).toFixed(8),
      status: "open",
      isBot: true,
    })
    .returning();

  return order?.id ?? null;
}

async function cancelOrder(orderId: number, userId: number, pair: string, side: "buy" | "sell", price: number, quantity: number): Promise<void> {
  const [baseAsset, quoteAsset] = pair.split("/") as [string, string];
  const unlockAsset = side === "buy" ? quoteAsset : baseAsset;
  const unlockAmount = side === "buy" ? quantity * price : quantity;

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

  await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
}

// ─── Core simulation ──────────────────────────────────────────────────────────

async function simulatePairTrade(pair: string): Promise<void> {
  if (!botUserIds) return;

  const [botAId, botBId] = botUserIds;

  // Determine current price for this pair
  let midPrice: number;
  if (pair === "LUX/USDT" && luxSim) {
    midPrice = luxSim.next();
  } else {
    const marketPrice = getSeedPrice(pair);
    const variation = (Math.random() - 0.5) * 0.004; // ±0.2%
    midPrice = marketPrice * (1 + variation);
  }

  if (!midPrice || midPrice <= 0) return;

  const volRange = PAIR_VOLUME[pair] ?? { min: 1, max: 10 };
  const quantity = rand(volRange.min, volRange.max);

  // Spread: maker posts at midPrice, taker crosses the spread
  const spread = midPrice * 0.0008; // 0.08% spread
  const sellPrice = midPrice + spread / 2;
  const buyPrice  = midPrice + spread;    // buy > sell → guaranteed match

  const baseAsset  = pair.split("/")[0]!;
  const quoteAsset = pair.split("/")[1]!;

  // Ensure adequate balances for both bots
  await ensureBalance(botAId, baseAsset,  BOT_STARTING_BALANCES[baseAsset]  ?? 10_000);
  await ensureBalance(botAId, quoteAsset, BOT_STARTING_BALANCES[quoteAsset] ?? 1_000_000);
  await ensureBalance(botBId, baseAsset,  BOT_STARTING_BALANCES[baseAsset]  ?? 10_000);
  await ensureBalance(botBId, quoteAsset, BOT_STARTING_BALANCES[quoteAsset] ?? 1_000_000);

  // Randomly decide who sells and who buys (creates variety in trade history)
  const aIsSeller = Math.random() > 0.5;
  const sellerId  = aIsSeller ? botAId : botBId;
  const buyerId   = aIsSeller ? botBId : botAId;

  // Step 1: Maker places the SELL limit order
  const sellOrderId = await placeOrder(sellerId, pair, "sell", sellPrice, quantity);
  if (!sellOrderId) return;

  // Brief pause (realistic order book timing)
  await sleep(150 + Math.random() * 300);

  // Step 2: Taker places BUY order that crosses spread → triggers match
  const buyOrderId = await placeOrder(buyerId, pair, "buy", buyPrice, quantity);
  if (!buyOrderId) {
    // Clean up the orphan sell order
    await cancelOrder(sellOrderId, sellerId, pair, "sell", sellPrice, quantity);
    return;
  }

  // Step 3: Run matching engine — it finds the sell order and executes the trade
  await matchOrders(buyOrderId);

  logger.info(
    {
      pair,
      price: midPrice.toFixed(pair === "LUX/USDT" ? 6 : 2),
      qty: quantity.toFixed(4),
      seller: sellerId,
      buyer: buyerId,
    },
    "Bot trade executed",
  );
}

// ─── Market-maker depth seeding ───────────────────────────────────────────────

// Track resting maker order IDs per pair so we can cancel and replace them
const makerOrderIds: Map<string, number[]> = new Map();

async function seedOrderBook(pair: string): Promise<void> {
  if (!botUserIds) return;
  const [botAId, botBId] = botUserIds;

  let midPrice: number;
  if (pair === "LUX/USDT" && luxSim) {
    midPrice = luxSim.current();
  } else {
    midPrice = getSeedPrice(pair);
  }
  if (!midPrice || midPrice <= 0) return;

  // Cancel previous maker orders for this pair
  const old = makerOrderIds.get(pair) ?? [];
  if (old.length > 0) {
    const oldOrders = await db.select().from(ordersTable).where(inArray(ordersTable.id, old));
    for (const o of oldOrders) {
      if (o.status !== "open") continue;
      const [baseAsset, quoteAsset] = pair.split("/") as [string, string];
      const unlockAsset = o.side === "buy" ? quoteAsset : baseAsset;
      const unlockAmt = o.side === "buy"
        ? parseFloat(o.quantity) * parseFloat(o.price ?? "0")
        : parseFloat(o.quantity);
      const [bal] = await db.select().from(balancesTable)
        .where(and(eq(balancesTable.userId, o.userId), eq(balancesTable.asset, unlockAsset)));
      if (bal) {
        await db.update(balancesTable).set({
          available: (parseFloat(bal.available) + unlockAmt).toFixed(8),
          locked: Math.max(0, parseFloat(bal.locked) - unlockAmt).toFixed(8),
        }).where(eq(balancesTable.id, bal.id));
      }
      await db.update(ordersTable).set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(ordersTable.id, o.id));
    }
    makerOrderIds.set(pair, []);
  }

  const newIds: number[] = [];
  const LEVELS = 10;
  const volRange = PAIR_VOLUME[pair] ?? { min: 1, max: 10 };

  await ensureBalance(botAId, pair.split("/")[0]!, BOT_STARTING_BALANCES[pair.split("/")[0]!] ?? 10_000);
  await ensureBalance(botAId, pair.split("/")[1]!, BOT_STARTING_BALANCES[pair.split("/")[1]!] ?? 1_000_000);
  await ensureBalance(botBId, pair.split("/")[0]!, BOT_STARTING_BALANCES[pair.split("/")[0]!] ?? 10_000);
  await ensureBalance(botBId, pair.split("/")[1]!, BOT_STARTING_BALANCES[pair.split("/")[1]!] ?? 1_000_000);

  for (let i = 1; i <= LEVELS; i++) {
    const offset = i * 0.005; // 0.5% per level: -0.5%, -1%, ... -5%
    const bidPrice = midPrice * (1 - offset);
    const askPrice = midPrice * (1 + offset);
    const qty = rand(volRange.min, volRange.max);

    const bidId = await placeOrder(botAId, pair, "buy",  bidPrice, qty);
    if (bidId) newIds.push(bidId);

    const askId = await placeOrder(botBId, pair, "sell", askPrice, qty);
    if (askId) newIds.push(askId);

    await sleep(50);
  }

  makerOrderIds.set(pair, newIds);
  logger.info({ pair, levels: LEVELS, midPrice: midPrice.toFixed(6), orders: newIds.length }, "Order book seeded");
}

async function seedAllPairs(): Promise<void> {
  for (const pair of PAIRS) {
    try {
      await seedOrderBook(pair);
    } catch (err) {
      logger.warn({ err, pair }, "Failed to seed order book for pair");
    }
    await sleep(200);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function runLoop(): Promise<void> {
  // Stagger initial start so not all pairs trade at once
  await sleep(rand(5_000, 15_000));

  while (isRunning) {
    // Pick a random pair to trade this round
    const pair = PAIRS[randInt(0, PAIRS.length - 1)]!;

    try {
      await simulatePairTrade(pair);
    } catch (err) {
      logger.error({ err, pair }, "Bot simulation error — continuing");
    }

    // Wait 30-90 seconds before next trade
    const delay = randInt(30_000, 90_000);
    await sleep(delay);
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function initBotUsers(): Promise<[number, number] | null> {
  const ids: number[] = [];

  for (const cfg of BOT_USERS) {
    try {
      let [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, cfg.email));

      if (!user) {
        const passwordHash = await bcrypt.hash(cfg.password, 10);
        const [created] = await db
          .insert(usersTable)
          .values({ email: cfg.email, username: cfg.username, passwordHash })
          .returning();
        user = created;
        logger.info({ email: cfg.email }, "Bot user created");
      }

      if (!user) throw new Error("Failed to create bot user");
      ids.push(user.id);

      // Seed starting balances
      for (const [asset, amount] of Object.entries(BOT_STARTING_BALANCES)) {
        await ensureBalance(user.id, asset, amount);
      }
    } catch (err) {
      logger.error({ err, email: cfg.email }, "Failed to init bot user");
    }
  }

  if (ids.length < 2) return null;
  return [ids[0]!, ids[1]!];
}

export async function startBotService(): Promise<void> {
  if (isRunning) return;

  logger.info("Initializing bot trading service...");

  try {
    const ids = await initBotUsers();
    if (!ids) {
      logger.error("Bot users could not be initialized — bot service disabled");
      return;
    }

    botUserIds = ids;

    // Fetch real LUX rates from LuxEx smart contract (fallback: $0.0100, 0.11 POL)
    const luxRates = await fetchLuxPriceFromChain();
    luxSim = new LuxPriceSimulator(luxRates.usdt);

    // Share LUX rates with price-feed so POL/LUX, USDC/LUX use correct LuxEx rates
    setLuxPrice(luxRates.usdt, luxRates.pol);

    isRunning = true;

    // Seed initial order book depth for all pairs (resting maker orders)
    seedAllPairs().catch((err) => logger.warn({ err }, "Initial order book seeding failed"));

    // Re-seed every 5 minutes to keep depth fresh as prices move
    const seedInterval = setInterval(() => {
      if (!isRunning) { clearInterval(seedInterval); return; }
      seedAllPairs().catch((err) => logger.warn({ err }, "Order book re-seed failed"));
    }, 5 * 60 * 1000);

    // Run trade simulation in background — don't await
    runLoop().catch((err) => {
      logger.error({ err }, "Bot loop crashed unexpectedly");
      isRunning = false;
    });

    logger.info({ botA: ids[0], botB: ids[1] }, "Bot trading service started ✓");
  } catch (err) {
    logger.error({ err }, "Bot service startup failed");
  }
}

export function stopBotService(): void {
  if (!isRunning) return;
  isRunning = false;
  logger.info("Bot trading service stopped");
}
