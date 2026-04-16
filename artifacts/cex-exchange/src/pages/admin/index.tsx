import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin-auth";
import { Users, UserX, Activity, LogOut, Shield, ArrowRight, Clock, TrendingUp, Coins, Percent, Gift, ArrowDownCircle, AlertTriangle, RefreshCw } from "lucide-react";

type Stats = {
  totalUsers: number;
  frozenUsers: number;
  activeUsers: number;
  balanceByAsset: Record<string, number>;
  recentTransactions: {
    id: number;
    type: string;
    asset: string;
    network: string;
    amount: string;
    status: string;
    createdAt: string;
  }[];
};

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [rescanDone, setRescanDone] = useState(false);

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/api/admin/stats"),
    refetchInterval: 30000,
  });

  const rescanMutation = useMutation({
    mutationFn: () => fetch("/api/admin/force-rescan", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => r.json()),
    onSuccess: () => setRescanDone(true),
  });

  const resetMutation = useMutation({
    mutationFn: () => fetch("/api/admin/reset-test-balances", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "RESET" }),
    }).then(r => r.json()),
    onSuccess: () => { setResetConfirm(false); setResetDone(true); },
  });

  const topAssets = stats
    ? Object.entries(stats.balanceByAsset).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : [];

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">ATEX Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Exchange control & escrow management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Users</Button>
          </Link>
          <Link href="/admin/audit-log">
            <Button variant="outline" size="sm"><Activity className="w-4 h-4 mr-1" /> Audit Log</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1"><Users className="w-4 h-4" /> Total Users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats?.totalUsers ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-green-400"><Activity className="w-4 h-4" /> Active Users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-400">{stats?.activeUsers ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-red-400"><UserX className="w-4 h-4" /> Frozen Accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-red-400">{stats?.frozenUsers ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Balance by Asset */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Balance Distribution</CardTitle>
                <CardDescription>Total platform-wide holdings per asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topAssets.map(([asset, total]) => (
                    <div key={asset} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <span className="font-semibold">{asset}</span>
                      <span className="font-mono text-sm">{total.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    </div>
                  ))}
                  {topAssets.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No balances recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Crypto Transactions</CardTitle>
                <CardDescription>Last 10 deposit/withdrawal events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm p-2 rounded border border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.type === "deposit" ? "default" : "secondary"} className="text-xs">
                          {tx.type}
                        </Badge>
                        <span>{tx.amount} {tx.asset}</span>
                        <span className="text-muted-foreground text-xs">{tx.network}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "outline"} className="text-xs">
                          {tx.status}
                        </Badge>
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!stats?.recentTransactions.length && (
                    <p className="text-muted-foreground text-sm text-center py-4">No transactions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {[
              { href: "/admin/users", icon: <Users className="w-4 h-4" />, title: "User Management", desc: "View, freeze/unfreeze accounts, adjust balances, access escrow keys" },
              { href: "/admin/transactions", icon: <ArrowDownCircle className="w-4 h-4 text-emerald-400" />, title: "Transaction Monitor", desc: "Real-time deposit & withdrawal monitoring with filters" },
              { href: "/admin/trading-pairs", icon: <TrendingUp className="w-4 h-4 text-blue-400" />, title: "Trading Pairs", desc: "Add new pairs, enable or disable existing ones" },
              { href: "/admin/tokens", icon: <Coins className="w-4 h-4 text-yellow-400" />, title: "Token Listing", desc: "List custom ERC-20/BEP-20 tokens, delist if needed" },
              { href: "/admin/fees", icon: <Percent className="w-4 h-4 text-orange-400" />, title: "Fee Configuration", desc: "Set maker/taker trading fees and withdrawal fees per asset" },
              { href: "/admin/referrals", icon: <Gift className="w-4 h-4 text-purple-400" />, title: "Referral Program", desc: "Enable referrals, set reward type and value" },
              { href: "/admin/audit-log", icon: <Activity className="w-4 h-4" />, title: "Audit Log", desc: "Full history of all admin actions for compliance" },
            ].map(({ href, icon, title, desc }) => (
              <Link key={href} href={href}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <div className="font-semibold mb-1 flex items-center gap-2">{icon} {title}</div>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Maintenance */}
          <Card className="border-blue-500/30 bg-blue-500/5 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-400 text-base">
                <RefreshCw className="w-4 h-4" /> Deposit Scanner Maintenance
              </CardTitle>
              <CardDescription>Force a historical blockchain re-scan to credit missed deposits (ERC-20 tokens, custom tokens). Scanner will look back up to 4 days on Polygon, 1.7 days on BSC, 17 hours on ETH.</CardDescription>
            </CardHeader>
            <CardContent>
              {rescanDone && (
                <div className="text-blue-400 text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-3">
                  Re-scan triggered. The scanner will process historical blocks over the next 20–30 minutes and credit any missed deposits automatically.
                </div>
              )}
              <div className="flex items-center justify-between p-3 border border-blue-500/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Force Rescan All Networks</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Resets scan head for ETH, BSC, Polygon — picks up any transfers missed since last server restart.</p>
                </div>
                <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 ml-4 flex-shrink-0"
                  onClick={() => rescanMutation.mutate()} disabled={rescanMutation.isPending}>
                  {rescanMutation.isPending ? (
                    <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Resetting...</>
                  ) : (
                    <><RefreshCw className="w-3 h-3 mr-1" /> Force Rescan</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-400 text-base">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions. Use with caution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resetDone && (
                <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  All user balances have been reset to 0.
                </div>
              )}
              <div className="flex items-center justify-between p-3 border border-red-500/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Reset all user balances to 0</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Use once to clear test/demo balances. Real balances from deposits will not be affected going forward.</p>
                </div>
                {!resetConfirm ? (
                  <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 ml-4 flex-shrink-0"
                    onClick={() => setResetConfirm(true)}>
                    Reset Balances
                  </Button>
                ) : (
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button size="sm" variant="destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                      {resetMutation.isPending ? "Resetting..." : "Confirm Reset"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
