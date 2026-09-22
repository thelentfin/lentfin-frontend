"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { dashboardApiService } from "@/services/dashboardApiService";
import { useAuth } from "@/hooks/useAuth";
import FinanceLoadingAnimation from "@/components/FinanceLoadingAnimation";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth("admin");

  const [role, setRole] = useState("admin");
  const [adminName, setAdminName] = useState("Admin");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("admin_sidebar_collapsed") === "true";
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
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Fetch admin summary for real-time sidebar pending count and admin info
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("userName") || localStorage.getItem("name");
      const storedRole = localStorage.getItem("role");
      if (storedName) setAdminName(storedName);
      if (storedRole) setRole(storedRole);
    }

    const fetchSummary = async () => {
      try {
        const res = await dashboardApiService.getAdminDashboard();
        if (res && res.status && res.data) {
          if (res.data.signupRequests?.pending) {
            setPendingRequestsCount(res.data.signupRequests.pending.length);
          } else if (res.data.summary?.pendingRequests !== undefined) {
            setPendingRequestsCount(res.data.summary.pendingRequests);
          }
        }
      } catch (e) {
        // Fallback gracefully
      }
    };

    fetchSummary();
  }, []);

  // Compute active tab from pathname
  const activeTab = useMemo(() => {
    if (pathname === "/admin") return "overview";
    if (pathname.startsWith("/admin/dsa-applications")) return "dsa-applications";
    if (pathname.startsWith("/admin/dsa-users") || pathname === "/admin/dsa") return "dsa";
    if (pathname.startsWith("/admin/customer-applications")) return "customer-applications";
    if (pathname.startsWith("/admin/support-tickets")) return "support-tickets";
    if (
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/company-location") ||
      pathname.startsWith("/admin/bank-master")
    ) {
      return "settings";
    }
    if (pathname.startsWith("/admin/profile")) return "profile";
    return "overview";
  }, [pathname]);

  const handleSelectNotification = useCallback(
    (notif) => {
      if (!notif) return;
      const notifType = String(notif.notification_type || "").toUpperCase();
      const entityType = String(notif.entity_type || "").toUpperCase();

      const isSignup =
        notifType === "NEW_DSA_SIGNUP" ||
        entityType === "DSA_SIGNUP_REQUEST" ||
        entityType === "DSA_SIGNUP";

      if (isSignup) {
        router.push("/admin/dsa-applications");
      } else {
        router.push("/admin/customer-applications");
      }
    },
    [router]
  );

  if (isAuthLoading || !isAuthenticated) {
    return <FinanceLoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* Persistent Topbar */}
      <Topbar
        role={role}
        userName={adminName}
        activeTab={activeTab}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onSelectNotification={handleSelectNotification}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleCollapse}
      />

      {/* Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        role={role}
        onLogout={logout}
        pendingCount={pendingRequestsCount}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
