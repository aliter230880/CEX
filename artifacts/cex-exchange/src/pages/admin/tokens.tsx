import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface CustomToken {
  id: number; symbol: string; name: string; network: string;
  contractAddress: string; decimals: number; status: string; iconUrl: string | null; createdAt: string;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export default function AdminTokens() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "", network: "ETH", contractAddress: "", decimals: "18", iconUrl: "" });

  const { data, isLoading, refetch } = useQuery<{ tokens: CustomToken[] }>({
    queryKey: ["admin-tokens"],
    queryFn: () => apiFetch("/api/admin/tokens"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, decimals: parseInt(form.decimals) }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tokens"] }); setShowForm(false); setForm({ symbol: "", name: "", network: "ETH", contractAddress: "", decimals: "18", iconUrl: "" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/admin/tokens/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tokens"] }),
  });

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Token Listing</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" />List Token</Button>
          </div>
        </div>

        {showForm && (
          <div className="bg-card border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="font-semibold">List New Token</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "symbol", label: "Symbol", placeholder: "USDT" },
                { key: "name", label: "Name", placeholder: "Tether" },
                { key: "contractAddress", label: "Contract Address", placeholder: "0x..." },
                { key: "decimals", label: "Decimals", placeholder: "18" },
                { key: "iconUrl", label: "Icon URL (optional)", placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <Input placeholder={placeholder} value={(form as any)[key]} onChange={f(key)} />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Network</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.network} onChange={f("network")}>
                  <option value="ETH">Ethereum</option>
                  <option value="BSC">BNB Chain</option>
                  <option value="POLYGON">Polygon</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.symbol || !form.contractAddress}>
                {addMutation.isPending ? "Listing..." : "List Token"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            {addMutation.isError && <p className="text-destructive text-sm">{(addMutation.error as Error).message}</p>}
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>{["Symbol","Name","Network","Contract","Decimals","Status","Action"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : data?.tokens.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No tokens listed yet</td></tr>
              ) : data?.tokens.map(token => (
                <tr key={token.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{token.symbol}</td>
                  <td className="px-4 py-3 text-muted-foreground">{token.name}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-muted px-2 py-0.5 rounded">{token.network}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{token.contractAddress.slice(0,10)}...{token.contractAddress.slice(-6)}</td>
                  <td className="px-4 py-3 text-center">{token.decimals}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${token.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {token.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {token.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={token.status === "active" ? "destructive" : "default"}
                      onClick={() => toggleMutation.mutate({ id: token.id, status: token.status === "active" ? "delisted" : "active" })}
                      disabled={toggleMutation.isPending}>
                      {token.status === "active" ? "Delist" : "Relist"}
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
