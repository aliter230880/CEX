import { ethers } from "ethers";

// Public RPC providers - multiple URLs per network for fallback
// BSC: avoid ankr as primary — it rate-limits eth_getLogs in batch mode
const RPC_URLS: Record<string, string[]> = {
  ETH: [
    "https://rpc.ankr.com/eth",
    "https://eth.llamarpc.com",
    "https://cloudflare-eth.com",
    "https://ethereum.publicnode.com",
  ],
  BSC: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc.publicnode.com",
    "https://bsc-dataseed2.binance.org",
    "https://rpc.ankr.com/bsc",
  ],
  POLYGON: [
    "https://polygon-mainnet.public.blastapi.io",
    "https://polygon.llamarpc.com",
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon",
    "https://polygon.publicnode.com",
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
  POLYGON: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
};

// USDC decimals differ per network
export const USDC_DECIMALS: Record<string, number> = {
  ETH: 6,
  BSC: 18,
  POLYGON: 6,
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

// Track active provider and its index per network
const activeProviders: Record<string, ethers.JsonRpcProvider> = {};
const activeProviderIndex: Record<string, number> = {};

export function getProvider(network: string): ethers.JsonRpcProvider {
  if (activeProviders[network]) return activeProviders[network];
  const urls = RPC_URLS[network];
  if (!urls || urls.length === 0) throw new Error(`Unsupported network: ${network}`);
  activeProviderIndex[network] = 0;
  const provider = new ethers.JsonRpcProvider(urls[0], undefined, { polling: false });
  activeProviders[network] = provider;
  return provider;
}

export function rotateProvider(network: string): ethers.JsonRpcProvider {
  const urls = RPC_URLS[network];
  if (!urls) throw new Error(`Unsupported network: ${network}`);
  const currentIndex = activeProviderIndex[network] ?? 0;
  const nextIndex = (currentIndex + 1) % urls.length;
  activeProviderIndex[network] = nextIndex;
  const provider = new ethers.JsonRpcProvider(urls[nextIndex], undefined, { polling: false });
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
): Promise<string> {
  const provider = getProvider(network);
  const hotWallet = getHotWallet().connect(provider);
  const tx = await hotWallet.sendTransaction({ to: toAddress, value: amountWei });
  return tx.hash;
}

export async function sendERC20(
  toAddress: string,
  network: string,
  tokenAddress: string,
  amount: bigint,
): Promise<string> {
  const provider = getProvider(network);
  const hotWallet = getHotWallet().connect(provider);
  const contract = new ethers.Contract(
    tokenAddress,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    hotWallet,
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

export function getAssetConfig(asset: string, network: string): { isNative: boolean; contractAddress?: string; decimals: number } {
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
  throw new Error(`Asset ${asset} not supported on network ${network}`);
}

export const SUPPORTED_DEPOSIT_ASSETS: Record<string, string[]> = {
  ETH: ["ETH", "USDT", "USDC"],
  BSC: ["BNB", "USDT", "USDC"],
  POLYGON: ["POL", "USDT", "USDC"],
};
