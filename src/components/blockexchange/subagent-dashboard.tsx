"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Wallet,
  Activity,
  Ticket,
  Search,
  Snowflake,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth, type AuthUser } from "@/lib/auth-store";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { PasswordChangeModal } from "./password-change-modal";
import { toast } from "sonner";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

interface SubAgentCustomer extends AuthUser {
  tradesCount: number;
  transactionsCount: number;
}
interface SubAgentTrade {
  id: string;
  symbol: string;
  direction: string;
  duration: number;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  result: string;
  profit: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

export function SubAgentDashboard() {
  const { user, navigate } = useAuth();
  const [customers, setCustomers] = useState<SubAgentCustomer[]>([]);
  const [trades, setTrades] = useState<SubAgentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user || user.role !== "SUB_AGENT") return;
    Promise.all([
      fetch("/api/subagent/customers", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
      fetch("/api/subagent/trades", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
    ])
      .then(([c, t]) => {
        setCustomers(c.customers ?? []);
        setTrades(t.trades ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // 403 guard
  if (!user || user.role !== "SUB_AGENT") {
    return (
      <main className="flex-1 pt-20 flex items-center justify-center">
        <div className="bx-glass rounded-2xl p-8 text-center max-w-sm">
          <h2 className="text-xl font-bold text-white">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Sub-Agent access required.
          </p>
          <Button className="mt-4" onClick={() => navigate("admin-login")}>
            Staff Login
          </Button>
        </div>
      </main>
    );
  }

  const totalBalance = customers.reduce((s, c) => s + c.balance, 0);
  const activeCustomers = customers.filter((c) => !c.frozen).length;
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  async function toggleFreeze(customerId: string, frozen: boolean) {
    const action = frozen ? "unfreeze" : "freeze";
    try {
      const res = await fetch("/api/subagent/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ customerId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, frozen: !frozen } : c))
      );
      toast.success(`Customer ${action}d`);
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <>
      <SonnerToaster />
      <PasswordChangeModal />
      <Navbar />
      <main className="flex-1 pt-20 pb-10 bx-fade-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-white">Sub-Agent Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, {user.name} · Invitation code{" "}
                <span className="inline-flex items-center gap-1 text-[#0ea5ff] font-mono">
                  <Ticket className="w-3.5 h-3.5" />
                  {user.invitationCode}
                </span>
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="My Customers"
              value={String(customers.length)}
              accent="#0ea5ff"
            />
            <StatCard
              icon={UserCheck}
              label="Active"
              value={String(activeCustomers)}
              accent="#00c853"
            />
            <StatCard
              icon={Wallet}
              label="Total Balance"
              value={`${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`}
              accent="#f5a623"
            />
            <StatCard
              icon={TrendingUp}
              label="Customer Trades"
              value={String(trades.length)}
              accent="#c084fc"
            />
          </div>

          {/* Two columns: customers + recent trades */}
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Customers */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bx-glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">My Customers</h2>
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or email…"
                    className="pl-9 h-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No customers yet. Share your invitation code{" "}
                  <span className="font-mono text-[#0ea5ff]">{user.invitationCode}</span> to invite
                  customers.
                </div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto bx-scroll -mx-2">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#0a1428] z-10">
                      <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Balance</th>
                        <th className="px-3 py-2">Trades</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-white/5 hover:bg-white/[0.02]"
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bx-blue-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-white truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {c.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[#00c853] font-medium">
                            {c.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{c.tradesCount}</td>
                          <td className="px-3 py-3">
                            {c.frozen ? (
                              <Badge className="bg-[#ff3b30]/15 text-[#ff3b30]">Frozen</Badge>
                            ) : (
                              <Badge className="bg-[#00c853]/15 text-[#00c853]">Active</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => toggleFreeze(c.id, c.frozen)}
                            >
                              <Snowflake className="w-3.5 h-3.5 mr-1" />
                              {c.frozen ? "Unfreeze" : "Freeze"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Recent trades */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bx-glass rounded-2xl p-5"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Customer Trades</h2>
              {trades.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No trades from your customers yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto bx-scroll">
                  {trades.slice(0, 30).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{t.symbol}</span>
                          <Badge
                            className={
                              t.direction === "UP"
                                ? "bg-[#00c853]/15 text-[#00c853]"
                                : "bg-[#ff3b30]/15 text-[#ff3b30]"
                            }
                          >
                            {t.direction}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.user.name} · {t.duration}s · {t.amount} USDT
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {t.result === "WIN" ? (
                          <span className="text-[#00c853] text-sm font-semibold">
                            +{t.profit.toFixed(2)}
                          </span>
                        ) : t.result === "LOSE" ? (
                          <span className="text-[#ff3b30] text-sm font-semibold">
                            {t.profit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#f5a623] text-xs">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Invitation-code share card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 bx-glass rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-base font-semibold text-white">Your Invitation Code</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Share this code with customers so they can register under you.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 rounded-xl bx-blue-gradient text-white font-mono text-lg font-bold tracking-wider bx-glow">
                {user.invitationCode}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(user.invitationCode ?? "");
                  toast.success("Invitation code copied");
                }}
              >
                Copy
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bx-glass rounded-xl p-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${accent}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
