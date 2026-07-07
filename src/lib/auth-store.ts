import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View =
  | "home"
  | "login"
  | "register"
  | "trade"
  | "wallet"
  | "admin"
  | "admin-login"
  | "subagent";

export type Role = "CUSTOMER" | "SUB_AGENT" | "SUPER_ADMIN";

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: Role;
  balance: number;
  vipLevel: number;
  country?: string;
  phone?: string;
  mustChangePassword?: boolean;
  invitationCode?: string | null;
  linkedSubAgentId?: string | null;
  frozenFunds?: number;
  creditBalance?: number;
  walletLocked?: boolean;
  kycStatus?: string;
  status?: string;
  lastLoginAt?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  view: View;
  hydrated: boolean;
  setUser: (u: AuthUser | null) => void;
  setView: (v: View) => void;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  navigate: (v: View) => void;
  syncFromUrl: () => void;
}

const ALLOWED_VIEWS: View[] = [
  "home", "login", "register", "trade", "wallet", "admin", "admin-login", "subagent",
];

function viewFromLocation(): View | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("view");
  if (q && ALLOWED_VIEWS.includes(q as View)) return q as View;
  const path = url.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
  const pathMap: Record<string, View> = {
    admin: "admin", home: "home", login: "login", register: "register", trade: "trade", wallet: "wallet",
  };
  return pathMap[path] || null;
}

function pushViewToUrl(v: View) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (v === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", v);
  window.history.replaceState({}, "", url.toString());
}

function gateView(v: View, u: AuthUser | null): View {
  if (v === "trade" && !u) return "login";
  if (v === "trade" && u && (u.role === "SUB_AGENT" || u.role === "SUPER_ADMIN")) {
    return u.role === "SUPER_ADMIN" ? "admin" : "subagent";
  }
  if (v === "wallet" && !u) return "login";
  if (v === "wallet" && u && u.role !== "CUSTOMER") {
    return u.role === "SUPER_ADMIN" ? "admin" : "subagent";
  }
  if (v === "admin" && (!u || u.role !== "SUPER_ADMIN")) return "admin-login";
  if (v === "subagent" && (!u || u.role !== "SUB_AGENT")) return "admin-login";
  return v;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      view: "home",
      hydrated: false,
      setUser: (u) => set({ user: u }),
      setView: (v) => {
        set({ view: v });
        pushViewToUrl(v);
      },
      logout: () => {
        set({ user: null, view: "home" });
        pushViewToUrl("home");
      },
      updateBalance: (newBalance) => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, balance: newBalance } });
      },
      navigate: (v) => {
        const target = gateView(v, get().user);
        set({ view: target });
        pushViewToUrl(target);
      },
      syncFromUrl: () => {
        const v = viewFromLocation();
        if (!v) return;
        const target = gateView(v, get().user);
        set({ view: target });
      },
    }),
    {
      name: "blockexchange-auth",
      version: 9,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      migrate: () => ({ user: null, view: "home", hydrated: true }),
    }
  )
);
