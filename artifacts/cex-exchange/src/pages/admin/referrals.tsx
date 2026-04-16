import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Users } from "lucide-react";

interface ReferralConfig {
  id: number; enabled: boolean; rewardType: string;
  rewardValue: string; minTradeVolume: string; updatedAt: string;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export default function AdminReferrals() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    enabled: false, rewardType: "percentage", rewardValue: "10", minTradeVolume: "0",
  });
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<{ config: ReferralConfig | null }>({
    queryKey: ["admin-referrals"],
    queryFn: () => apiFetch("/api/admin/referrals"),
  });

  useEffect(() => {
    if (data?.config) {
      setForm({
        enabled: data.config.enabled,
        rewardType: data.config.rewardType,
        rewardValue: data.config.rewardValue,
        minTradeVolume: data.config.minTradeVolume,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/referrals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-referrals"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  if (isLoading) return <div className="min-h-screen bg-background dark flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background dark text-foreground p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Referral Program</h1>
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Enable Referral Program</div>
              <div className="text-sm text-muted-foreground">Allow users to invite others and earn rewards</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="border-t pt-5 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reward Type</label>
              <div className="flex gap-3">
                {[
                  { value: "percentage", label: "% of Trade Fee" },
                  { value: "fixed", label: "Fixed USDT Amount" },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setForm(f => ({ ...f, rewardType: opt.value }))}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${form.rewardType === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Reward Value {form.rewardType === "percentage" ? "(% of fee earned)" : "(USDT per referral)"}
              </label>
              <div className="relative">
                <Input type="number" min="0" step="0.1" value={form.rewardValue}
                  onChange={e => setForm(f => ({ ...f, rewardValue: e.target.value }))} className="pr-12" />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                  {form.rewardType === "percentage" ? "%" : "USDT"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Min Trade Volume to Qualify (USDT)</label>
              <Input type="number" min="0" step="1" value={form.minTradeVolume}
                onChange={e => setForm(f => ({ ...f, minTradeVolume: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Referred user must trade at least this much before reward is paid</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Settings"}
            </Button>
            {saveMutation.isError && <p className="text-destructive text-sm mt-2">{(saveMutation.error as Error).message}</p>}
          </div>
        </div>

        <div className="mt-4 bg-muted/30 border rounded-xl p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Referral tracking and reward distribution require adding a referral code field to user registration. This panel configures the program settings.
        </div>
      </div>
    </div>
  );
}
