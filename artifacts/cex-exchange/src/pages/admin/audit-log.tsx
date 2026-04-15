import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

type AuditEntry = {
  id: number;
  action: string;
  targetUserId: number | null;
  details: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
};

type AuditLogResponse = {
  logs: AuditEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const ACTION_BADGES: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  freeze: { label: "Freeze", variant: "destructive" },
  unfreeze: { label: "Unfreeze", variant: "default" },
  balance_adjustment: { label: "Balance Adj.", variant: "secondary" },
  escrow_key_reveal: { label: "Escrow Key", variant: "destructive" },
  sweep: { label: "Sweep", variant: "secondary" },
};

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AuditLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery<AuditLogResponse>({
    queryKey: ["admin-audit-log", page],
    queryFn: () => apiFetch(`/api/admin/audit-log?page=${page}`),
    refetchInterval: 30000,
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Admin Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Immutable record of all administrative actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Actions</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} total entries` : "Loading..."} — newest first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-center py-12 text-muted-foreground">Loading audit log...</div>}
          <div className="space-y-3">
            {logs.map((entry) => {
              const badge = ACTION_BADGES[entry.action] ?? { label: entry.action, variant: "outline" as const };
              return (
                <div key={entry.id} className="border border-border/50 rounded-lg p-4 space-y-2 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {entry.targetUserId && (
                        <Link href={`/admin/users/${entry.targetUserId}`}>
                          <span className="text-primary text-sm hover:underline cursor-pointer">User #{entry.targetUserId}</span>
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason:</span> {entry.reason}
                    </p>
                  )}
                  {entry.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary>
                      <pre className="mt-1 bg-muted rounded p-2 overflow-x-auto text-xs">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
            {!isLoading && !logs.length && (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No admin actions recorded yet.</p>
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
