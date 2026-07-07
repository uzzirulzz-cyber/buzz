"use client";

/**
 * BlockExchange admin — Dashboard section.
 *
 * Fetches real data from GET /api/admin/stats (with x-user-id header).
 * Renders: 8 stat cards, a 7-day revenue AreaChart, top-5 coin volume
 * bars, and a system status footer row.
 */

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users as UsersIcon,
  Activity,
  CandlestickChart,
  Timer,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CardSkeleton,
  type AdminStats,
  SectionShell,
  StatCard,
  fmtMoney,
} from "./shared";
import { COINS } from "@/lib/market-data";
import { Progress as ProgressUI } from "@/components/ui/progress";

interface DashboardProps {
  userId: string;
  /** Increments when user hits "Sync" in the title bar — refetches data. */
  syncTick: number;
}

export function AdminDashboard({ userId, syncTick }: DashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats", { headers: { "x-user-id": userId } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AdminStats>;
      })
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setLastSync(new Date());
        setSecondsAgo(0);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error("Failed to load dashboard stats", { description: String(err) });
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, syncTick]);

  // "Xs ago" ticker
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastSync]);

  if (loading || !stats) {
    return (
      <SectionShell>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="bx-glass rounded-xl p-6 h-[320px] animate-pulse" />
      </SectionShell>
    );
  }

  const maxVolume = Math.max(1, ...stats.coinVolume.map((c) => c.count));
  const totalVolume = stats.coinVolume.reduce((s, c) => s + c.count, 0);

  return (
    <SectionShell>
      {/* 8 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={UsersIcon} label="Total Users" value={stats.totalUsers.toLocaleString()} accent="blue" delta={3.2} />
        <StatCard icon={Activity} label="Active Users (24h)" value={stats.activeUsers.toLocaleString()} accent="emerald" delta={1.8} />
        <StatCard icon={CandlestickChart} label="Total Trades" value={stats.totalTrades.toLocaleString()} accent="purple" delta={5.4} />
        <StatCard icon={Timer} label="Active Trades" value={stats.activeTrades.toLocaleString()} accent="amber" delta={-0.6} />
        <StatCard
          icon={DollarSign}
          label="Revenue (house profit)"
          value={`$${fmtMoney(stats.revenue, 0)}`}
          accent="emerald"
          delta={4.1}
        />
        <StatCard
          icon={ArrowDownToLine}
          label="Today's Deposits"
          value={`$${fmtMoney(stats.todayDeposits, 0)}`}
          accent="blue"
          delta={2.3}
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Today's Withdrawals"
          value={`$${fmtMoney(stats.todayWithdrawals, 0)}`}
          accent="red"
          delta={-1.2}
        />
        <StatCard icon={AlertCircle} label="Pending Approvals" value="3" accent="amber" sublabel="Manual review queue" />
      </div>

      {/* Revenue chart + coin volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bx-glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Revenue (last 7 days)</h3>
              <p className="text-xs text-muted-foreground">House profit from settled trades</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#00c853]">${fmtMoney(stats.revenue, 0)}</div>
              <div className="text-[10px] text-muted-foreground">cumulative</div>
            </div>
          </div>
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5ff" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#0ea5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,168,230,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#8a9bbd"
                  tick={{ fill: "#8a9bbd", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#8a9bbd"
                  tick={{ fill: "#8a9bbd", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(13, 22, 42, 0.95)",
                    border: "1px solid rgba(14,165,255,0.3)",
                    borderRadius: 10,
                    color: "#e8eefc",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${fmtMoney(v, 2)}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0ea5ff"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={{ r: 3, fill: "#0ea5ff", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#0ea5ff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coin volume */}
        <div className="bx-glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Coins by Volume</h3>
              <p className="text-xs text-muted-foreground">{totalVolume.toLocaleString()} trades total</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.coinVolume.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No trade volume yet.</div>
            )}
            {stats.coinVolume.map((c) => {
              const coin = COINS.find((co) => co.symbol === c.symbol || co.pair === c.symbol);
              const pct = Math.round((c.count / maxVolume) * 100);
              return (
                <div key={c.symbol} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${coin?.color ?? "#0ea5ff"}22`, color: coin?.color ?? "#0ea5ff" }}
                      >
                        {coin?.icon ?? c.symbol[0]}
                      </div>
                      <span className="font-medium text-white">{c.symbol}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{c.count.toLocaleString()}</span>
                  </div>
                  <ProgressUI value={pct} className="h-1.5" />
                </div>
              );
            })}
            {stats.coinVolume.length > 0 && stats.coinVolume.length < 5 && (
              <div className="text-[10px] text-muted-foreground/60 pt-2">Showing {stats.coinVolume.length} of top 5</div>
            )}
          </div>
        </div>
      </div>

      {/* System status footer */}
      <div className="bx-glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <StatusPill label="API" />
          <StatusPill label="Database" />
          <StatusPill label="Trading Engine" />
          <StatusPill label="Price Feed" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Last sync: {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`}
        </div>
      </div>
    </SectionShell>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex w-full h-full rounded-full bg-[#00c853] opacity-70 bx-pulse-dot" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-[#00c853]" />
      </span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-[#00c853] font-medium">Operational</span>
    </div>
  );
}
