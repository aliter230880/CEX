// Load env vars from .env file (always overrides — .env is the source of truth on server)
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
(function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  try {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (!key) continue;
      let val = line.slice(eq + 1); // keep leading spaces in case value has them
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch { /* ignore */ }
})();

import app from "./app";
import { logger } from "./lib/logger";
import { seedData } from "./lib/seed";
import { startDepositMonitor } from "./lib/deposit-monitor";
import { startPriceFeed } from "./lib/price-feed";
import { startBotService } from "./lib/bot-service";

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
  startBotService().catch(err => logger.error({ err }, "Bot service failed to start"));
  if (process.env.WALLET_MNEMONIC) {
    startDepositMonitor();
  } else {
    logger.warn("WALLET_MNEMONIC not set — deposit monitoring disabled");
  }
});
