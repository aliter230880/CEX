import app from "./app";
import { logger } from "./lib/logger";
import { seedData } from "./lib/seed";
import { startDepositMonitor } from "./lib/deposit-monitor";
import { startPriceFeed } from "./lib/price-feed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  seedData();
  startPriceFeed().catch(err => logger.error({ err }, "Price feed failed to start"));
  if (process.env.WALLET_MNEMONIC) {
    startDepositMonitor();
  } else {
    logger.warn("WALLET_MNEMONIC not set — deposit monitoring disabled");
  }
});
