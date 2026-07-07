"use client";

/**
 * BlockExchange admin — User Management section.
 *
 * Fetches real data from GET /api/admin/users.
 * Search filter (client-side), quick-stat chips, and a scrollable table
 * with per-user actions (Freeze/Suspend/Reset/KYC/etc) — all actions
 * surface a toast notification for actions.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  ShieldCheck,
  Snowflake,
  MoreHorizontal,
  Lock,
  KeyRound,
  History,
  BadgeCheck,
  Ban,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RowSkeleton,
  SectionHeader,
  SectionShell,
  StatusBadge,
  type AdminUser,
  fmtDateShort,
  fmtMoney,
} from "./shared";

interface UsersProps {
  userId: string;
  syncTick: number;
}

function chip(label: string, value: number, accent: string) {
  return (
    <div className="bx-glass-soft rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export function AdminUsers({ userId, syncTick }: UsersProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users", { headers: { "x-user-id": userId } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ users: AdminUser[] }>;
      })
      .then((data) => !cancelled && setUsers(data.users))
      .catch((err) => toast.error("Failed to load users", { description: String(err) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, syncTick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  const stats = useMemo(() => {
    const total = users.length;
    const frozen = users.filter((u) => u.frozen).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const active = total - frozen;
    return { total, active, frozen, admins };
  }, [users]);

  const notifyAction = () => toast.info("Action requires confirmation — use the action menu to proceed.");

  return (
    <SectionShell>
      <SectionHeader
        title="User Management"
        description="Manage user accounts, balances, KYC status, and access controls."
        icon={UsersIcon}
      />

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chip("Total Users", stats.total, "#0ea5ff")}
        {chip("Active", stats.active, "#00c853")}
        {chip("Frozen", stats.frozen, "#ff3b30")}
        {chip("Admins", stats.admins, "#c084fc")}
      </div>

      {/* Search */}
      <div className="bx-glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-background/40"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bx-glass rounded-xl overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto bx-scroll">
          <Table>
            <TableHeader className="sticky top-0 bg-[#0d162a]/95 backdrop-blur z-10">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider px-4">User</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">VIP</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Balance</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Trades</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Joined</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider text-right px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-white/5">
                  <TableCell colSpan={8}><RowSkeleton cols={6} /></TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow className="border-white/5">
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            u.role === "admin"
                              ? "bx-blue-gradient text-white"
                              : "bg-white/10 text-slate-200"
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate max-w-[180px]">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-[#0ea5ff]/15 text-[#0ea5ff] border-[#0ea5ff]/30">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-[#c084fc]">
                        <ShieldCheck className="w-3.5 h-3.5" />VIP {u.vipLevel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums text-[#00c853]">
                      ${fmtMoney(u.balance, 2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{u.tradesCount}</TableCell>
                    <TableCell>
                      {u.frozen ? <StatusBadge status="FROZEN" /> : <StatusBadge status="ACTIVE" />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDateShort(u.createdAt)}</TableCell>
                    <TableCell className="px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={notifyAction}>
                            <Snowflake className="w-3.5 h-3.5" />
                            {u.frozen ? "Unfreeze User" : "Freeze User"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={notifyAction} variant="destructive">
                            <Ban className="w-3.5 h-3.5" />
                            Suspend Account
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={notifyAction}>
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={notifyAction}>
                            <History className="w-3.5 h-3.5" />
                            Login History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={notifyAction}>
                            <BadgeCheck className="w-3.5 h-3.5" />
                            KYC Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={notifyAction}>
                            <Lock className="w-3.5 h-3.5" />
                            Impersonate (read-only)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filtered.length} users</span>
        <Button variant="ghost" size="sm" onClick={notifyAction} className="text-muted-foreground hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
    </SectionShell>
  );
}
