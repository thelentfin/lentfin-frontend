"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import DSAApplicationModal from "./components/DSAApplicationModal";
import AdminAnalyticsUI from "./components/AdminAnalyticsUI";
import { dashboardApiService } from "@/services/dashboardApiService";
import { socketService } from "@/services/socketService";

/**
 * Smooth Animated Number Counter Component
 * Counts smoothly from 0 to target value on mount/render using an ease-out cubic curve.
 * Zero layout shifts, identical font styles.
 */
function AnimatedNumber({ value = 0, duration = 850, isCurrency = false, className }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startValRef = useRef(0);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const target = typeof value === "number" ? value : Number(value) || 0;
  const isTargetCr = isCurrency && Math.abs(target) >= 10000000;

  useEffect(() => {
    const start = startValRef.current;
    startTimeRef.current = null;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease-out cubic curve (fast start, gentle settle)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        startValRef.current = target;
        setDisplayValue(target);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [target, duration]);

  if (isCurrency) {
    if (isTargetCr) {
      const crVal = (Math.abs(displayValue) / 10000000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
      return <span className={className}>{`${displayValue < 0 ? "-" : ""}₹${crVal} Cr`}</span>;
    }
    return <span className={className}>{`₹${Math.round(displayValue).toLocaleString("en-IN")}`}</span>;
  }

  return <span className={className}>{Math.round(displayValue).toLocaleString("en-IN")}</span>;
}

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
          const paymentsByCaseId = {};
          if (Array.isArray(dashRes.data.payments)) {
            dashRes.data.payments.forEach((p) => {
              if (p && p.case_id) paymentsByCaseId[p.case_id] = p;
            });
          }
          const enriched = dashRes.data.loanCases.map((lc) => {
            const p = paymentsByCaseId[lc.id];
            return {
              ...lc,
              payment_amount: p?.payment_amount || lc.total_paid || 0,
              payment_option: p?.payment_option,
              payment_percentage: p?.payment_percentage,
            };
          });
          setLoanCasesData(enriched);
        }

        if (Array.isArray(dashRes.data.notifications)) {
          setNotificationsData(dashRes.data.notifications);
        }
      } else {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [resUsers, resRequests, resCases, notifRes, resPayments] = await Promise.all([
          fetch(`${API_BASE_URL}/users`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/corporate/requests`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/loan-case/admin/all`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/notifications/admin`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/loan-payment/admin/all`, { headers }).catch(() => null),
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

        let paymentsMap = {};
        if (resPayments && resPayments.ok) {
          const pData = await resPayments.json().catch(() => ({}));
          if (pData.status && Array.isArray(pData.data)) {
            pData.data.forEach((p) => {
              if (p && p.case_id) paymentsMap[p.case_id] = p;
            });
          }
        }

        if (resCases && resCases.ok) {
          const cData = await resCases.json();
          if (cData.status && Array.isArray(cData.data)) {
            const enriched = cData.data.map((lc) => {
              const p = paymentsMap[lc.id];
              return {
                ...lc,
                payment_amount: p?.payment_amount || lc.total_paid || 0,
                payment_option: p?.payment_option,
                payment_percentage: p?.payment_percentage,
              };
            });
            setLoanCasesData(enriched);
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

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
    const num = Number(val);
    const absNum = Math.abs(num);
    if (absNum >= 10000000) {
      const crVal = (absNum / 10000000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
      return `${num < 0 ? "-" : ""}₹${crVal} Cr`;
    }
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString("en-IN", {
      maximumFractionDigits: hasDecimals ? 2 : 0,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    })}`;
  };

  const finMetrics = useMemo(() => {
    if (dashboardSummary?.financialMetrics) {
      return dashboardSummary.financialMetrics;
    }
    let totalInflow = 0;
    let recInflow = 0;
    let pendInflow = 0;
    let totalPayout = 0;
    let paidPayout = 0;
    let pendPayout = 0;
    let totalProfit = 0;
    let totalDisb = 0;
    let totalSanc = 0;

    loanCasesData.forEach((lc) => {
      const sanctionAmt = Number(lc.sanction_amount || 0);
      const disbAmt = Number(lc.disbursement_amount || 0);
      const baseAmount = disbAmt > 0 ? disbAmt : sanctionAmt;
      totalSanc += sanctionAmt;
      totalDisb += disbAmt;

      const paymentPct = Number(lc.payment_percentage || 0.85);
      const comm = Number(lc.payment_amount || Math.round((baseAmount * paymentPct) / 100));
      const corpRate = lc.corporate_rate ? Number(lc.corporate_rate) : (lc.payout_percentage ? Number(lc.payout_percentage) : null);
      const corpInflow = corpRate ? Math.round(((baseAmount * corpRate) / 100) * 100) / 100 : 0;
      const corpRec = Number(lc.corporate_received_amount || 0);

      totalInflow += corpInflow;
      recInflow += corpRec;
      pendInflow += Math.max(0, corpInflow - corpRec);
      totalPayout += comm;
      if (["ACCEPTED", "APPROVED", "VERIFIED"].includes(String(lc.status || "").toUpperCase())) {
        paidPayout += comm;
      } else {
        pendPayout += comm;
      }
      if (corpRate) {
        totalProfit += Math.max(0, corpInflow - comm);
      }
    });

    const avgMargin = totalDisb > 0 && totalProfit > 0 ? (totalProfit / totalDisb) * 100 : 0;

    return {
      corporateInflow: { total: totalInflow, received: recInflow, pending: pendInflow },
      dsaPayouts: { total: totalPayout, paid: paidPayout, pending: pendPayout },
      netPlatformSpread: { totalProfit, averageMargin: Math.round(avgMargin * 100) / 100 },
      portfolioDisbursed: { totalDisbursed: totalDisb, totalSanctioned: totalSanc, totalCases: loanCasesData.length },
    };
  }, [dashboardSummary, loanCasesData]);

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Operations Overview Header */}
      <div className="flex flex-row items-center justify-between gap-3 px-1 sm:px-1.5 pt-1 pb-3 sm:pb-4 border-b border-slate-200/80">
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
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
              Real-time view of your applications, approvals, and customer portfolio.
            </p>
          </div>
        </div>

        {/* Sync Overview Button */}
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

      {/* 4 DYNAMIC FINANCIAL KPI CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Net Platform Spread */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-emerald-400 bg-gradient-to-br from-emerald-50/90 via-emerald-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-700 border border-emerald-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-emerald-200/60 tabular-nums truncate">
              {finMetrics?.netPlatformSpread?.averageMargin != null
                ? `+${Number(finMetrics.netPlatformSpread.averageMargin).toFixed(2)}% Spread`
                : "Live Spread"}
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Net Platform Spread</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-emerald-700 tracking-tight tabular-nums mt-0.5">
                <AnimatedNumber value={finMetrics?.netPlatformSpread?.totalProfit || 0} isCurrency />
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block truncate">
            LentFin net earnings
          </div>
        </div>

        {/* 2. Corporate Inflow */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-purple-400 bg-gradient-to-br from-purple-50/90 via-purple-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-purple-100/70 text-purple-700 border border-purple-200/60 shrink-0 font-bold text-xs sm:text-sm">
              ₹
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-purple-200/60 truncate">
              Rec&apos;d: <AnimatedNumber value={finMetrics?.corporateInflow?.received || 0} isCurrency />
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Corporate Inflow</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                <AnimatedNumber value={finMetrics?.corporateInflow?.total || 0} isCurrency />
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block truncate">
            Pending: <span className="text-amber-600 font-medium"><AnimatedNumber value={finMetrics?.corporateInflow?.pending || 0} isCurrency /></span>
          </div>
        </div>

        {/* 3. DSA Partner Payouts */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-amber-400 bg-gradient-to-br from-amber-50/90 via-amber-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-amber-100/70 text-amber-700 border border-amber-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-amber-200/60 truncate">
              Paid: <AnimatedNumber value={finMetrics?.dsaPayouts?.paid || 0} isCurrency />
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">DSA Partner Payouts</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                <AnimatedNumber value={finMetrics?.dsaPayouts?.total || 0} isCurrency />
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block truncate">
            Pending: <span className="text-amber-600 font-medium"><AnimatedNumber value={finMetrics?.dsaPayouts?.pending || 0} isCurrency /></span>
          </div>
        </div>

        {/* 4. Portfolio Disbursed */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-blue-400 bg-gradient-to-br from-blue-50/90 via-blue-50/30 to-white p-3 sm:p-4.5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-blue-100/70 text-blue-700 border border-blue-200/60 shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 sm:px-2 rounded-md border border-blue-200/60 truncate">
              Audited Volume
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Portfolio Disbursed</p>
            {isLoadingDashboard ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold sm:font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                <AnimatedNumber value={finMetrics?.portfolioDisbursed?.totalDisbursed || 0} isCurrency />
              </p>
            )}
          </div>
          <div className="mt-1.5 text-[11px] font-normal text-slate-500 hidden sm:block truncate">
            <AnimatedNumber value={finMetrics?.portfolioDisbursed?.totalCases || loanCasesData.length} /> total loan cases
          </div>
        </div>
      </div>

      {/* COMPACT PARTNER OPERATIONS: PROPER 2x2 GRID ON MOBILE, 4-COLUMN BAR ON DESKTOP (BORDERLESS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-0 gap-y-2 sm:gap-y-0 sm:divide-x divide-slate-200/70 py-2 sm:py-1 px-1">
        {/* 1. Total DSAs */}
        <div className="px-1 sm:px-4 py-1 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-700 text-xs font-bold shrink-0">
            👥
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">Total DSAs:</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
            <AnimatedNumber value={totalUsersCount} />
          </span>
        </div>

        {/* 2. Active DSAs */}
        <div className="px-1 sm:px-4 py-1 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-700 text-xs font-bold shrink-0">
            🟢
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">Active DSAs:</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-700 tabular-nums">
            <AnimatedNumber value={activeUsersCount} />
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 tabular-nums shrink-0">
            {totalUsersCount > 0 ? Math.round((activeUsersCount / totalUsersCount) * 100) : 0}%
          </span>
        </div>

        {/* 3. Pending Applications */}
        <div className="px-1 sm:px-4 py-1 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-50 text-amber-700 text-xs font-bold shrink-0">
            ⏳
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">Pending Reviews:</span>
          <span className="text-xs sm:text-sm font-bold text-amber-700 tabular-nums">
            <AnimatedNumber value={pendingRequestsCount} />
          </span>
        </div>

        {/* 4. Rejected Applications */}
        <div className="px-1 sm:px-4 py-1 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-red-50 text-red-700 text-xs font-bold shrink-0">
            ❌
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">Declined:</span>
          <span className="text-xs sm:text-sm font-bold text-red-600 tabular-nums">
            <AnimatedNumber value={rejectedRequestsCount} />
          </span>
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
    </div>
  );
}