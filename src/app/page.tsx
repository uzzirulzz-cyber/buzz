"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { Navbar } from "@/components/blockexchange/navbar";
import { Footer } from "@/components/blockexchange/footer";
import { HomeView } from "@/components/blockexchange/home-view";
import { AuthView } from "@/components/blockexchange/auth-view";
import { TradeView } from "@/components/blockexchange/trade-view";
import { WalletView } from "@/components/blockexchange/wallet-view";
import { AdminView } from "@/components/blockexchange/admin-view";
import { SubAgentDashboard } from "@/components/blockexchange/subagent-dashboard";
import { AdminLoginView } from "@/components/blockexchange/admin-login-view";
import { PasswordChangeModal } from "@/components/blockexchange/password-change-modal";
import { SupportChatWidget } from "@/components/blockexchange/support-chat-widget";
import { PWAInstallPrompt } from "@/components/blockexchange/pwa-install-prompt";

export default function Home() {
  const { view, user, navigate, hydrated, syncFromUrl, setView } = useAuth();

  // Sync view from URL on mount (handles /storefront, /admin, /trade, etc.)
  useEffect(() => {
    syncFromUrl();
    if (!useAuth.getState().hydrated) {
      useAuth.setState({ hydrated: true });
    }
    const onPop = () => syncFromUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncFromUrl]);

  // Safety: keep view state in sync with auth state.
  useEffect(() => {
    if (!hydrated) return;
    if (view === "trade" && !user) navigate("login");
    if (view === "trade" && user && user.role !== "CUSTOMER") {
      navigate(user.role === "SUPER_ADMIN" ? "admin" : "subagent");
    }
    if (view === "admin" && (!user || user.role !== "SUPER_ADMIN")) setView("admin-login");
    if (view === "subagent" && (!user || user.role !== "SUB_AGENT")) setView("admin-login");
    if (view === "wallet" && !user) navigate("login");
  }, [view, user, hydrated, navigate, setView]);

  // Standalone full-screen views (no storefront chrome)
  if (view === "admin-login") {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminLoginView />
      </div>
    );
  }

  // Staff dashboards render their own Navbar/Footer + password modal
  if (view === "subagent") {
    return (
      <div className="min-h-screen flex flex-col">
        <SubAgentDashboard />
      </div>
    );
  }
  if (view === "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col">
          <AdminView />
        </div>
        <Footer />
        <PasswordChangeModal />
      </div>
    );
  }

  // Storefront views
  const isAuthView = view === "login" || view === "register";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar minimal={isAuthView} />
      <div className="flex-1 flex flex-col">
        {view === "home" && <HomeView />}
        {view === "login" && <AuthView />}
        {view === "register" && <AuthView />}
        {view === "trade" && <TradeView />}
        {view === "wallet" && <WalletView />}
      </div>
      <Footer />
      <SupportChatWidget />
      <PWAInstallPrompt />
      <PasswordChangeModal />
    </div>
  );
}
