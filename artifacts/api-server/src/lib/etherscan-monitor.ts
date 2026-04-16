/**
 * Etherscan-based deposit monitor.
 *
 * Strategy:
 *   ETH    (chainid=1)   — Etherscan V2 API (free key ETHERSCAN_API_KEY)
 *   POLYGON (chainid=137) — Etherscan V2 API (free key ETHERSCAN_API_KEY)
 *   BSC    (chainid=56)  — BscScan API (free key BSCSCAN_API_KEY) if set,
 *                          otherwise skipped (public RPCs rate-limit getLogs)
 *
 * Etherscan/BscScan `tokentx` and `txlist` endpoints return ALL historical
 * transactions for a given address — no block-range issues, no getLogs prune errors.
 * Rate limit on free plan: 5 calls/sec; we poll every 60s so it's fine.
 *
 * For native coins (ETH, POL, BNB) we use `txlist` filtered to incoming.
 */

import { ethers } from "ethers";
import { eq, and } from "drizzle-orm";
import { db, depositAddressesTable, cryptoTransactionsTable, balancesTable, customTokensTable } from "@workspace/db";
import { logger } from "./logger";
import { getRequiredConfirmations } from "./blockchain";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";

// Networks + their Etherscan V2 chain IDs (ETHERSCAN_API_KEY covers ETH + POLYGON free)
const ETHERSCAN_CHAIN_IDS: Record<string, number> = {
  ETH:     1,
  POLYGON: 137,
};

// BSC via Etherscan V2 with chainid=56 — requires a key registered on bscscan.com
// (BscScan migrated to Etherscan V2: "Access 50+ EVM chains with a single API key")
const BSC_CHAIN_ID = 56;

// Native asset symbol per network (all networks including BSC)
const NATIVE_ASSET: Record<string, string> = {
  ETH:     "ETH",
  POLYGON: "POL",
  BSC:     "BNB",
};

// Track last processed block per network to avoid re-processing
const lastProcessedBlock: Record<string, number> = {};

async function explorerFetch(
  baseUrl: string,
  apiKey: string,
  params: Record<string, string>,
  chainIdParam?: number,
): Promise<unknown[]> {
  const qs = new URLSearchParams({
    ...(chainIdParam !== undefined ? { chainid: String(chainIdParam) } : {}),
    apikey: apiKey,
    ...params,
  }).toString();

  const url = `${baseUrl}?${qs}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Explorer API HTTP ${res.status}`);

  const json = await res.json() as { status: string; message: string; result: unknown };
  if (json.status !== "1") {
    if (json.message === "No transactions found" || json.result === "No transactions found") {
      return [];
    }
    throw new Error(`Explorer API error: ${json.message} — ${JSON.stringify(json.result).slice(0, 100)}`);
  }
  return Array.isArray(json.result) ? json.result : [];
}

async function etherscanFetch(chainId: number, params: Record<string, string>): Promise<unknown[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY not set");
  return explorerFetch(ETHERSCAN_BASE, apiKey, params, chainId);
}

async function bscscanFetch(params: Record<string, string>): Promise<unknown[]> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) throw new Error("BSCSCAN_API_KEY not set");
  // BscScan migrated to Etherscan V2 — use same endpoint with chainid=56
  return explorerFetch(ETHERSCAN_BASE, apiKey, params, BSC_CHAIN_ID);
}

interface EtherscanTokenTx {
  blockNumber:      string;
  hash:             string;
  from:             string;
  to:               string;
  value:            string;
  tokenSymbol:      string;
  tokenDecimal:     string;
  contractAddress:  string;
  confirmations:    string;
}

interface EtherscanNativeTx {
  blockNumber:   string;
  hash:          string;
  from:          string;
  to:            string;
  value:         string;          // in wei
  confirmations: string;
  isError:       string;
}

type FetchFn = (params: Record<string, string>) => Promise<unknown[]>;

/**
 * Scan a single deposit address on one network using a block explorer API.
 * Fetches ERC-20 token transfers + native coin transactions.
 */
async function scanAddressOnChain(
  network:    string,
  fetchFn:    FetchFn,
  depAddr:    { userId: number; address: string },
) {
  const addr       = depAddr.address.toLowerCase();
  const required   = getRequiredConfirmations(network);
  const startBlock = lastProcessedBlock[`${network}:${addr}`] ?? 0;

  // ── ERC-20 token transfers ──────────────────────────────────────────────
  let tokenTxs: EtherscanTokenTx[] = [];
  try {
    tokenTxs = (await fetchFn({
      module:     "account",
      action:     "tokentx",
      address:    depAddr.address,
      startblock: String(startBlock),
      endblock:   "99999999",
      sort:       "asc",
      page:       "1",
      offset:     "200",
    })) as EtherscanTokenTx[];
  } catch (err) {
    logger.warn({ err, network, address: addr }, "Explorer tokentx fetch failed");
  }

  for (const tx of tokenTxs) {
    // Only transfers TO our address
    if (tx.to.toLowerCase() !== addr) continue;

    const confs = parseInt(tx.confirmations, 10);
    if (confs < required) continue;

    const txHash = tx.hash;
    const symbol = tx.tokenSymbol;
    const decimals = parseInt(tx.tokenDecimal, 10);
    const amount = ethers.formatUnits(tx.value, decimals);

    await processTx(depAddr.userId, symbol, network, amount, txHash, tx.from, tx.to, confs);
  }

  // ── Native coin transfers (ETH / POL / BNB) ────────────────────────────
  const nativeAsset = NATIVE_ASSET[network];
  if (nativeAsset) {
    let nativeTxs: EtherscanNativeTx[] = [];
    try {
      nativeTxs = (await fetchFn({
        module:     "account",
        action:     "txlist",
        address:    depAddr.address,
        startblock: String(startBlock),
        endblock:   "99999999",
        sort:       "asc",
        page:       "1",
        offset:     "200",
      })) as EtherscanNativeTx[];
    } catch (err) {
      logger.warn({ err, network, address: addr }, "Explorer txlist fetch failed");
    }

    for (const tx of nativeTxs) {
      if (tx.isError === "1") continue;                         // failed tx
      if (tx.to.toLowerCase() !== addr) continue;              // not incoming
      if (tx.value === "0" || tx.value === "0x0") continue;    // zero value

      const confs = parseInt(tx.confirmations, 10);
      if (confs < required) continue;

      const amount = ethers.formatEther(tx.value);
      if (parseFloat(amount) < 0.000001) continue;

      await processTx(depAddr.userId, nativeAsset, network, amount, tx.hash, tx.from, tx.to, confs);
    }
  }

  // Advance the startblock watermark to avoid re-fetching old txs
  const allBlocks = tokenTxs.map(t => parseInt(t.blockNumber, 10));
  if (allBlocks.length > 0) {
    const maxBlock = Math.max(...allBlocks);
    lastProcessedBlock[`${network}:${addr}`] = maxBlock + 1;
  }
}

async function processTx(
  userId:      number,
  asset:       string,
  network:     string,
  amount:      string,
  txHash:      string,
  fromAddress: string,
  toAddress:   string,
  confirmations: number,
) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;

  // Already recorded?
  const existing = await db
    .select({ id: cryptoTransactionsTable.id, status: cryptoTransactionsTable.status })
    .from(cryptoTransactionsTable)
    .where(eq(cryptoTransactionsTable.txHash, txHash));

  if (existing.length > 0) {
    // If still pending but now confirmed, upgrade it
    if (existing[0].status === "pending") {
      await db.update(cryptoTransactionsTable)
        .set({ status: "confirmed", confirmations })
        .where(eq(cryptoTransactionsTable.id, existing[0].id));
      await creditBalance(userId, asset, network, amount);
      logger.info({ userId, asset, network, amount, txHash }, "Deposit confirmed (was pending)");
    }
    return;
  }

  // Insert new confirmed deposit record
  await db.insert(cryptoTransactionsTable).values({
    userId,
    type:        "deposit",
    asset,
    network,
    amount,
    txHash,
    status:      "confirmed",
    fromAddress,
    toAddress,
    confirmations,
  }).onConflictDoNothing();

  await creditBalance(userId, asset, network, amount);
  logger.info({ userId, asset, network, amount, txHash }, "Deposit credited via Etherscan");
}

async function creditBalance(userId: number, asset: string, network: string, amount: string) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return;

  const [existing] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.asset, asset)));

  if (existing) {
    const newAvail = (parseFloat(existing.available) + amt).toFixed(8);
    await db.update(balancesTable).set({ available: newAvail }).where(eq(balancesTable.id, existing.id));
  } else {
    await db.insert(balancesTable).values({
      userId,
      asset,
      available: amt.toFixed(8),
      locked:    "0",
      network,
    });
  }
}

/**
 * Run one scan cycle for all explorer-supported networks.
 * ETH + POLYGON via Etherscan V2 API (ETHERSCAN_API_KEY).
 * BSC via BscScan API (BSCSCAN_API_KEY) — if key is set, otherwise skipped.
 * Called every 60 seconds (explorer APIs return full history, nothing is missed between polls).
 */
export async function scanEtherscanNetworks() {
  const depositAddresses = await db.select().from(depositAddressesTable);
  if (depositAddresses.length === 0) return;

  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // Build list of networks + their fetch functions
  type NetworkScan = { network: string; fetchFn: FetchFn };
  const networksToScan: NetworkScan[] = [];

  // ETH + POLYGON via Etherscan V2
  for (const [network, chainId] of Object.entries(ETHERSCAN_CHAIN_IDS)) {
    const cid = chainId;
    networksToScan.push({
      network,
      fetchFn: (params) => etherscanFetch(cid, params),
    });
  }

  // BSC via BscScan (only if BSCSCAN_API_KEY is set)
  if (process.env.BSCSCAN_API_KEY) {
    networksToScan.push({
      network: "BSC",
      fetchFn: (params) => bscscanFetch(params),
    });
  }

  for (const { network, fetchFn } of networksToScan) {
    for (const depAddr of depositAddresses) {
      try {
        await scanAddressOnChain(network, fetchFn, depAddr);
        // Each address makes 2 API calls (tokentx + txlist).
        // Free plan limit = 5 req/sec. We wait 1000ms between addresses
        // to stay well under the rate limit (2 req/sec).
        await delay(1000);
      } catch (err) {
        logger.warn({ err, network, address: depAddr.address }, "Explorer scan error");
        await delay(2000); // extra back-off on error
      }
    }
    await delay(1000); // gap between networks
  }
}

// Track interval handle
let etherscanInterval: NodeJS.Timeout | null = null;

export function startEtherscanMonitor() {
  if (etherscanInterval) return;
  if (!process.env.ETHERSCAN_API_KEY) {
    logger.warn("ETHERSCAN_API_KEY not set — Etherscan deposit monitor disabled");
    return;
  }

  const hasBscScan = !!process.env.BSCSCAN_API_KEY;
  logger.info(
    { bscEnabled: hasBscScan },
    `Starting explorer deposit monitor (ETH + POLYGON${hasBscScan ? " + BSC" : " — BSC skipped (no BSCSCAN_API_KEY)"})`,
  );

  const run = async () => {
    try {
      await scanEtherscanNetworks();
    } catch (err) {
      logger.warn({ err }, "Explorer monitor cycle error");
    }
  };

  run();
  // Poll every 60s — explorer APIs return full history so we don't miss anything between polls
  etherscanInterval = setInterval(run, 60_000);
}

export function stopEtherscanMonitor() {
  if (etherscanInterval) {
    clearInterval(etherscanInterval);
    etherscanInterval = null;
  }
}

/** Called by admin force-rescan: clears the watermark so all history is re-scanned */
export function resetEtherscanScan(network?: string) {
  if (network) {
    // clear all keys for this network
    for (const key of Object.keys(lastProcessedBlock)) {
      if (key.startsWith(`${network}:`)) delete lastProcessedBlock[key];
    }
  } else {
    for (const key of Object.keys(lastProcessedBlock)) delete lastProcessedBlock[key];
  }
}
