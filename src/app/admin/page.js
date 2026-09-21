"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DSAApplicationModal from "./components/DSAApplicationModal";
import AdminAnalyticsUI from "./components/AdminAnalyticsUI";
import { dashboardApiService } from "@/services/dashboardApiService";
import { socketService } from "@/services/socketService";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Backward compatibility: redirect any legacy ?tab= queries to clean URL routes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab");
        if (tabParam) {
          const tabMap = {
            "dsa-applications": "/admin/dsa-applications",
            "dsa": "/admin/dsa-users",
            "customer-applications": "/admin/customer-applications",
            "support-tickets": "/admin/support-tickets",
            "settings": "/admin/settings",
            "company-location": "/admin/company-location",
            "bank-master": "/admin/bank-master",
            "profile": "/admin/profile",
          };
          if (tabMap[tabParam]) {
            router.replace(tabMap[tabParam]);
          }
        }
      } catch (e) {}
    }
  }, [router]);

  const [selectedRequestId, setSelectedRequestId] = useState(null);

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

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Centralized Unified Data Fetching across APIs
  const fetchDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    setDashboardError("");
    const startTime = Date.now();

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
          fetch(`${API_BASE_URL}/notifications/admin`, { headers }).catch(() => null),
        ]);

        if (resUsers && resUsers.ok) {
          const uData = await resUsers.json();
          if (uData.status && Array.isArray(uData.data)) {
            setUsersData(uData.data);
          }
        }

        if (resRequests && resRequests.ok) {
          const rData = await resRequests.json();
          if (rData.status && Array.isArray(rData.data)) {
            setRequestsData(rData.data);
          }
        }

        if (resCases && resCases.ok) {
          const cData = await resCases.json();
          if (cData.status && Array.isArray(cData.data)) {
            setLoanCasesData(cData.data);
          }
        }

        if (notifRes && notifRes.ok) {
          const nData = await notifRes.json();
          if (nData.status && Array.isArray(nData.data)) {
            setNotificationsData(nData.data);
          }
        }
      }
    } catch (err) {
      setDashboardError("Failed to fetch live dashboard updates. Showing recent records.");
    } finally {
      const elapsed = Date.now() - startTime;
      const minDelay = 250;
      if (elapsed < minDelay) {
        setTimeout(() => {
          setIsLoadingDashboard(false);
          setLastSyncTime(new Date());
        }, minDelay - elapsed);
      } else {
        setIsLoadingDashboard(false);
        setLastSyncTime(new Date());
      }
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time socket updates
  useEffect(() => {
    const handleRealtimeNotif = (notif) => {
      setNotificationsData((prev) => [notif, ...prev]);
      const notifType = String(notif?.notification_type || "").toUpperCase();
      if (notifType === "NEW_DSA_SIGNUP" || notifType === "STATUS_UPDATE") {
        fetchDashboardData();
      }
    };

    if (typeof socketService?.subscribeToNotifications === "function") {
      socketService.subscribeToNotifications(handleRealtimeNotif);
    }

    return () => {
      if (typeof socketService?.unsubscribeFromNotifications === "function") {
        socketService.unsubscribeFromNotifications(handleRealtimeNotif);
      }
    };
  }, [fetchDashboardData]);

  // Derived Metric Calculations
  const totalUsersCount = useMemo(() => {
    if (dashboardSummary?.totalDsaUsers !== undefined) {
      return Number(dashboardSummary.totalDsaUsers);
    }
    return usersData.length;
  }, [dashboardSummary, usersData]);

  const activeUsersCount = useMemo(() => {
    if (dashboardSummary?.activeDsaUsers !== undefined) {
      return Number(dashboardSummary.activeDsaUsers);
    }
    return usersData.filter((u) => u.status === "ACTIVE" || u.status === "Active" || u.isActive === true).length;
  }, [dashboardSummary, usersData]);

  const pendingRequestsCount = useMemo(() => {
    if (dashboardSummary?.pendingRequests !== undefined) {
      return Number(dashboardSummary.pendingRequests);
    }
    return requestsData.filter((r) => (r.status || "").toLowerCase() === "pending").length;
  }, [dashboardSummary, requestsData]);

  const rejectedRequestsCount = useMemo(() => {
    if (dashboardSummary?.rejectedRequests !== undefined) {
      return Number(dashboardSummary.rejectedRequests);
    }
    return requestsData.filter((r) => (r.status || "").toLowerCase() === "rejected").length;
  }, [dashboardSummary, requestsData]);

  const syncTimeLabel = useMemo(() => {
    if (!lastSyncTime) return "Updated just now";
    const diffMs = currentTime.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Updated just now";
    return `Updated ${diffMins}m ago`;
  }, [lastSyncTime, currentTime]);

  return (
    <>
      {/* Operations Overview Header */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="shrink-0 select-none flex items-center justify-center">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="opBar1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#9333EA" />
                </linearGradient>
                <linearGradient id="opBar2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#7E22CE" />
                </linearGradient>
                <linearGradient id="opBar3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B063FF" />
                  <stop offset="100%" stopColor="#6B21A8" />
                </linearGradient>
                <linearGradient id="opTrend" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#7E22CE" floodOpacity="0.22" />
                </filter>
              </defs>
              <g filter="url(#iconShadow)">
                <rect x="3" y="11" width="4.5" height="10" rx="1.6" fill="url(#opBar1)" />
                <rect x="9.75" y="6.5" width="4.5" height="14.5" rx="1.6" fill="url(#opBar2)" />
                <rect x="16.5" y="2.5" width="4.5" height="18.5" rx="1.6" fill="url(#opBar3)" />
                <path
                  d="M3.2 13.5L9.5 8L15 9.5L20.5 3.2"
                  stroke="url(#opTrend)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="20.5" cy="3.2" r="1.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.8" />
              </g>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              Operations Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal hidden sm:block">
              Real-time view of your applications, approvals, and customer portfolio.
            </p>
            <p className="text-[11px] text-slate-400 font-normal sm:hidden mt-0.5 tabular-nums">
              {syncTimeLabel}
            </p>
          </div>
        </div>

        {/* Sync Overview Button Container with timestamp */}
        <div className="relative shrink-0 flex items-center">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoadingDashboard}
            title="Sync Overview"
            className={`inline-flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3.5 rounded-md text-xs font-medium transition-colors shrink-0 sm:min-w-[124px] ${
              isLoadingDashboard
                ? "bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed shadow-2xs"
                : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer shadow-2xs"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 text-purple-600 shrink-0 ${
                isLoadingDashboard ? "animate-spin" : ""
              }`}
              style={isLoadingDashboard ? { animationDuration: "1.4s" } : {}}
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
            <span className="hidden sm:inline">
              {isLoadingDashboard ? "Syncing..." : "Sync Overview"}
            </span>
          </button>
          <span className="hidden sm:block absolute top-full mt-1 right-0.5 text-[11px] font-medium text-slate-400 tabular-nums whitespace-nowrap pointer-events-none">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Total DSA Users */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-blue-400 bg-gradient-to-br from-blue-50/90 via-blue-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-blue-100/70 text-blue-700 border border-blue-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-blue-200/60 truncate">
              Live Users
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total DSA Users</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-16 sm:w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {totalUsersCount.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block">
            Registered partner accounts
          </div>
        </div>

        {/* 2. Active DSA Users */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-emerald-400 bg-gradient-to-br from-emerald-50/90 via-emerald-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-700 border border-emerald-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-emerald-200/60 tabular-nums truncate">
              {totalUsersCount > 0
                ? `${Math.round((activeUsersCount / totalUsersCount) * 100)}% Active`
                : "Active"}
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Active DSA Users</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-16 sm:w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {activeUsersCount.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block">
            Verified active status
          </div>
        </div>

        {/* 3. Pending Applications */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-amber-400 bg-gradient-to-br from-amber-50/90 via-amber-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-amber-100/70 text-amber-700 border border-amber-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-amber-200/60 truncate">
              <span className="sm:hidden">Action</span>
              <span className="hidden sm:inline">Action Required</span>
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              <span className="sm:hidden">Pending Apps</span>
              <span className="hidden sm:inline">Pending Applications</span>
            </p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-14 sm:w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {pendingRequestsCount.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block">
            Awaiting admin review
          </div>
        </div>

        {/* 4. Rejected Applications */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-red-400 bg-gradient-to-br from-red-50/90 via-red-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-red-100/70 text-red-700 border border-red-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-red-200/60 truncate">
              Declined
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              <span className="sm:hidden">Rejected Apps</span>
              <span className="hidden sm:inline">Rejected Applications</span>
            </p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-14 sm:w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {rejectedRequestsCount.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block">
            Declined DSA applications
          </div>
        </div>
      </div>

      {/* ANALYTICS UI & REAL-TIME ACTIVITY STREAM */}
      <AdminAnalyticsUI
        dashboardSummary={dashboardSummary}
        loanCases={loanCasesData}
        dsaUsers={usersData}
        notifications={notificationsData}
        signupRequests={requestsData}
        isLoading={isLoadingDashboard}
        onNavigateTab={(tab) => {
          if (tab === "customer-applications") {
            router.push("/admin/customer-applications");
          } else if (tab === "dsa") {
            router.push("/admin/dsa-users");
          } else {
            router.push(`/admin/${tab}`);
          }
        }}
        onSelectCase={(id) => setSelectedRequestId(id)}
      />

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
    </>
  );
}