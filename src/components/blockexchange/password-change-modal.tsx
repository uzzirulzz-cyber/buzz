"use client";

import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

/**
 * Forced password-change modal.
 * Shown when the logged-in user has mustChangePassword = true
 * (e.g. sub-agents who still have the "default" password).
 * Cannot be dismissed until the password is changed.
 */
export function PasswordChangeModal() {
  const { user, setUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user || !user.mustChangePassword) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (next === current) {
      toast.error("New password must be different from the current one.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: typeof user; error?: string };
      if (!res.ok || !data.user) {
        toast.error(data?.error || "Failed to change password.");
        return;
      }
      setUser(data.user);
      toast.success("Password changed successfully.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bx-glass rounded-2xl p-8 bx-glow">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bx-blue-gradient flex items-center justify-center">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Change your password</h2>
            <p className="text-xs text-muted-foreground">Required on first login</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          You&apos;re using the default password. For security, please set a new password before
          continuing.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="curr-pw">Current password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="curr-pw"
                type="password"
                className="pl-9"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="default"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-pw"
                type="password"
                className="pl-9"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conf-pw">Confirm new password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="conf-pw"
                type="password"
                className="pl-9"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-[#2196F3] to-[#0D47A1] hover:opacity-90 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
