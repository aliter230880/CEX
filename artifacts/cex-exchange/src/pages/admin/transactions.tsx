import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle } from "lucide-react";

interface Transaction {
  id: number; userId: number; userEmail: string; username: string;
  type: string; asset: string; network: string; amount: string;
  txHash: string | null; status: string; fromAddress: string | null;
  toAddress: string | null; confirmations: number; createdAt: string;
}

interface TxResponse {
  transactions: Transaction[];
  pagination: { page: number; total: number; totalPages: number };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  return res.json();
}

const STATUS_ICON: Record<string, JSX.Element> = {
  confirmed: <CheckCircle className="w-3 h-3 text-emerald-400" />,
  pending: <Clock className="w-3 h-3 text-yellow-400" />,
  failed: <XCircle className="w-3 h-3 text-destructive" />,
};
const STATUS_COLOR: Record<string, string> = {
  confirmed: "text-emerald-400", pending: "text-yellow-400", failed: "text-destructive",
};

export default function AdminTransactions() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: "", status: "", asset: "" });

  const params = new URLSearchParams({ page: String(page), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });

  const { data, isLoading, refetch, isFetching } = useQuery<TxResponse>({
    queryKey: ["admin-transactions", page, filters],
    queryFn: () => apiFetch(`/api/admin/transactions?${params}`),
    refetchInterval: 15000,
  });

  const filterSelect = (key: string, opts: string[], label: string) => (
    <select
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      value={(filters as any)[key]}
      onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1); }}
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
    </select>
  );

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Transaction Monitoring</h1>
          <div className="ml-auto flex gap-2 flex-wrap">
            {filterSelect("type", ["deposit", "withdrawal"], "All Types")}
            {filterSelect("status", ["pending", "confirmed", "failed"], "All Statuses")}
            {filterSelect("asset", ["BTC", "ETH", "BNB", "USDT", "POL", "SOL"], "All Assets")}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
          <span>{data?.pagination.total ?? 0} transactions</span>
          <span>· Auto-refreshes every 15s</span>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>{["ID","User","Type","Asset","Amount","Status","Tx Hash","Address","Time"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.transactions.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
                ) : data?.transactions.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">#{tx.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${tx.userId}`}>
                        <span className="text-primary hover:underline cursor-pointer">{tx.username}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-medium ${tx.type === "deposit" ? "text-emerald-400" : "text-orange-400"}`}>
                        {tx.type === "deposit" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{tx.asset}</span>
                      <span className="text-xs text-muted-foreground ml-1">{tx.network}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{parseFloat(tx.amount).toFixed(6)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[tx.status] ?? ""}`}>
                        {STATUS_ICON[tx.status]}
                        {tx.status}
                        {tx.status === "pending" && tx.confirmations > 0 && <span className="text-muted-foreground">({tx.confirmations})</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {tx.txHash ? (
                        <span title={tx.txHash}>{tx.txHash.slice(0,8)}...{tx.txHash.slice(-6)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {(tx.toAddress ?? tx.fromAddress) ? `${(tx.toAddress ?? tx.fromAddress)!.slice(0,8)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
