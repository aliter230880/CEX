import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin-auth";
import { Users, UserX, Activity, LogOut, Shield, ArrowRight, Clock } from "lucide-react";

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

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/api/admin/stats"),
    refetchInterval: 30000,
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
            <h1 className="text-2xl font-bold">NexEx Admin Panel</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/users">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> User Management</div>
                    <p className="text-sm text-muted-foreground">View, freeze/unfreeze accounts, adjust balances, access escrow keys</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/audit-log">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-2"><Activity className="w-4 h-4" /> Audit Log</div>
                    <p className="text-sm text-muted-foreground">Full history of all admin actions for compliance and accountability</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
