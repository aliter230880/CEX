import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import balancesRouter from "./balances";
import ordersRouter from "./orders";
import tradesRouter from "./trades";
import orderbookRouter from "./orderbook";
import marketRouter from "./market";
import walletRouter from "./wallet";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(balancesRouter);
router.use(ordersRouter);
router.use(tradesRouter);
router.use(orderbookRouter);
router.use(marketRouter);
router.use(walletRouter);
router.use(adminRouter);

export default router;
