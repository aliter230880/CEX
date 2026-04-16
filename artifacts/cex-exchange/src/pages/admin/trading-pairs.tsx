import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface TradingPair {
  id: number; symbol: string; baseAsset: string; quoteAsset: string;
  network: string; status: string; minOrderSize: string; createdAt: string;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export default function AdminTradingPairs() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ symbol: "", baseAsset: "", quoteAsset: "", network: "ETH" });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ pairs: TradingPair[] }>({
    queryKey: ["admin-trading-pairs"],
    queryFn: () => apiFetch("/api/admin/trading-pairs"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/trading-pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-trading-pairs"] }); setForm({ symbol: "", baseAsset: "", quoteAsset: "", network: "ETH" }); setShowForm(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/admin/trading-pairs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-trading-pairs"] }),
  });

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Trading Pairs</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" />Add Pair</Button>
          </div>
        </div>

        {showForm && (
          <div className="bg-card border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="font-semibold">New Trading Pair</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Symbol (e.g. BTC/USDT)</label>
                <Input placeholder="BTC/USDT" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Base Asset</label>
                <Input placeholder="BTC" value={form.baseAsset} onChange={e => setForm(f => ({ ...f, baseAsset: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Quote Asset</label>
                <Input placeholder="USDT" value={form.quoteAsset} onChange={e => setForm(f => ({ ...f, quoteAsset: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Network</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.network} onChange={e => setForm(f => ({ ...f, network: e.target.value }))}>
                  <option value="ETH">Ethereum</option>
                  <option value="BSC">BNB Chain</option>
                  <option value="POLYGON">Polygon</option>
                </select></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.symbol}>
                {addMutation.isPending ? "Adding..." : "Add Pair"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            {addMutation.isError && <p className="text-destructive text-sm">{(addMutation.error as Error).message}</p>}
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>{["Symbol","Base","Quote","Network","Status","Action"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : data?.pairs.map(pair => (
                <tr key={pair.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{pair.symbol}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pair.baseAsset}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pair.quoteAsset}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-muted px-2 py-0.5 rounded">{pair.network}</span></td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${pair.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {pair.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {pair.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={pair.status === "active" ? "destructive" : "default"}
                      onClick={() => toggleMutation.mutate({ id: pair.id, status: pair.status === "active" ? "inactive" : "active" })}
                      disabled={toggleMutation.isPending}>
                      {pair.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
