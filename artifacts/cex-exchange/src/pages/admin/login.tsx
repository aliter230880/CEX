import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { checkAdmin } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Access denied", description: data.message ?? "Invalid password", variant: "destructive" });
        return;
      }

      await checkAdmin();
      setLocation("/admin");
    } catch {
      toast({ title: "Error", description: "Connection failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-destructive/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>ATEX Control Panel — Restricted</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Enter Admin Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
