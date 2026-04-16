import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, RefreshCw, CheckCircle, XCircle, DollarSign, ExternalLink, Link2 } from "lucide-react";

interface CustomToken {
  id: number; symbol: string; name: string; network: string;
  contractAddress: string; decimals: number; status: string;
  iconUrl: string | null; manualPriceUsd: string | null;
  priceContractAddress: string | null; createdAt: string;
  hasPair: boolean; pairSymbol: string | null;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

const EMPTY_FORM = {
  symbol: "", name: "", network: "POLYGON", contractAddress: "",
  decimals: "18", iconUrl: "", manualPriceUsd: "", quoteAsset: "USDT",
  priceContractAddress: "",
};

export default function AdminTokens() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [priceModal, setPriceModal] = useState<CustomToken | null>(null);
  const [priceForm, setPriceForm] = useState({ manualPriceUsd: "", priceContractAddress: "" });
  const [createPairModal, setCreatePairModal] = useState<CustomToken | null>(null);
  const [createPairForm, setCreatePairForm] = useState({ quoteAsset: "USDT", manualPriceUsd: "" });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ tokens: CustomToken[] }>({
    queryKey: ["admin-tokens"],
    queryFn: () => apiFetch("/api/admin/tokens"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiFetch<{ success: boolean; pair?: string; pairCreated?: boolean }>("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        decimals: parseInt(form.decimals),
        manualPriceUsd: form.manualPriceUsd ? parseFloat(form.manualPriceUsd) : undefined,
        priceContractAddress: form.priceContractAddress || undefined,
        quoteAsset: form.quoteAsset || "USDT",
      }),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-tokens"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      if (res.pairCreated && res.pair) {
        setSuccessMsg(`Token listed! Trading pair ${res.pair} created automatically.`);
        setTimeout(() => setSuccessMsg(null), 8000);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/admin/tokens/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tokens"] }),
  });

  const createPairMutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiFetch<{ success: boolean; pairCreated: boolean; pair: string; message?: string }>(`/api/admin/tokens/${id}/create-pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteAsset: createPairForm.quoteAsset,
          manualPriceUsd: createPairForm.manualPriceUsd ? parseFloat(createPairForm.manualPriceUsd) : undefined,
        }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-tokens"] });
      setCreatePairModal(null);
      setSuccessMsg(res.pairCreated ? `Trading pair ${res.pair} created! Token is now live on ATEX.` : (res.message ?? "Done"));
      setTimeout(() => setSuccessMsg(null), 8000);
    },
  });

  const priceMutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiFetch(`/api/admin/tokens/${id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualPriceUsd: priceForm.manualPriceUsd ? parseFloat(priceForm.manualPriceUsd) : undefined,
          priceContractAddress: priceForm.priceContractAddress || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tokens"] });
      setPriceModal(null);
    },
  });

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Token Listing</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" />List Token</Button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {showForm && (
          <div className="bg-card border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="font-semibold">List New Token</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "symbol", label: "Symbol", placeholder: "LUX" },
                { key: "name", label: "Name", placeholder: "Lux Token" },
                { key: "contractAddress", label: "Contract Address", placeholder: "0x7324..." },
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
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quote Asset (pair with)</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.quoteAsset} onChange={f("quoteAsset")}>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                  <option value="BNB">BNB</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Price Source</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Manual Price (USD)</label>
                  <Input placeholder="0.05" value={form.manualPriceUsd} onChange={f("manualPriceUsd")} type="number" step="any" />
                  <p className="text-xs text-muted-foreground mt-1">Set initial USD price for the token</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Exchanger Contract (auto-price)
                  </label>
                  <Input placeholder="0xe5646..." value={form.priceContractAddress} onChange={f("priceContractAddress")} />
                  <p className="text-xs text-muted-foreground mt-1">Reads getPrice() from your LuxEx contract on Polygon</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.symbol || !form.contractAddress}>
                {addMutation.isPending ? "Listing..." : "List Token & Create Pair"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            {addMutation.isError && <p className="text-destructive text-sm">{(addMutation.error as Error).message}</p>}
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>{["Symbol","Name","Network","Contract","Price (USD)","Status","Actions"].map(h => (
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{token.symbol}</span>
                      {token.priceContractAddress && (
                        <span title="Auto-price from contract" className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">AUTO</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{token.name}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-muted px-2 py-0.5 rounded">{token.network}</span></td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://${token.network === "POLYGON" ? "polygonscan.com" : token.network === "BSC" ? "bscscan.com" : "etherscan.io"}/token/${token.contractAddress}`}
                      target="_blank" rel="noreferrer"
                      className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {token.contractAddress.slice(0,8)}...{token.contractAddress.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {token.manualPriceUsd ? (
                      <span className="text-emerald-400 font-mono">
                        ${parseFloat(token.manualPriceUsd).toFixed(6)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${token.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {token.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {token.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {!token.hasPair && (
                        <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                          onClick={() => { setCreatePairModal(token); setCreatePairForm({ quoteAsset: "USDT", manualPriceUsd: token.manualPriceUsd ?? "" }); }}>
                          <Link2 className="w-3 h-3 mr-1" />Create Pair
                        </Button>
                      )}
                      {token.hasPair && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />{token.pairSymbol}
                        </span>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => { setPriceModal(token); setPriceForm({ manualPriceUsd: token.manualPriceUsd ?? "", priceContractAddress: token.priceContractAddress ?? "" }); }}>
                        <DollarSign className="w-3 h-3 mr-1" />Price
                      </Button>
                      <Button size="sm" variant={token.status === "active" ? "destructive" : "default"}
                        onClick={() => toggleMutation.mutate({ id: token.id, status: token.status === "active" ? "delisted" : "active" })}
                        disabled={toggleMutation.isPending}>
                        {token.status === "active" ? "Delist" : "Relist"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Pair Modal */}
        {createPairModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
              <h2 className="font-semibold text-lg">Create Trading Pair for {createPairModal.symbol}</h2>
              <p className="text-sm text-muted-foreground">
                This will create a <strong>{createPairModal.symbol}/{createPairForm.quoteAsset}</strong> trading pair on ATEX and generate initial chart data.
              </p>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quote Asset</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createPairForm.quoteAsset}
                  onChange={e => setCreatePairForm(p => ({ ...p, quoteAsset: e.target.value }))}>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                  <option value="BNB">BNB</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Starting Price (USD)</label>
                <Input
                  placeholder="0.05"
                  value={createPairForm.manualPriceUsd}
                  onChange={e => setCreatePairForm(p => ({ ...p, manualPriceUsd: e.target.value }))}
                  type="number" step="any"
                />
                <p className="text-xs text-muted-foreground mt-1">Used to seed the chart. Leave empty to use 0.01 as default.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createPairMutation.mutate({ id: createPairModal.id })}
                  disabled={createPairMutation.isPending}>
                  {createPairMutation.isPending ? "Creating..." : "Create Pair"}
                </Button>
                <Button variant="outline" onClick={() => setCreatePairModal(null)}>Cancel</Button>
              </div>
              {createPairMutation.isError && <p className="text-destructive text-sm">{(createPairMutation.error as Error).message}</p>}
            </div>
          </div>
        )}

        {/* Price Modal */}
        {priceModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
              <h2 className="font-semibold text-lg">Set Price for {priceModal.symbol}</h2>
              <p className="text-sm text-muted-foreground">Choose how ATEX should price this token. Contract auto-price takes priority over manual price.</p>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Manual Price (USD)</label>
                <Input
                  placeholder="0.05"
                  value={priceForm.manualPriceUsd}
                  onChange={e => setPriceForm(p => ({ ...p, manualPriceUsd: e.target.value }))}
                  type="number" step="any"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Exchanger Contract Address (Polygon)</label>
                <Input
                  placeholder="0xe5646EBf223499E0d15Af09F8e42cC6586B0512b"
                  value={priceForm.priceContractAddress}
                  onChange={e => setPriceForm(p => ({ ...p, priceContractAddress: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must implement <code className="bg-muted px-1 rounded">getPrice(address) → uint256</code>. Updates every 60 seconds.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => priceMutation.mutate({ id: priceModal.id })}
                  disabled={priceMutation.isPending || (!priceForm.manualPriceUsd && !priceForm.priceContractAddress)}>
                  {priceMutation.isPending ? "Saving..." : "Save Price"}
                </Button>
                <Button variant="outline" onClick={() => setPriceModal(null)}>Cancel</Button>
              </div>
              {priceMutation.isError && <p className="text-destructive text-sm">{(priceMutation.error as Error).message}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
