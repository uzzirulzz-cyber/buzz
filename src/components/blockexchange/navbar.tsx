"use client";

import { useAuth, type View } from "@/lib/auth-store";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface NavbarProps {
  /** Hide nav links (e.g. on auth view) */
  minimal?: boolean;
}

// Storefront nav — Admin is intentionally HIDDEN from the storefront.
// Staff (sub-agents / super-admins) log in via the separate /admin-login portal.
const NAV_ITEMS: { label: string; view: View; requiresAuth?: boolean }[] = [
  { label: "Home", view: "home" },
  { label: "Trade", view: "trade", requiresAuth: true },
];

export function Navbar({ minimal = false }: NavbarProps) {
  const { user, view, navigate, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bx-glass shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]" : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("home")}
            className="flex items-center transition-transform hover:scale-[1.02]"
            aria-label="BlockExchange home"
          >
            <Logo size={36} tagline={false} />
          </button>

          {!minimal && (
            <>
              <nav className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
                  const active = view === item.view;
                  const blocked = item.requiresAuth && !user;
                  return (
                    <button
                      key={item.view}
                      onClick={() => navigate(item.view)}
                      className={cn(
                        "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                        active
                          ? "text-white"
                          : "text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      {item.label}
                      {blocked && (
                        <span className="ml-1.5 inline-flex items-center text-[10px] text-[#0ea5ff]">
                          🔒
                        </span>
                      )}
                      {active && (
                        <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-[#0ea5ff] to-transparent" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    {/* Staff see a Dashboard button instead of balance */}
                    {(user.role === "SUB_AGENT" || user.role === "SUPER_ADMIN") ? (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#2196F3] to-[#0D47A1] hover:opacity-90 text-white bx-glow"
                        onClick={() => navigate(user.role === "SUPER_ADMIN" ? "admin" : "subagent")}
                      >
                        Dashboard
                      </Button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bx-glass-soft text-sm">
                        <span className="text-muted-foreground">Balance</span>{" "}
                        <span className="font-semibold text-[#00c853]">
                          {(Number(user.balance) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bx-glass-soft">
                      <div className="w-7 h-7 rounded-full bx-blue-gradient flex items-center justify-center text-xs font-bold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs leading-tight">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-muted-foreground uppercase tracking-wider">
                          {user.role === "SUPER_ADMIN"
                            ? "Super Admin"
                            : user.role === "SUB_AGENT"
                            ? `Agent · ${user.invitationCode ?? ""}`
                            : `VIP ${user.vipLevel}`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-white"
                      onClick={logout}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-white"
                      onClick={() => navigate("login")}
                    >
                      Login
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#2196F3] to-[#0D47A1] hover:opacity-90 text-white bx-glow"
                      onClick={() => navigate("register")}
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile toggle */}
              <button
                className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {!minimal && mobileOpen && (
          <div className="md:hidden pb-4 bx-fade-in space-y-1">
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
              const blocked = item.requiresAuth && !user;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    navigate(item.view);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm",
                    view === item.view ? "bx-glass text-white" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <span>{item.label}</span>
                  {blocked && <span className="text-[10px]">🔒</span>}
                </button>
              );
            })}
            <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex-1 text-sm">
                    <div className="text-white font-medium">{user.name}</div>
                    <div className="text-[#00c853]">{(Number(user.balance) || 0).toLocaleString()} USDT</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={logout}>Logout</Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => { navigate("login"); setMobileOpen(false); }}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#2196F3] to-[#0D47A1] text-white"
                    onClick={() => { navigate("register"); setMobileOpen(false); }}
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
