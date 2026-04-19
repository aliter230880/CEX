import { ethers } from "ethers";

// Public RPC providers - multiple URLs per network for fallback
// BSC: avoid ankr as primary — it rate-limits eth_getLogs in batch mode
const RPC_URLS: Record<string, string[]> = {
  ETH: [
    "https://ethereum.publicnode.com",
    "https://eth.llamarpc.com",
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
  ],
  BSC: [
    "https://bsc.publicnode.com",
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
  ],
  POLYGON: [
    "https://polygon.publicnode.com",
    "https://1rpc.io/matic",
  ],
};

// USDT contract addresses per network
export const USDT_CONTRACTS: Record<string, string> = {
  ETH: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  BSC: "0x55d398326f99059fF775485246999027B3197955",
  POLYGON: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
};

// USDC contract addresses per network
export const USDC_CONTRACTS: Record<string, string> = {
  ETH: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  BSC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  // Bridged USDC.e on Polygon (most liquid, user-specified)
  POLYGON: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
};

// USDC decimals differ per network
export const USDC_DECIMALS: Record<string, number> = {
  ETH: 6,
  BSC: 18,
  POLYGON: 6,
};

// Additional Polygon ERC-20 tokens (all on Polygon mainnet)
export const POLYGON_EXTRA_TOKENS: Record<string, { contractAddress: string; decimals: number }> = {
  WETH: { contractAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  WBTC: { contractAddress: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
  UNI:  { contractAddress: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", decimals: 18 },
  LINK: { contractAddress: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
  SAND: { contractAddress: "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683", decimals: 18 },
};

// Native coin per network
export const NATIVE_ASSET: Record<string, string> = {
  ETH: "ETH",
  BSC: "BNB",
  POLYGON: "POL",
};

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const REQUIRED_CONFIRMATIONS: Record<string, number> = {
  ETH: 12,
  BSC: 15,
  POLYGON: 30,
};

export function getRequiredConfirmations(network: string): number {
  return REQUIRED_CONFIRMATIONS[network] ?? 12;
}

// Explicit chain IDs — prevents auto-detection RPC call on provider creation
const CHAIN_IDS: Record<string, number> = {
  ETH:     1,
  BSC:    56,
  POLYGON: 137,
};

// Track active provider and its index per network
const activeProviders: Record<string, ethers.JsonRpcProvider> = {};
const activeProviderIndex: Record<string, number> = {};

function makeProvider(url: string, network: string): ethers.JsonRpcProvider {
  const chainId = CHAIN_IDS[network];
  const staticNet = chainId ? ethers.Network.from(chainId) : undefined;
  return new ethers.JsonRpcProvider(url, staticNet, {
    polling: false,
    batchMaxCount: 1,   // disable JSON-RPC batching — prevents "eth_getLogs in batch" rate limits
  });
}

export function getProvider(network: string): ethers.JsonRpcProvider {
  if (activeProviders[network]) return activeProviders[network];
  const urls = RPC_URLS[network];
  if (!urls || urls.length === 0) throw new Error(`Unsupported network: ${network}`);
  activeProviderIndex[network] = 0;
  const provider = makeProvider(urls[0], network);
  activeProviders[network] = provider;
  return provider;
}

export function rotateProvider(network: string): ethers.JsonRpcProvider {
  const urls = RPC_URLS[network];
  if (!urls) throw new Error(`Unsupported network: ${network}`);
  const currentIndex = activeProviderIndex[network] ?? 0;
  const nextIndex = (currentIndex + 1) % urls.length;
  activeProviderIndex[network] = nextIndex;
  const provider = makeProvider(urls[nextIndex], network);
  activeProviders[network] = provider;
  return provider;
}

export function getHDWallet(userId: number): ethers.HDNodeWallet {
  const mnemonic = process.env.WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("WALLET_MNEMONIC is not set");
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic);
  return root.deriveChild(userId);
}

export function generateDepositAddress(userId: number): string {
  return getHDWallet(userId).address;
}

export function getHotWallet(): ethers.Wallet {
  const privateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error("HOT_WALLET_PRIVATE_KEY is not set");
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return new ethers.Wallet(pk);
}

export async function getNativeBalance(address: string, network: string): Promise<bigint> {
  const provider = getProvider(network);
  return await provider.getBalance(address);
}

export async function getERC20Balance(address: string, network: string, tokenAddress: string): Promise<{ balance: bigint; decimals: number }> {
  const provider = getProvider(network);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [balance, decimals] = await Promise.all([
    contract.balanceOf(address) as Promise<bigint>,
    contract.decimals() as Promise<bigint>,
  ]);
  return { balance, decimals: Number(decimals) };
}

export async function sendNative(
  toAddress: string,
  network: string,
  amountWei: bigint,
  senderWallet?: ethers.HDNodeWallet | ethers.Wallet,
): Promise<string> {
  const provider = getProvider(network);
  const wallet = (senderWallet ?? getHotWallet()).connect(provider);
  const tx = await wallet.sendTransaction({ to: toAddress, value: amountWei });
  return tx.hash;
}

export async function sendERC20(
  toAddress: string,
  network: string,
  tokenAddress: string,
  amount: bigint,
  senderWallet?: ethers.HDNodeWallet | ethers.Wallet,
): Promise<string> {
  const provider = getProvider(network);
  const wallet = (senderWallet ?? getHotWallet()).connect(provider);
  const contract = new ethers.Contract(
    tokenAddress,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    wallet,
  );
  const tx = await (contract.transfer as (to: string, amount: bigint) => Promise<ethers.TransactionResponse>)(toAddress, amount);
  return tx.hash;
}

export function parseAmount(amount: string, decimals: number): bigint {
  return ethers.parseUnits(amount, decimals);
}

export function formatAmount(raw: bigint, decimals: number): string {
  return ethers.formatUnits(raw, decimals);
}

export function isValidEVMAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function getAssetConfig(
  asset: string,
  network: string,
): { isNative: boolean; contractAddress?: string; decimals: number } {
  const native = NATIVE_ASSET[network];
  if (asset === native) {
    return { isNative: true, decimals: 18 };
  }
  if (asset === "USDT") {
    const contractAddress = USDT_CONTRACTS[network];
    if (!contractAddress) throw new Error(`USDT not supported on network ${network}`);
    return { isNative: false, contractAddress, decimals: 6 };
  }
  if (asset === "USDC") {
    const contractAddress = USDC_CONTRACTS[network];
    if (!contractAddress) throw new Error(`USDC not supported on network ${network}`);
    return { isNative: false, contractAddress, decimals: USDC_DECIMALS[network] ?? 6 };
  }
  // Extra Polygon tokens (WETH, WBTC, UNI, LINK, SAND)
  if (network === "POLYGON") {
    const extra = POLYGON_EXTRA_TOKENS[asset];
    if (extra) {
      return { isNative: false, contractAddress: extra.contractAddress, decimals: extra.decimals };
    }
  }
  throw new Error(`Asset ${asset} not supported on network ${network}`);
}

export const SUPPORTED_DEPOSIT_ASSETS: Record<string, string[]> = {
  ETH: ["ETH", "USDT", "USDC"],
  BSC: ["BNB", "USDT", "USDC"],
  POLYGON: ["POL", "USDT", "USDC", "WETH", "WBTC", "UNI", "LINK", "SAND"],
};
