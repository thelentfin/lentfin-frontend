"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CompanyLocationSettings from "./components/CompanyLocationSettings";
import BankMasterSettings from "./components/BankMasterSettings";
import SettingsLanding from "./components/SettingsLanding";
import DSAApplicationsList from "./components/DSAApplicationsList";
import DSAApplicationModal from "./components/DSAApplicationModal";
import DSAUsersList from "./components/DSAUsersList";
import CustomerApplicationsList from "./components/CustomerApplicationsList";
import MyProfile from "./components/MyProfile";
import AdminAnalyticsUI from "./components/AdminAnalyticsUI";
import { notificationApiService } from "@/services/notificationApiService";
import { dashboardApiService } from "@/services/dashboardApiService";
import { socketService } from "@/services/socketService";
import { useAuth } from "@/hooks/useAuth";
import FinanceLoadingAnimation from "@/components/FinanceLoadingAnimation";

const VALID_ADMIN_SECTIONS = [
  "overview",
  "dsa-applications",
  "dsa",
  "customer-applications",
  "company-location",
  "bank-master",
  "settings",
  "profile",
];

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user, logout } = useAuth("admin");
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab");
        if (tabParam && VALID_ADMIN_SECTIONS.includes(tabParam)) {
          return tabParam;
        }
        const storedTab = localStorage.getItem("admin_selected_section");
        if (storedTab && VALID_ADMIN_SECTIONS.includes(storedTab)) {
          return storedTab;
        }
      } catch (e) {}
    }
    return "overview";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [adminName, setAdminName] = useState("");

  // Real API Data States
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [usersData, setUsersData] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [loanCasesData, setLoanCasesData] = useState([]);
  const [notificationsData, setNotificationsData] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Automatic ticker to recalculate elapsed sync time every 10 seconds without page refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize and persist activeTab selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab) {
      if (VALID_ADMIN_SECTIONS.includes(activeTab)) {
        try {
          localStorage.setItem("admin_selected_section", activeTab);
        } catch (e) {}
      }
    }
  }, [activeTab]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Centralized Unified Data Fetching across all 4 APIs
  const fetchDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    setDashboardError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const dashRes = await dashboardApiService.getAdminDashboard();

      if (dashRes && dashRes.status && dashRes.data) {
        if (dashRes.data.summary) {
          setDashboardSummary(dashRes.data.summary);
        }

        if (Array.isArray(dashRes.data.dsaUsers)) {
          setUsersData(dashRes.data.dsaUsers);
        }

        if (dashRes.data.signupRequests) {
          const pending = Array.isArray(dashRes.data.signupRequests.pending)
            ? dashRes.data.signupRequests.pending
            : [];
          const verified = Array.isArray(dashRes.data.signupRequests.verified)
            ? dashRes.data.signupRequests.verified
            : [];
          const rejected = Array.isArray(dashRes.data.signupRequests.rejected)
            ? dashRes.data.signupRequests.rejected
            : [];
          setRequestsData([...pending, ...verified, ...rejected]);
        }

        if (Array.isArray(dashRes.data.loanCases)) {
          setLoanCasesData(dashRes.data.loanCases);
        }

        if (Array.isArray(dashRes.data.notifications)) {
          setNotificationsData(dashRes.data.notifications);
        }
      } else {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [resUsers, resRequests, resCases, notifRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/corporate/requests`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/loan-case/admin/all`, { headers }).catch(() => null),
          notificationApiService.getNotifications().catch(() => null),
        ]);

        if (resUsers && resUsers.ok) {
          const json = await resUsers.json().catch(() => ({}));
          if (json.status) setUsersData(json.data || []);
        }

        if (resRequests && resRequests.ok) {
          const json = await resRequests.json().catch(() => ({}));
          if (json.status) setRequestsData(json.data || []);
        }

        if (resCases && resCases.ok) {
          const json = await resCases.json().catch(() => ({}));
          if (json.status && Array.isArray(json.data)) {
            setLoanCasesData(json.data);
          }
        }

        if (notifRes && notifRes.status && Array.isArray(notifRes.data)) {
          setNotificationsData(notifRes.data);
        }
      }

      setLastSyncTime(new Date());
    } catch (err) {
      setDashboardError("Failed to sync overview data. Please try again.");
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (user) {
      setRole(user.role || "admin");
      if (user.name) {
        setAdminName(user.name);
      }
    }

    fetchDashboardData();

    const handleDashboardUpdate = () => {
      fetchDashboardData();
    };

    socketService.subscribeDashboardUpdated(handleDashboardUpdate);

    return () => {
      socketService.unsubscribeDashboardUpdated(handleDashboardUpdate);
    };
  }, [isAuthenticated, user, fetchDashboardData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} d${diffDays > 1 ? "s" : ""} ago`;
    } catch (e) {
      return "";
    }
  };

  const getInitials = (name) => {
    if (!name) return "DS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamic Dashboard Metrics (derived from backend calculated summary or fallback)
  const totalUsersCount = dashboardSummary?.dsaUsers ?? usersData.length;

  const activeUsersCount = useMemo(() => {
    return usersData.filter(
      (u) => (u.status || "").toUpperCase() === "ACTIVE"
    ).length;
  }, [usersData]);

  const pendingRequestsCount = useMemo(() => {
    if (dashboardSummary?.signupRequests?.pending !== undefined) {
      return dashboardSummary.signupRequests.pending;
    }
    return requestsData.filter(
      (r) => (r.status || "").toUpperCase() === "PENDING"
    ).length;
  }, [dashboardSummary, requestsData]);

  const rejectedRequestsCount = useMemo(() => {
    if (dashboardSummary?.signupRequests?.rejected !== undefined) {
      return dashboardSummary.signupRequests.rejected;
    }
    return requestsData.filter(
      (r) => (r.status || "").toUpperCase() === "REJECTED"
    ).length;
  }, [dashboardSummary, requestsData]);

  const verifiedRequestsCount = useMemo(() => {
    if (dashboardSummary?.signupRequests?.verified !== undefined) {
      return dashboardSummary.signupRequests.verified;
    }
    return requestsData.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s === "VERIFIED" || s === "APPROVED";
    }).length;
  }, [dashboardSummary, requestsData]);

  const totalRequestsCount = useMemo(() => {
    if (dashboardSummary?.signupRequests) {
      const { pending = 0, verified = 0, rejected = 0 } = dashboardSummary.signupRequests;
      return pending + verified + rejected;
    }
    return requestsData.length;
  }, [dashboardSummary, requestsData]);

  // Donut Chart Segment Circumferences
  const donutMetrics = useMemo(() => {
    const total = totalRequestsCount || 1;
    const verifiedPct = (verifiedRequestsCount / total) * 100;
    const pendingPct = (pendingRequestsCount / total) * 100;
    const rejectedPct = (rejectedRequestsCount / total) * 100;

    const circumference = 238.76; // 2 * PI * 38
    const verifiedDash = (verifiedPct / 100) * circumference;
    const pendingDash = (pendingPct / 100) * circumference;
    const rejectedDash = (rejectedPct / 100) * circumference;

    return {
      total: totalRequestsCount,
      verifiedCount: verifiedRequestsCount,
      pendingCount: pendingRequestsCount,
      rejectedCount: rejectedRequestsCount,
      verifiedPct: verifiedPct.toFixed(1),
      pendingPct: pendingPct.toFixed(1),
      rejectedPct: rejectedPct.toFixed(1),
      verifiedOffset: 0,
      pendingOffset: -verifiedDash,
      rejectedOffset: -(verifiedDash + pendingDash),
      verifiedDash: `${verifiedDash} ${circumference}`,
      pendingDash: `${pendingDash} ${circumference}`,
      rejectedDash: `${rejectedDash} ${circumference}`,
    };
  }, [totalRequestsCount, verifiedRequestsCount, pendingRequestsCount, rejectedRequestsCount]);

  // Partner Bank Volume Distribution Aggregation
  const partnerBankStats = useMemo(() => {
    if (!loanCasesData || loanCasesData.length === 0) return [];
    const counts = {};
    loanCasesData.forEach((c) => {
      let bName = c.bank_name;
      if (!bName && typeof c.bank === "string") bName = c.bank;
      if (!bName && c.bank?.bank_name) bName = c.bank.bank_name;
      const normalized = (bName || "Direct / Other").trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([bankName, count]) => ({ bankName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map((b) => ({
      ...b,
      pct: Math.round((b.count / maxCount) * 100),
    }));
  }, [loanCasesData]);

  const handleSelectNotification = useCallback((notif) => {
    if (!notif) return;
    const notifType = String(notif.notification_type || "").toUpperCase();
    const entityType = String(notif.entity_type || "").toUpperCase();

    const isSignup =
      notifType === "NEW_DSA_SIGNUP" ||
      entityType === "DSA_SIGNUP_REQUEST" ||
      entityType === "DSA_SIGNUP";

    if (isSignup) {
      setActiveTab("dsa-applications");
      if (notif.entity_id) {
        setSelectedRequestId(notif.entity_id);
      }
    } else {
      setActiveTab("customer-applications");
    }
  }, []);

  const syncTimeLabel = useMemo(() => {
    if (!lastSyncTime) return "Updated just now";
    const diffMs = currentTime.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Updated just now";
    return `Updated ${diffMins}m ago`;
  }, [lastSyncTime, currentTime]);

  const handleLogout = () => {
    logout();
  };

  if (isAuthLoading || !isAuthenticated) {
    return <FinanceLoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* Topbar Header */}
      <Topbar
        role={role}
        userName={adminName}
        activeTab={activeTab}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onSelectNotification={handleSelectNotification}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        onLogout={handleLogout}
        pendingCount={pendingRequestsCount}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Workspace */}
      <main className="lg:ml-64 min-h-screen pt-16 pb-12 transition-all">
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
          {activeTab === "dsa-applications" ? (
            <DSAApplicationsList />
          ) : activeTab === "dsa" ? (
            <DSAUsersList />
          ) : activeTab === "customer-applications" ? (
            <CustomerApplicationsList />
          ) : activeTab === "company-location" ? (
            <CompanyLocationSettings onBack={() => setActiveTab("settings")} />
          ) : activeTab === "bank-master" ? (
            <BankMasterSettings onBack={() => setActiveTab("settings")} />
          ) : activeTab === "settings" ? (
            <SettingsLanding onNavigate={(targetTab) => setActiveTab(targetTab)} />
          ) : activeTab === "profile" ? (
            <MyProfile adminName={adminName} />
          ) : (
            <>
              {/* Operations Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200/80 p-5 rounded-lg">
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                    Operations Overview
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
                    Real-time view of your applications, approvals, and customer portfolio.
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-1 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={fetchDashboardData}
                    disabled={isLoadingDashboard}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-slate-500 ${isLoadingDashboard ? "animate-spin" : ""
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Sync Overview</span>
                  </button>
                  <span className="text-[11px] font-medium text-slate-400 tabular-nums pr-0.5">
                    {syncTimeLabel}
                  </span>
                </div>
              </div>

              {/* Error Banner */}
              {dashboardError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{dashboardError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDashboardData}
                    className="font-medium underline hover:text-red-900"
                  >
                    Retry Sync
                  </button>
                </div>
              )}

              {/* 4 DYNAMIC FINANCIAL / OPERATIONAL KPI CARDS ROW (LIGHT COLORFUL GRADIENT & LEFT ACCENT LINE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total DSA Users */}
                <div className="group rounded-xl border-l-4 border-blue-400 bg-gradient-to-br from-blue-50/90 via-blue-50/30 to-white p-4.5 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100/70 text-blue-700 border border-blue-200/60">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                      Live Users
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xs font-medium text-slate-500">Total DSA Users</p>
                    {isLoadingDashboard ? (
                      <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                        {totalUsersCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-normal text-slate-500">
                    Registered partner accounts
                  </div>
                </div>

                {/* 2. Active DSA Users */}
                <div className="group rounded-xl border-l-4 border-emerald-400 bg-gradient-to-br from-emerald-50/90 via-emerald-50/30 to-white p-4.5 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-700 border border-emerald-200/60">
                      <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 tabular-nums">
                      {totalUsersCount > 0
                        ? `${Math.round((activeUsersCount / totalUsersCount) * 100)}% Active`
                        : "Active"}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xs font-medium text-slate-500">Active DSA Users</p>
                    {isLoadingDashboard ? (
                      <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                        {activeUsersCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-normal text-slate-500">
                    Verified active status
                  </div>
                </div>

                {/* 3. Pending Applications */}
                <div className="group rounded-xl border-l-4 border-amber-400 bg-gradient-to-br from-amber-50/90 via-amber-50/30 to-white p-4.5 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100/70 text-amber-700 border border-amber-200/60">
                      <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                      Action Required
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xs font-medium text-slate-500">Pending Applications</p>
                    {isLoadingDashboard ? (
                      <div className="h-7 w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                        {pendingRequestsCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-normal text-slate-500">
                    Awaiting admin review
                  </div>
                </div>

                {/* 4. Rejected Applications */}
                <div className="group rounded-xl border-l-4 border-red-400 bg-gradient-to-br from-red-50/90 via-red-50/30 to-white p-4.5 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100/70 text-red-700 border border-red-200/60">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
                      Declined
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xs font-medium text-slate-500">Rejected Applications</p>
                    {isLoadingDashboard ? (
                      <div className="h-7 w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                        {rejectedRequestsCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-normal text-slate-500">
                    Declined DSA applications
                  </div>
                </div>
              </div>

              {/* NEXT-LEVEL ANALYTICS UI & REAL-TIME ACTIVITY STREAM */}
              <AdminAnalyticsUI
                dashboardSummary={dashboardSummary}
                loanCases={loanCasesData}
                dsaUsers={usersData}
                notifications={notificationsData}
                signupRequests={requestsData}
                isLoading={isLoadingDashboard}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectCase={(id) => setSelectedRequestId(id)}
              />
            </>
          )}
        </div>
      </main>

{/* DSA Application View/Verify Modal */}
      {selectedRequestId && (
        <DSAApplicationModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onRejectSuccess={() => {
            setSelectedRequestId(null);
            fetchDashboardData();
          }}
          onVerifySuccess={() => {
            setSelectedRequestId(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}