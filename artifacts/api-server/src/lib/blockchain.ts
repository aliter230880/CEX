import { ethers } from "ethers";

// Public RPC providers (no API key needed)
const RPC_URLS: Record<string, string> = {
  ETH: "https://eth.llamarpc.com",
  BSC: "https://bsc-dataseed.binance.org",
  POLYGON: "https://polygon-rpc.com",
};

// USDT contract addresses per network
export const USDT_CONTRACTS: Record<string, string> = {
  ETH: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  BSC: "0x55d398326f99059fF775485246999027B3197955",
  POLYGON: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
};

// Native coin per network
export const NATIVE_ASSET: Record<string, string> = {
  ETH: "ETH",
  BSC: "BNB",
  POLYGON: "POL",
};

// Minimal ERC20 ABI for balance checking and Transfer events
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

const providers: Record<string, ethers.JsonRpcProvider> = {};

export function getProvider(network: string): ethers.JsonRpcProvider {
  if (!providers[network]) {
    const url = RPC_URLS[network];
    if (!url) throw new Error(`Unsupported network: ${network}`);
    providers[network] = new ethers.JsonRpcProvider(url);
  }
  return providers[network];
}

export function getHDWallet(userId: number): ethers.HDNodeWallet {
  const mnemonic = process.env.WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("WALLET_MNEMONIC is not set");
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic);
  // Same EVM address works on ETH, BSC, Polygon
  return root.deriveChild(userId);
}

export function generateDepositAddress(userId: number): string {
  return getHDWallet(userId).address;
}

export function getHotWallet(): ethers.Wallet {
  const privateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error("HOT_WALLET_PRIVATE_KEY is not set");
  return new ethers.Wallet(privateKey);
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
  throw new Error(`Asset ${asset} not supported on network ${network}`);
}

export const SUPPORTED_DEPOSIT_ASSETS: Record<string, string[]> = {
  ETH: ["ETH", "USDT"],
  BSC: ["BNB", "USDT"],
  POLYGON: ["POL", "USDT"],
};
