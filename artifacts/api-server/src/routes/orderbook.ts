import { Router } from "express";
import { getOrderBookData } from "../lib/market-data";

const router = Router();

router.get("/orderbook/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  // Convert BTC-USDT to BTC/USDT
  const pair = (rawPair ?? "").replace(/-/g, "/");
  const depth = parseInt((req.query.depth as string) ?? "20", 10) || 20;

  const book = await getOrderBookData(pair, depth);
  res.json(book);
});

export default router;
