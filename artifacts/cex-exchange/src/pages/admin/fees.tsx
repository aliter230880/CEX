import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Save, Trash2, RefreshCw } from "lucide-react";

interface FeeConfig {
  id: number; asset: string; makerFee: string; takerFee: string;
  withdrawalFee: string; enabled: boolean; updatedAt: string;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

function FeeRow({ fee, onSave, onDelete }: { fee: FeeConfig; onSave: (asset: string, vals: Partial<FeeConfig>) => void; onDelete: (asset: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({ makerFee: fee.makerFee, takerFee: fee.takerFee, withdrawalFee: fee.withdrawalFee });

  if (!editing) return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="px-4 py-3 font-semibold">{fee.asset}</td>
      <td className="px-4 py-3 font-mono text-sm">{(parseFloat(fee.makerFee) * 100).toFixed(3)}%</td>
      <td className="px-4 py-3 font-mono text-sm">{(parseFloat(fee.takerFee) * 100).toFixed(3)}%</td>
      <td className="px-4 py-3 font-mono text-sm">{fee.withdrawalFee} {fee.asset}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(fee.asset)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className="border-b last:border-0 bg-muted/10">
      <td className="px-4 py-2 font-semibold">{fee.asset}</td>
      <td className="px-4 py-2"><Input className="h-8 text-xs font-mono" value={vals.makerFee} onChange={e => setVals(v => ({ ...v, makerFee: e.target.value }))} /></td>
      <td className="px-4 py-2"><Input className="h-8 text-xs font-mono" value={vals.takerFee} onChange={e => setVals(v => ({ ...v, takerFee: e.target.value }))} /></td>
      <td className="px-4 py-2"><Input className="h-8 text-xs font-mono" value={vals.withdrawalFee} onChange={e => setVals(v => ({ ...v, withdrawalFee: e.target.value }))} /></td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onSave(fee.asset, vals); setEditing(false); }}><Save className="w-3 h-3 mr-1" />Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminFees() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState({ asset: "", makerFee: "0.001", takerFee: "0.001", withdrawalFee: "0" });

  const { data, isLoading, refetch } = useQuery<{ fees: FeeConfig[] }>({
    queryKey: ["admin-fees"],
    queryFn: () => apiFetch("/api/admin/fees"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ asset, vals }: { asset: string; vals: Partial<FeeConfig> }) =>
      apiFetch(`/api/admin/fees/${asset}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-fees"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (asset: string) => apiFetch(`/api/admin/fees/${asset}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-fees"] }),
  });

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Fee Configuration</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" />Add Asset</Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6 text-sm text-muted-foreground">
          Fees are stored as decimals: <code className="font-mono bg-muted px-1 rounded">0.001</code> = 0.1%. Withdrawal fee is a flat amount in the asset.
        </div>

        {showAdd && (
          <div className="bg-card border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="font-semibold">Add Asset Fee Config</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "asset", label: "Asset", placeholder: "BTC" },
                { key: "makerFee", label: "Maker Fee (decimal)", placeholder: "0.001" },
                { key: "takerFee", label: "Taker Fee (decimal)", placeholder: "0.001" },
                { key: "withdrawalFee", label: "Withdrawal Fee (flat)", placeholder: "0.0005" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <Input placeholder={placeholder} value={(newAsset as any)[key]} onChange={e => setNewAsset(a => ({ ...a, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { saveMutation.mutate({ asset: newAsset.asset, vals: newAsset }); setShowAdd(false); }} disabled={!newAsset.asset}>Save</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>{["Asset","Maker Fee","Taker Fee","Withdrawal Fee","Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : data?.fees.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No fee config yet. Add an asset above.</td></tr>
              ) : data?.fees.map(fee => (
                <FeeRow key={fee.id} fee={fee}
                  onSave={(asset, vals) => saveMutation.mutate({ asset, vals })}
                  onDelete={(asset) => deleteMutation.mutate(asset)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
