"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CustomerManagement from "./components/CustomerManagement";
import MyProfile from "../admin/components/MyProfile";
import CustomerRegistrationModal from "./components/customer/CustomerRegistrationModal";
import { customerApiService } from "@/services/customerApiService";

export default function DSADashboard() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [userName, setUserName] = useState("");

  // Live Data States
  const [customerCases, setCustomerCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Selected Customer for Detail Drawer Modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Automatic ticker to recalculate elapsed sync time every 10 seconds without page refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingCases(true);
    setFetchError("");
    try {
      const data = await customerApiService.fetchCustomerCases();
      setCustomerCases(data || []);
      setLastSyncTime(new Date());
    } catch (err) {
      setFetchError("Unable to sync customer cases. Please try again.");
    } finally {
      setIsLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (!token) {
      router.push("/");
      return;
    }

    if ((storedRole || "").toLowerCase() !== "dsa") {
      router.push("/");
      return;
    }

    setRole(storedRole);

    const storedName = localStorage.getItem("userName") || localStorage.getItem("name");
    if (storedName && !storedName.includes("@")) {
      setUserName(storedName.trim());
    } else {
      setUserName("DSA Partner");
    }

    loadDashboardData();
  }, [router, loadDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    router.push("/");
  };

  const navItems = [
    { id: "overview", label: "My Dashboard", icon: "overview" },
    { id: "applications", label: "Applications", icon: "applications" },
    { id: "customers", label: "Customer Management", icon: "customers" },
    { id: "commission", label: "Commission", icon: "commission" },
    { id: "support", label: "Support", icon: "support" },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case "applications":
        return "Applications";
      case "customers":
        return "Customer Management";
      case "commission":
        return "Commission";
      case "support":
        return "Support";
      case "profile":
        return "My Profile";
      case "overview":
      default:
        return "Dashboard";
    }
  };

  // Sync Timestamp Label
  const syncTimeLabel = useMemo(() => {
    if (!lastSyncTime) return "Updated just now";
    const diffMs = currentTime.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Updated just now";
    return `Updated ${diffMins}m ago`;
  }, [lastSyncTime, currentTime]);

  // Real Dynamic KPI Card Calculations
  const totalApplications = customerCases.length;

  const approvedCasesCount = useMemo(() => {
    return customerCases.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return s === "accepted" || s === "approved" || s === "verified";
    }).length;
  }, [customerCases]);

  const pddPendingCount = useMemo(() => {
    return customerCases.filter((c) => !c.pddCleared).length;
  }, [customerCases]);

  const totalSanctionVolume = useMemo(() => {
    return customerCases.reduce((sum, c) => {
      const rawStr = String(c.sanctionAmount || "").replace(/[^0-9.]/g, "");
      const val = parseFloat(rawStr) || 0;
      return sum + val;
    }, 0);
  }, [customerCases]);

  // Donut Chart Metrics Calculation
  const donutMetrics = useMemo(() => {
    const total = totalApplications;
    let accepted = 0;
    let submitted = 0;
    let rejected = 0;

    customerCases.forEach((c) => {
      const s = (c.status || "").toLowerCase().trim();
      if (s === "accepted" || s === "approved" || s === "verified") {
        accepted++;
      } else if (s === "rejected") {
        rejected++;
      } else {
        submitted++;
      }
    });

    const divisor = total || 1;
    const acceptedPct = (accepted / divisor) * 100;
    const submittedPct = (submitted / divisor) * 100;
    const rejectedPct = (rejected / divisor) * 100;

    const circumference = 238.76; // 2 * PI * 38
    const acceptedDash = (acceptedPct / 100) * circumference;
    const submittedDash = (submittedPct / 100) * circumference;
    const rejectedDash = (rejectedPct / 100) * circumference;

    return {
      total,
      acceptedCount: accepted,
      submittedCount: submitted,
      rejectedCount: rejected,
      acceptedPct: acceptedPct.toFixed(1),
      submittedPct: submittedPct.toFixed(1),
      rejectedPct: rejectedPct.toFixed(1),
      acceptedOffset: 0,
      submittedOffset: -acceptedDash,
      rejectedOffset: -(acceptedDash + submittedDash),
      acceptedDash: `${acceptedDash} ${circumference}`,
      submittedDash: `${submittedDash} ${circumference}`,
      rejectedDash: `${rejectedDash} ${circumference}`,
    };
  }, [totalApplications, customerCases]);

  // Action Required Items (PDD Pending or Actionable Statuses)
  const actionRequiredCases = useMemo(() => {
    return customerCases.filter((c) => !c.pddCleared || (c.status || "").toLowerCase().includes("pending")).slice(0, 5);
  }, [customerCases]);

  // Applications Trend Data (Grouped by Month/Period)
  const trendData = useMemo(() => {
    if (!customerCases || customerCases.length === 0) return [];
    
    const monthCounts = {};
    customerCases.forEach((c) => {
      let rawDate = c.disbursementDate || c.date;
      let monthLabel = "Recent";
      if (rawDate && rawDate !== "—") {
        try {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            monthLabel = parsed.toLocaleDateString("en-IN", { month: "short" });
          }
        } catch (e) {}
      }
      monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
    });

    const entries = Object.entries(monthCounts);
    if (entries.length === 1) {
      // Create smooth fallback points if only 1 month
      return [
        { label: "Prev Wk", count: 0 },
        { label: entries[0][0], count: entries[0][1] },
      ];
    }
    return entries.map(([label, count]) => ({ label, count }));
  }, [customerCases]);

  const statusStyles = {
    Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Verified: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Submitted: "bg-amber-50 text-amber-700 border-amber-200/80",
    Pending: "bg-amber-50 text-amber-700 border-amber-200/80",
    "Under Review": "bg-amber-50 text-amber-700 border-amber-200/80",
    Rejected: "bg-red-50 text-red-700 border-red-200/80",
  };

  const statusDots = {
    Accepted: "bg-emerald-500",
    Approved: "bg-emerald-500",
    Verified: "bg-emerald-500",
    Submitted: "bg-amber-500",
    Pending: "bg-amber-500",
    "Under Review": "bg-amber-500",
    Rejected: "bg-red-500",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* Topbar Header */}
      <Topbar
        title={getPageTitle()}
        userName={userName}
        onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Workspace */}
      <main className="lg:ml-64 min-h-screen pt-16 transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
          {/* Overview Tab Content */}
          {activeTab === "overview" && (
            <>
              {/* Operations Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-lg">
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
                    onClick={loadDashboardData}
                    disabled={isLoadingCases}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-slate-500 ${
                        isLoadingCases ? "animate-spin" : ""
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
              {fetchError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="font-medium underline hover:text-red-900 cursor-pointer"
                  >
                    Retry Sync
                  </button>
                </div>
              )}

              {/* 4 DYNAMIC MERCURY KPI CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Applications */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium text-slate-500">Total Applications</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 border border-slate-200/80 text-slate-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-1">
                    {isLoadingCases ? (
                      <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                        {totalApplications.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal mt-1.5">
                    Registered customer cases
                  </p>
                </div>

                {/* 2. Accepted Cases */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium text-slate-500">Accepted Cases</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-1">
                    {isLoadingCases ? (
                      <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                        {approvedCasesCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1.5 tabular-nums">
                    {totalApplications > 0 ? `${Math.round((approvedCasesCount / totalApplications) * 100)}% approval rate` : "Sanctioned loans"}
                  </p>
                </div>

                {/* 3. PDD Pending */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium text-slate-500">PDD Pending</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 border border-amber-200/60 text-amber-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-1">
                    {isLoadingCases ? (
                      <div className="h-7 w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                        {pddPendingCount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium mt-1.5">
                    Post-disbursement documents
                  </p>
                </div>

                {/* 4. Sanction Volume */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4.5 transition-colors hover:border-slate-300">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium text-slate-500">Sanction Volume</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs">
                      ₹
                    </div>
                  </div>
                  <div className="mt-1">
                    {isLoadingCases ? (
                      <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                        ₹{totalSanctionVolume.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal mt-1.5">
                    Total cumulative loan value
                  </p>
                </div>
              </div>

              {/* DYNAMIC ANALYTICS GRID (DONUT CHART & TREND LINE CHART) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 1. APPLICATION STATUS DONUT CHART (6 COLS) */}
                <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                        Application Status Distribution
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Portfolio</span>
                  </div>

                  {isLoadingCases ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                  ) : (
                    <div className="relative py-4 flex flex-col items-center justify-center my-auto">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {donutMetrics.total === 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#e2e8f0"
                              strokeWidth="12"
                            />
                          )}

                          {donutMetrics.acceptedCount > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="12"
                              strokeDasharray={donutMetrics.acceptedDash}
                              strokeDashoffset={donutMetrics.acceptedOffset}
                            />
                          )}

                          {donutMetrics.submittedCount > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f59e0b"
                              strokeWidth="12"
                              strokeDasharray={donutMetrics.submittedDash}
                              strokeDashoffset={donutMetrics.submittedOffset}
                            />
                          )}

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

                        <div className="absolute flex flex-col items-center text-center">
                          <span className="text-lg font-semibold text-slate-900 leading-tight tabular-nums">
                            {donutMetrics.total}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            Cases
                          </span>
                        </div>
                      </div>

                      {/* Donut Legend */}
                      <div className="mt-4 grid grid-cols-3 gap-2 w-full text-center">
                        <div className="p-2 rounded-md bg-emerald-50/60 border border-emerald-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-medium text-slate-700">Accepted</span>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-800 block mt-0.5 tabular-nums">
                            {donutMetrics.acceptedCount} ({donutMetrics.acceptedPct}%)
                          </span>
                        </div>

                        <div className="p-2 rounded-md bg-amber-50/60 border border-amber-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-medium text-slate-700">Submitted</span>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-800 block mt-0.5 tabular-nums">
                            {donutMetrics.submittedCount} ({donutMetrics.submittedPct}%)
                          </span>
                        </div>

                        <div className="p-2 rounded-md bg-red-50/60 border border-red-100">
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

                {/* 2. APPLICATION TREND LINE CHART (6 COLS) */}
                <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                        Applications Volume Over Time
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Volume Trend</span>
                  </div>

                  {isLoadingCases ? (
                    <div className="py-12 space-y-3 my-auto">
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
                      <div className="h-4 bg-slate-100 animate-pulse rounded-md w-3/4" />
                    </div>
                  ) : trendData.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
                      No application trend data available.
                    </div>
                  ) : (
                    <div className="py-4 my-auto space-y-3">
                      {/* Bar Chart Container */}
                      <div className="h-28 w-full flex items-end justify-between gap-2 border-b border-slate-200/80 pb-1 pt-4 px-2">
                        {trendData.map((pt, idx) => {
                          const max = Math.max(...trendData.map((t) => t.count)) || 1;
                          const heightPct = Math.max(15, (pt.count / max) * 100);

                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                              <span className="text-[10px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                                {pt.count}
                              </span>
                              <div
                                className="w-full bg-slate-900 hover:bg-slate-700 rounded-t-sm transition-all duration-300"
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis Labels Row */}
                      <div className="flex justify-between gap-2 px-2 text-center">
                        {trendData.map((pt, idx) => (
                          <div key={idx} className="flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-medium truncate block max-w-full">
                              {pt.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                        <span>Period volume trajectory</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          Total: {totalApplications} cases
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION REQUIRED SECTION */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 lg:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Action Required Queue</h3>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60 tabular-nums">
                    {actionRequiredCases.length} Item{actionRequiredCases.length === 1 ? "" : "s"}
                  </span>
                </div>

                {isLoadingCases ? (
                  <div className="py-6 space-y-2">
                    <div className="h-10 bg-slate-100 animate-pulse rounded-md w-full" />
                    <div className="h-10 bg-slate-100 animate-pulse rounded-md w-full" />
                  </div>
                ) : actionRequiredCases.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-md border border-slate-200/80">
                    🎉 You're all caught up. No actions required.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {actionRequiredCases.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {item.customerName || item.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {item.applicationNo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Bank: <span className="font-medium text-slate-800">{item.bank}</span> • Sanction: <span className="tabular-nums font-medium text-slate-800">{item.sanctionAmount}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
                            {!item.pddCleared ? "PDD Pending" : "Action Needed"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(item)}
                            className="px-3 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECENT CUSTOMER APPLICATIONS TABLE CARD */}
              <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 border-b border-slate-200/80 gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recent Customer Applications</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">
                      Latest customer application status tracked in real time
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
                  >
                    <span>View Customer Management</span>
                    <span>→</span>
                  </button>
                </div>

                {isLoadingCases ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-normal">
                    Loading customer cases...
                  </div>
                ) : customerCases.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 border-b border-slate-200/80">
                    No customer applications registered yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-medium tracking-wider uppercase">
                          <th className="py-3 px-4 sm:px-6">Application Ref</th>
                          <th className="py-3 px-4 sm:px-6">Customer</th>
                          <th className="py-3 px-4 sm:px-6">Bank</th>
                          <th className="py-3 px-4 sm:px-6">Sanction Amount</th>
                          <th className="py-3 px-4 sm:px-6">Status</th>
                          <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerCases.slice(0, 10).map((app, i) => {
                          const rawStatus = (app.status || "Submitted").trim();
                          const sLower = rawStatus.toLowerCase();
                          const statusKey =
                            sLower === "accepted" || sLower === "approved" || sLower === "verified"
                              ? "Accepted"
                              : sLower === "rejected"
                              ? "Rejected"
                              : "Submitted";
                          return (
                            <tr key={app.id || i} className="transition-colors hover:bg-slate-50/60">
                              <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-medium text-slate-900 tabular-nums">
                                {app.applicationNo || app.caseNumber || `CASE-#${app.id}`}
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                                {app.customerName || app.name}
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                                {app.bank}
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 tabular-nums">
                                {app.sanctionAmount}
                              </td>
                              <td className="py-3.5 px-4 sm:px-6">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-medium border ${
                                    statusStyles[statusKey] || "bg-slate-100 text-slate-700 border-slate-200/80"
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusDots[statusKey] || "bg-slate-500"}`} />
                                  {statusKey}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(app)}
                                  className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* My Profile Tab View */}
          {activeTab === "profile" && <MyProfile adminName={userName} />}

          {/* Customer Management Tab View */}
          {activeTab === "customers" && (
            <CustomerManagement
              customers={customerCases}
              onNewApplication={() => setShowNewAppModal(true)}
              onRefresh={loadDashboardData}
            />
          )}

          {/* Other Tabs View Placeholder */}
          {activeTab !== "overview" && activeTab !== "customers" && activeTab !== "profile" && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 mb-3 border border-slate-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 capitalize">{activeTab} Section</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-normal">
                This section is ready for future module integration. All existing navigation pathways and backend connections remain preserved.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Global New Application Modal */}
      <CustomerRegistrationModal
        isOpen={showNewAppModal}
        onClose={() => {
          setShowNewAppModal(false);
          loadDashboardData();
        }}
      />

      {/* Customer Detail Drawer Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200/80 bg-slate-50/50">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Customer Case Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Ref: {selectedCustomer.applicationNo || selectedCustomer.caseNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs">
              <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Customer</span>
                    <span className="font-semibold text-slate-900 text-xs block">{selectedCustomer.customerName || selectedCustomer.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Mobile</span>
                    <span className="font-medium text-slate-900 font-mono text-xs block tabular-nums">{selectedCustomer.mobile}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Lending Bank</span>
                    <span className="font-semibold text-slate-900 text-xs block">{selectedCustomer.bank}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Loan Account</span>
                    <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">{selectedCustomer.loanAccountNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Sanction Amount</span>
                    <span className="font-semibold text-slate-900 text-xs block tabular-nums">{selectedCustomer.sanctionAmount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Disbursed Amount</span>
                    <span className="font-semibold text-emerald-700 text-xs block tabular-nums">{selectedCustomer.disbursementAmount}</span>
                  </div>
                </div>
              </div>

              {/* Status & PDD Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 border-b border-slate-200/80 pb-2">Status & Documentation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">PDD Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border mt-1 ${selectedCustomer.pddCleared ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-amber-50 text-amber-700 border-amber-200/80"}`}>
                      {selectedCustomer.pddCleared ? "✓ YES (Cleared)" : "NO (Pending)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Payment Structure</span>
                    <span className="font-medium text-slate-900 text-xs block mt-1">{selectedCustomer.paymentType}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}