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
import { notificationApiService } from "@/services/notificationApiService";
import { useAuth } from "@/hooks/useAuth";

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

  // Calculated Real Dynamic Dashboard Metrics
  const totalUsersCount = usersData.length;
  const activeUsersCount = useMemo(() => {
    return usersData.filter(
      (u) => (u.status || "").toUpperCase() === "ACTIVE"
    ).length;
  }, [usersData]);

  const pendingRequestsCount = useMemo(() => {
    return requestsData.filter(
      (r) => (r.status || "").toUpperCase() === "PENDING"
    ).length;
  }, [requestsData]);

  const rejectedRequestsCount = useMemo(() => {
    return requestsData.filter(
      (r) => (r.status || "").toUpperCase() === "REJECTED"
    ).length;
  }, [requestsData]);

  const verifiedRequestsCount = useMemo(() => {
    return requestsData.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s === "VERIFIED" || s === "APPROVED";
    }).length;
  }, [requestsData]);

  const totalRequestsCount = requestsData.length;

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
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full" />
      </div>
    );
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

              {/* 4 DYNAMIC FINANCIAL / OPERATIONAL KPI CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total DSA Users */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
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
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
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
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
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
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
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

              {/* DYNAMIC ANALYTICS & RECENT ACTIVITY GRID ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 1. DYNAMIC APPLICATION STATUS DONUT CHART (5 COLS) */}
                <div className="lg:col-span-4 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                        Application Status Pipeline
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Live API</span>
                  </div>

                  {/* Donut Content Area */}
                  {isLoadingDashboard ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-28 h-28 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                  ) : donutMetrics.total === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
                      No application status data available.
                    </div>
                  ) : (
                    <div className="relative py-4 flex flex-col items-center justify-center my-auto">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {/* Segment 1: Verified (Green) */}
                          {donutMetrics.verifiedCount > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="12"
                              strokeDasharray={donutMetrics.verifiedDash}
                              strokeDashoffset={donutMetrics.verifiedOffset}
                            />
                          )}

                          {/* Segment 2: Pending (Amber) */}
                          {donutMetrics.pendingCount > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f59e0b"
                              strokeWidth="12"
                              strokeDasharray={donutMetrics.pendingDash}
                              strokeDashoffset={donutMetrics.pendingOffset}
                            />
                          )}

                          {/* Segment 3: Rejected (Red) */}
                          {donutMetrics.rejectedCount > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#ef4444"
                              strokeWidth="12"
                              strokeDasharray={donutMetrics.rejectedDash}
                              strokeDashoffset={donutMetrics.rejectedOffset}
                            />
                          )}
                        </svg>

                        {/* Center Text */}
                        <div className="absolute flex flex-col items-center text-center">
                          <span className="text-lg font-semibold text-slate-900 leading-tight tabular-nums">
                            {donutMetrics.total}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            Total
                          </span>
                        </div>
                      </div>

                      {/* Donut Legend */}
                      <div className="mt-4 grid grid-cols-3 gap-2 w-full text-center">
                        <div className="p-1.5 rounded-md bg-amber-50/60 border border-amber-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-medium text-slate-700">Pending</span>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-800 block mt-0.5 tabular-nums">
                            {donutMetrics.pendingCount} ({donutMetrics.pendingPct}%)
                          </span>
                        </div>

                        <div className="p-1.5 rounded-md bg-emerald-50/60 border border-emerald-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-medium text-slate-700">Verified</span>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-800 block mt-0.5 tabular-nums">
                            {donutMetrics.verifiedCount} ({donutMetrics.verifiedPct}%)
                          </span>
                        </div>

                        <div className="p-1.5 rounded-md bg-red-50/60 border border-red-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] font-medium text-slate-700">Rejected</span>
                          </div>
                          <span className="text-[11px] font-semibold text-red-700 block mt-0.5 tabular-nums">
                            {donutMetrics.rejectedCount} ({donutMetrics.rejectedPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. DYNAMIC PARTNER BANK DISTRIBUTION BAR CHART (4 COLS) */}
                <div className="lg:col-span-5 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                        Partner Bank Application Volume
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Customer Cases</span>
                  </div>

                  {isLoadingDashboard ? (
                    <div className="py-12 space-y-3 my-auto">
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-3/4" />
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-1/2" />
                    </div>
                  ) : partnerBankStats.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
                      No partner bank application data available.
                    </div>
                  ) : (
                    <div className="py-3 space-y-3 my-auto">
                      {partnerBankStats.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-800 truncate max-w-[180px]">
                              {item.bankName}
                            </span>
                            <span className="text-slate-600 font-semibold tabular-nums">
                              {item.count} case{item.count > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-800 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(8, item.pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. DYNAMIC RECENT SYSTEM ACTIVITY STREAM (3 COLS) */}
                <div className="lg:col-span-3 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                      Recent Activity
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("dsa-applications")}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      View all
                    </button>
                  </div>

                  {/* Activity List */}
                  {isLoadingDashboard ? (
                    <div className="py-8 space-y-3 my-auto">
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-5/6" />
                    </div>
                  ) : notificationsData.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
                      No recent activity recorded.
                    </div>
                  ) : (
                    <div className="py-2 space-y-3 my-auto">
                      {notificationsData.slice(0, 5).map((act, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                            🔔
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-900 leading-snug truncate">
                              {act.title || "System Event"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {act.message || act.notification_type}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM SECTION: RECENT APPLICATIONS TABLE */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 lg:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
                  <h3 className="text-sm font-semibold text-slate-900">Recent Applications</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dsa-applications")}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all applications</span>
                    <span>→</span>
                  </button>
                </div>

                {isLoadingDashboard ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-normal">
                    Loading recent applications...
                  </div>
                ) : requestsData.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80">
                    No recent applications found.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                            <th className="py-3 px-3">Applicant Name</th>
                            <th className="py-3 px-3">Company Name</th>
                            <th className="py-3 px-3">Location</th>
                            <th className="py-3 px-3">Applied On</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {requestsData.slice(0, 5).map((app) => {
                            const status = (app.status || "PENDING").toUpperCase();
                            const isPending = status === "PENDING";
                            const isVerified = status === "VERIFIED" || status === "APPROVED";
                            const isRejected = status === "REJECTED";

                            return (
                              <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold flex items-center justify-center text-xs shrink-0">
                                      {getInitials(app.name)}
                                    </div>
                                    <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                                      {app.name || "N/A"}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-3 text-slate-700 font-medium">
                                  {app.request_company_name || app.company_name || "N/A"}
                                </td>

                                <td className="py-3.5 px-3 text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">📍</span>
                                    <span>{app.request_location || app.location_name || "N/A"}</span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-3 text-slate-500 font-normal tabular-nums">
                                  {formatDate(app.created_at)}
                                </td>

                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${isPending
                                        ? "bg-amber-50 text-amber-700 border-amber-200/80"
                                        : isVerified
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                          : isRejected
                                            ? "bg-red-50 text-red-600 border-red-200/80"
                                            : "bg-slate-100 text-slate-600 border-slate-200/80"
                                      }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${isPending
                                          ? "bg-amber-500"
                                          : isVerified
                                            ? "bg-emerald-500"
                                            : "bg-red-500"
                                        }`}
                                    />
                                    {isPending ? "Pending" : isVerified ? "Verified" : isRejected ? "Rejected" : status}
                                  </span>
                                </td>

                                <td className="py-3.5 px-3 text-right">
                                  <button
                                    type="button"
                                    title="View Application"
                                    aria-label="View Application"
                                    onClick={() => setSelectedRequestId(app.id)}
                                    className="p-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                                  >
                                    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards List View */}
                    <div className="block md:hidden space-y-3">
                      {requestsData.slice(0, 5).map((app) => {
                        const status = (app.status || "PENDING").toUpperCase();
                        const isPending = status === "PENDING";
                        const isVerified = status === "VERIFIED" || status === "APPROVED";
                        const isRejected = status === "REJECTED";
                        const companyName = app.request_company_name || app.company_name || "N/A";
                        const locationName = app.request_location || app.location_name || "N/A";

                        return (
                          <div
                            key={app.id}
                            className="rounded-md border border-slate-200/80 bg-white p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0">
                                  {getInitials(app.name)}
                                </div>
                                <span className="font-semibold text-slate-900 text-xs truncate">
                                  {app.name || "N/A"}
                                </span>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${isPending
                                    ? "bg-amber-50 text-amber-700 border-amber-200/80"
                                    : isVerified
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                      : isRejected
                                        ? "bg-red-50 text-red-600 border-red-200/80"
                                        : "bg-slate-100 text-slate-600 border-slate-200/80"
                                  }`}
                              >
                                {isPending ? "Pending" : isVerified ? "Verified" : isRejected ? "Rejected" : status}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-600">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-400 shrink-0">🏢</span>
                                <span className="truncate font-medium text-slate-800">{companyName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 shrink-0">📍</span>
                                <span>{locationName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5 tabular-nums">
                                <span>📅 Applied: {formatDate(app.created_at)}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                Application Request
                              </span>
                              <button
                                type="button"
                                title="View Application"
                                aria-label="View Application"
                                onClick={() => setSelectedRequestId(app.id)}
                                className="p-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>View</span>
                                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
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