"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { dashboardApiService } from "@/services/dashboardApiService";
import { useAuth } from "@/hooks/useAuth";
import FinanceLoadingAnimation from "@/components/FinanceLoadingAnimation";

export default function DSALayout({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth("dsa");

  const [role, setRole] = useState("dsa");
  const [userName, setUserName] = useState("DSA");
  const [customerCount, setCustomerCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("dsa_sidebar_collapsed") === "true";
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dsa_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Fetch DSA profile & case summary for real-time sidebar badges and greeting
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedName = localStorage.getItem("userName") || localStorage.getItem("name");
      const cachedRole = localStorage.getItem("role");
      if (cachedName) setUserName(cachedName);
      if (cachedRole) setRole(cachedRole);
    }

    const fetchSummary = async () => {
      try {
        const res = await dashboardApiService.getDsaDashboard();
        if (res && res.status && res.data) {
          if (res.data.profile?.name) {
            setUserName(res.data.profile.name);
          }
          if (Array.isArray(res.data.loanCases)) {
            setCustomerCount(res.data.loanCases.length);
          } else if (res.data.summary?.loanCases !== undefined) {
            setCustomerCount(res.data.summary.loanCases);
          }
        }
      } catch (e) {}
    };

    fetchSummary();
  }, []);

  // Compute activeTab and pageTitle dynamically from pathname
  const { activeTab, pageTitle } = useMemo(() => {
    if (pathname === "/dsa") {
      return { activeTab: "overview", pageTitle: "Dashboard" };
    }
    if (pathname.startsWith("/dsa/customer-applications")) {
      return { activeTab: "customer-applications", pageTitle: "Customer Applications" };
    }
    if (pathname.startsWith("/dsa/support")) {
      return { activeTab: "support", pageTitle: "Support Center" };
    }
    if (pathname.startsWith("/dsa/profile")) {
      return { activeTab: "profile", pageTitle: "My Profile" };
    }
    return { activeTab: "overview", pageTitle: "Dashboard" };
  }, [pathname]);

  const navItems = useMemo(
    () => [
      { id: "overview", label: "Dashboard", icon: "overview" },
      { id: "customer-applications", label: "Customer Applications", icon: "customers", badge: customerCount },
      { id: "support", label: "Support Center", icon: "support" },
    ],
    [customerCount]
  );

  if (isAuthLoading || !isAuthenticated) {
    return <FinanceLoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* Persistent Topbar */}
      <Topbar
        title={pageTitle}
        userName={userName}
        onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Persistent Sidebar */}
      <Sidebar
        navItems={navItems}
        activeTab={activeTab}
        role={role}
        dsaName={userName}
        onLogout={logout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Workspace for Route Children */}
      <main
        className={`${
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        } min-h-screen pt-16 pb-12 transition-[margin] duration-300 ease-in-out`}
      >
        <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-8 sm:py-6 space-y-3.5 sm:space-y-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
