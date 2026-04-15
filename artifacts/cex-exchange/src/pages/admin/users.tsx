import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, UserX, UserCheck, ExternalLink } from "lucide-react";

type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: string;
  createdAt: string;
  balances: { asset: string; available: string; locked: string }[];
};

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ["admin-users", search],
    queryFn: () => apiFetch(`/api/admin/users?search=${encodeURIComponent(search)}`),
    refetchInterval: 30000,
  });

  const usdtBalance = (user: AdminUser) => {
    const b = user.balances.find((b) => b.asset === "USDT");
    return b ? parseFloat(b.available) + parseFloat(b.locked) : 0;
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Click on a user to manage their account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>All Users</CardTitle>
            <span className="text-sm text-muted-foreground">({users?.length ?? 0} total)</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by email or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">USDT Balance</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="text-muted-foreground font-mono text-xs">#{user.id}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{user.username}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      {user.status === "frozen" ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <UserX className="w-3 h-3" /> Frozen
                        </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1 w-fit bg-green-600">
                          <UserCheck className="w-3 h-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {usdtBalance(user).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.balances.map((b) => (
                          <Badge key={b.asset} variant="outline" className="text-xs">{b.asset}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {!users?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
