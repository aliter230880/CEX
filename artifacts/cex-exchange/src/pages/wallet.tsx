import { useGetBalances, getGetBalancesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, RefreshCw, Clock, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

const NETWORK_LABELS: Record<string, string> = {
  ETH: "Ethereum (ERC20)",
  BSC: "BNB Smart Chain (BEP20)",
  POLYGON: "Polygon",
};

const NETWORK_EXPLORERS: Record<string, string> = {
  ETH: "https://etherscan.io/tx/",
  BSC: "https://bscscan.com/tx/",
  POLYGON: "https://polygonscan.com/tx/",
};

const ASSET_ICONS: Record<string, string> = {
  ETH: "⟠",
  BNB: "◈",
  POL: "◆",
  USDT: "₮",
  BTC: "₿",
};

const withdrawSchema = z.object({
  asset: z.string().min(1),
  network: z.string().min(1),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive"),
  toAddress: z.string().min(10, "Valid address required"),
});

type CryptoTx = {
  id: number;
  type: "deposit" | "withdrawal";
  asset: string;
  network: string;
  amount: string;
  txHash: string | null;
  status: "pending" | "confirmed" | "failed";
  fromAddress: string | null;
  toAddress: string | null;
  confirmations: number;
  createdAt: string;
};

type DepositAddressResponse = {
  address: string;
  network: string;
  assets: string[];
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export default function Wallet() {
  const { user } = useAuth();
  const { data: balances } = useGetBalances();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [depositNetwork, setDepositNetwork] = useState("ETH");
  const [withdrawNetwork, setWithdrawNetwork] = useState("ETH");
  const [copied, setCopied] = useState(false);

  // Fetch all supported assets per network (includes custom tokens)
  const { data: supportedAssets } = useQuery<Record<string, string[]>>({
    queryKey: ["supported-assets"],
    queryFn: () => apiFetch<Record<string, string[]>>("/api/wallet/supported-assets"),
    staleTime: 60_000,
  });

  const { data: depositInfo, isLoading: depositLoading, error: depositError } = useQuery<DepositAddressResponse>({
    queryKey: ["deposit-address", depositNetwork],
    queryFn: () => apiFetch<DepositAddressResponse>(`/api/wallet/deposit-address/${depositNetwork}`),
    enabled: !!user,
    retry: false,
  });

  const { data: transactions, refetch: refetchTx, isLoading: txLoading } = useQuery<CryptoTx[]>({
    queryKey: ["wallet-transactions"],
    queryFn: () => apiFetch<CryptoTx[]>("/api/wallet/transactions"),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { asset: "ETH", network: "ETH", amount: "", toAddress: "" },
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: z.infer<typeof withdrawSchema>) =>
      apiFetch<{ success: boolean; txHash: string }>("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      toast({
        title: "Withdrawal submitted",
        description: `Transaction sent. Hash: ${res.txHash?.slice(0, 10)}...`,
      });
      queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      withdrawForm.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    },
  });

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Address copied to clipboard" });
  };

  const totalValue = balances?.reduce((acc, b) => acc + Number(b.available) + Number(b.locked), 0) || 0;

  const availableAssets = supportedAssets?.[withdrawNetwork] ?? [];

  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold">Sign in to access your wallet</h2>
        <p className="text-muted-foreground">You need to be logged in to deposit, withdraw, and manage your funds.</p>
        <div className="flex gap-3">
          <Link href="/login"><Button variant="outline">Login</Button></Link>
          <Link href="/register"><Button>Register</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your crypto assets — deposit, withdraw, and track transactions</p>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Total Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono text-primary">
              {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Transactions</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="text-3xl font-bold">{transactions?.length ?? 0}</div>
            <Button variant="ghost" size="icon" onClick={() => refetchTx()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Asset Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Locked (Orders)</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances?.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ASSET_ICONS[balance.asset] ?? "●"}</span>
                      <span className="font-bold">{balance.asset}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(balance.available).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {Number(balance.locked).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {(Number(balance.available) + Number(balance.locked)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </TableCell>
                </TableRow>
              ))}
              {!balances?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No balances yet. Make a deposit to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfers + History */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="deposit">
                <TabsList className="grid w-full grid-cols-2 mb-5">
                  <TabsTrigger value="deposit">
                    <ArrowDownLeft className="w-4 h-4 mr-1" /> Deposit
                  </TabsTrigger>
                  <TabsTrigger value="withdraw">
                    <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
                  </TabsTrigger>
                </TabsList>

                {/* ── DEPOSIT ── */}
                <TabsContent value="deposit" className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Network</label>
                    <Select value={depositNetwork} onValueChange={setDepositNetwork}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                        <SelectItem value="BSC">BNB Smart Chain (BEP20)</SelectItem>
                        <SelectItem value="POLYGON">Polygon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {depositLoading && (
                    <div className="text-center py-6 text-muted-foreground text-sm">Loading deposit address...</div>
                  )}

                  {depositError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
                      {(depositError as Error).message.includes("wallet_not_configured")
                        ? "Exchange wallet not yet configured. Please contact support."
                        : (depositError as Error).message}
                    </div>
                  )}

                  {depositInfo && (
                    <>
                      {/* QR Code */}
                      <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-xl">
                          <QRCodeSVG value={depositInfo.address} size={160} />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="text-sm font-medium mb-2 block text-muted-foreground">Your deposit address</label>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border">
                          <span className="font-mono text-xs flex-1 break-all select-all">
                            {depositInfo.address}
                          </span>
                          <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => copyAddress(depositInfo.address)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {copied && <p className="text-xs text-green-400 mt-1">Copied!</p>}
                      </div>

                      {/* Supported assets */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Supported assets on {NETWORK_LABELS[depositNetwork]}:</p>
                        <div className="flex gap-2 flex-wrap">
                          {depositInfo.assets.map((a) => (
                            <Badge key={a} variant="secondary">{ASSET_ICONS[a]} {a}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                        ⚠️ Only send {depositInfo.assets.join(" or ")} on the {NETWORK_LABELS[depositNetwork]} network to this address. Sending other assets may result in permanent loss.
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ── WITHDRAW ── */}
                <TabsContent value="withdraw" className="space-y-4">
                  <Form {...withdrawForm}>
                    <form onSubmit={withdrawForm.handleSubmit((d) => withdrawMutation.mutate(d))} className="space-y-4">
                      <FormField
                        control={withdrawForm.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Network</FormLabel>
                            <Select
                              onValueChange={(v) => {
                                field.onChange(v);
                                setWithdrawNetwork(v);
                                withdrawForm.setValue("asset", (supportedAssets?.[v] ?? [])[0] ?? "");
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                                <SelectItem value="BSC">BNB Smart Chain (BEP20)</SelectItem>
                                <SelectItem value="POLYGON">Polygon</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="asset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {availableAssets.map((a) => (
                                  <SelectItem key={a} value={a}>{ASSET_ICONS[a]} {a}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="toAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination Address</FormLabel>
                            <FormControl>
                              <Input placeholder="0x..." className="font-mono text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input placeholder="0.00" type="number" step="0.000001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={withdrawMutation.isPending}>
                        {withdrawMutation.isPending ? "Sending..." : "Withdraw"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchTx()}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {txLoading && (
                <p className="text-center py-8 text-muted-foreground text-sm">Loading transactions...</p>
              )}
              {!txLoading && !transactions?.length && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3">📭</div>
                  <p>No transactions yet.</p>
                  <p className="text-sm mt-1">Deposits and withdrawals will appear here.</p>
                </div>
              )}
              <div className="space-y-3">
                {transactions?.map((tx) => (
                  <div key={tx.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 p-1.5 rounded-full ${tx.type === "deposit" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {tx.type === "deposit"
                        ? <ArrowDownLeft className="w-4 h-4" />
                        : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold capitalize">{tx.type}</span>
                        <Badge variant="outline" className="text-xs">{tx.asset}</Badge>
                        <Badge variant="outline" className="text-xs">{tx.network}</Badge>
                        <StatusBadge status={tx.status} confirmations={tx.confirmations} />
                      </div>
                      <div className="font-mono font-bold text-lg">
                        {tx.type === "deposit" ? "+" : "-"}{Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.asset}
                      </div>
                      {(tx.toAddress || tx.fromAddress) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {tx.type === "deposit" ? `From: ${tx.fromAddress ?? "Unknown"}` : `To: ${tx.toAddress}`}
                        </p>
                      )}
                      {tx.txHash && (
                        <a
                          href={`${NETWORK_EXPLORERS[tx.network] ?? ""}${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, confirmations }: { status: string; confirmations: number }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="w-3 h-3" /> Confirmed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
      <Clock className="w-3 h-3" /> Pending ({confirmations} conf.)
    </span>
  );
}
