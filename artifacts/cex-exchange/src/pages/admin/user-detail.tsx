import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserX, UserCheck, DollarSign, Key, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";

type UserDetail = {
  id: number;
  email: string;
  username: string;
  status: string;
  createdAt: string;
  depositAddress: string | null;
  balances: { asset: string; available: string; locked: string; network: string }[];
  orders: { id: number; pair: string; side: string; type: string; status: string; price: string | null; quantity: string; createdAt: string }[];
  trades: { id: number; pair: string; side: string; price: string; quantity: string; total: string; fee: string; feeAsset: string; createdAt: string }[];
  transactions: { id: number; type: string; asset: string; network: string; amount: string; txHash: string | null; status: string; createdAt: string }[];
};

type EscrowKey = { address: string; privateKey: string; warning: string };

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? res.statusText);
  return data;
}

export default function AdminUserDetail() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = parseInt(params?.id ?? "0");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [freezeDialog, setFreezeDialog] = useState(false);
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [escrowDialog, setEscrowDialog] = useState(false);
  const [sweepDialog, setSweepDialog] = useState(false);
  const [escrowKey, setEscrowKey] = useState<EscrowKey | null>(null);

  const [reason, setReason] = useState("");
  const [balanceAsset, setBalanceAsset] = useState("USDT");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [adminPwd, setAdminPwd] = useState("");
  const [sweepNetwork, setSweepNetwork] = useState("ETH");

  const { data: user, isLoading, refetch } = useQuery<UserDetail>({
    queryKey: ["admin-user", userId],
    queryFn: () => apiFetch(`/api/admin/users/${userId}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });

  const freezeMutation = useMutation({
    mutationFn: (freeze: boolean) =>
      apiFetch(`/api/admin/users/${userId}/${freeze ? "freeze" : "unfreeze"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, freeze) => {
      toast({ title: `Account ${freeze ? "frozen" : "unfrozen"}`, description: reason || "No reason provided" });
      setFreezeDialog(false);
      setReason("");
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const balanceMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/users/${userId}/balance-adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: balanceAsset, amount: balanceAmount, reason }),
      }),
    onSuccess: (data: { message: string }) => {
      toast({ title: "Balance adjusted", description: data.message });
      setBalanceDialog(false);
      setReason("");
      setBalanceAmount("");
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const escrowMutation = useMutation({
    mutationFn: () =>
      apiFetch<EscrowKey>(`/api/admin/users/${userId}/escrow-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: adminPwd, reason }),
      }),
    onSuccess: (key) => {
      setEscrowKey(key);
      setAdminPwd("");
      setReason("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sweepMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/users/${userId}/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: sweepNetwork, reason }),
      }),
    onSuccess: (data: { results: { asset: string; txHash?: string; amount?: string; error?: string }[] }) => {
      toast({ title: "Sweep completed", description: `${data.results.length} assets processed` });
      setSweepDialog(false);
      setReason("");
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Sweep failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading user...</div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-destructive">User not found</div>;

  const isFrozen = user.status === "frozen";

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <Badge variant={isFrozen ? "destructive" : "default"} className={!isFrozen ? "bg-green-600" : ""}>
              {isFrozen ? <><UserX className="w-3 h-3 mr-1" />Frozen</> : <><UserCheck className="w-3 h-3 mr-1" />Active</>}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user.email} · Joined {new Date(user.createdAt).toLocaleDateString()} · ID #{user.id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Admin Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={isFrozen ? "default" : "destructive"}
          className={!isFrozen ? "" : "bg-green-600 hover:bg-green-700"}
          onClick={() => setFreezeDialog(true)}
        >
          {isFrozen ? <><UserCheck className="w-4 h-4 mr-1" />Unfreeze Account</> : <><UserX className="w-4 h-4 mr-1" />Freeze Account</>}
        </Button>
        <Button variant="outline" onClick={() => setBalanceDialog(true)}>
          <DollarSign className="w-4 h-4 mr-1" /> Adjust Balance
        </Button>
        <Button variant="outline" onClick={() => { setEscrowKey(null); setEscrowDialog(true); }}>
          <Key className="w-4 h-4 mr-1" /> Escrow Key
        </Button>
        <Button variant="outline" onClick={() => setSweepDialog(true)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Sweep Funds
        </Button>
      </div>

      {/* Deposit address */}
      {user.depositAddress && (
        <div className="mb-4 p-3 bg-muted/50 border rounded-lg text-sm">
          <span className="text-muted-foreground mr-2">Deposit Address:</span>
          <span className="font-mono">{user.depositAddress}</span>
        </div>
      )}

      {/* Tabs: Balances / Orders / Trades / Transactions */}
      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Balances ({user.balances.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({user.orders.length})</TabsTrigger>
          <TabsTrigger value="trades">Trades ({user.trades.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({user.transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Locked</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.balances.map((b) => (
                    <TableRow key={b.asset}>
                      <TableCell className="font-semibold">{b.asset}</TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(b.available).toFixed(6)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{parseFloat(b.locked).toFixed(6)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{(parseFloat(b.available) + parseFloat(b.locked)).toFixed(6)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{o.id}</TableCell>
                      <TableCell className="font-semibold">{o.pair}</TableCell>
                      <TableCell>
                        <Badge variant={o.side === "buy" ? "default" : "secondary"} className={o.side === "buy" ? "bg-green-600" : ""}>
                          {o.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{o.type}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "filled" ? "default" : o.status === "cancelled" ? "secondary" : "outline"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(o.quantity).toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!user.orders.length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.trades.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold">{t.pair}</TableCell>
                      <TableCell>
                        <Badge variant={t.side === "buy" ? "default" : "secondary"} className={t.side === "buy" ? "bg-green-600" : ""}>
                          {t.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(t.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(t.quantity).toFixed(6)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{parseFloat(t.total).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{parseFloat(t.fee).toFixed(6)} {t.feeAsset}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!user.trades.length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No executed trades yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant={t.type === "deposit" ? "default" : "secondary"}>
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{t.asset}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{t.network}</TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(t.amount).toFixed(6)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "confirmed" ? "default" : t.status === "failed" ? "destructive" : "outline"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.txHash ? (
                          <a href={`https://etherscan.io/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs">
                            <ExternalLink className="w-3 h-3" />{t.txHash.slice(0, 8)}...
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!user.transactions.length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Freeze / Unfreeze Dialog ── */}
      <Dialog open={freezeDialog} onOpenChange={setFreezeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isFrozen ? "Unfreeze Account" : "Freeze Account"}</DialogTitle>
            <DialogDescription>
              {isFrozen
                ? `Restore access for ${user.username}. They will be able to log in and trade again.`
                : `Suspend ${user.username}'s account. They will not be able to log in, trade, or withdraw.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!isFrozen && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This action blocks all user activity. Logged and auditable.
              </div>
            )}
            <Input placeholder="Reason (e.g. AML review, user request)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialog(false)}>Cancel</Button>
            <Button
              variant={isFrozen ? "default" : "destructive"}
              className={!isFrozen ? "" : "bg-green-600 hover:bg-green-700"}
              onClick={() => freezeMutation.mutate(!isFrozen)}
              disabled={freezeMutation.isPending}
            >
              {freezeMutation.isPending ? "Processing..." : isFrozen ? "Unfreeze" : "Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Balance Adjustment Dialog ── */}
      <Dialog open={balanceDialog} onOpenChange={setBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>Credit (positive) or debit (negative) from {user.username}'s account. Action is audited.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Asset</label>
              <Input value={balanceAsset} onChange={(e) => setBalanceAsset(e.target.value.toUpperCase())} placeholder="USDT, BTC, ETH..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (+ credit / - debit)</label>
              <Input type="number" step="0.00000001" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="e.g. 100 or -50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (required)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Deposit correction, bonus credit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(false)}>Cancel</Button>
            <Button onClick={() => balanceMutation.mutate()} disabled={balanceMutation.isPending || !reason || !balanceAmount}>
              {balanceMutation.isPending ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Escrow Key Dialog ── */}
      <Dialog open={escrowDialog} onOpenChange={(open) => { setEscrowDialog(open); if (!open) setEscrowKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-yellow-400" /> Escrow Key Access</DialogTitle>
            <DialogDescription>
              Reveals the private key for {user.username}'s deposit address ({user.depositAddress?.slice(0, 10)}...). This action is permanently logged.
            </DialogDescription>
          </DialogHeader>
          {!escrowKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Highly sensitive. Only use for escrow recovery. All access is audited.
              </div>
              <Input
                type="password"
                placeholder="Admin password (re-authentication)"
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
              />
              <Input placeholder="Reason for access" value={reason} onChange={(e) => setReason(e.target.value)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEscrowDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => escrowMutation.mutate()} disabled={escrowMutation.isPending || !adminPwd}>
                  {escrowMutation.isPending ? "Verifying..." : "Reveal Private Key"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <p className="font-mono text-sm bg-muted p-2 rounded">{escrowKey.address}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Private Key</label>
                <p className="font-mono text-xs bg-destructive/10 border border-destructive/20 p-3 rounded break-all text-destructive">{escrowKey.privateKey}</p>
              </div>
              <p className="text-xs text-yellow-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{escrowKey.warning}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEscrowDialog(false); setEscrowKey(null); }}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Sweep Dialog ── */}
      <Dialog open={sweepDialog} onOpenChange={setSweepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sweep Deposit Funds</DialogTitle>
            <DialogDescription>
              Move all funds from {user.username}'s deposit address to the hot wallet. Choose which network to sweep.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Network</label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={sweepNetwork}
                onChange={(e) => setSweepNetwork(e.target.value)}
              >
                <option value="ETH">Ethereum (ERC20)</option>
                <option value="BSC">BNB Smart Chain (BEP20)</option>
                <option value="POLYGON">Polygon</option>
              </select>
            </div>
            <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSweepDialog(false)}>Cancel</Button>
            <Button onClick={() => sweepMutation.mutate()} disabled={sweepMutation.isPending}>
              {sweepMutation.isPending ? "Sweeping..." : "Sweep Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
