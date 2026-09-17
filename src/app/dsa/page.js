"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CustomerManagement from "./components/CustomerManagement";
import MyProfile from "./components/MyProfile";
import CustomerRegistrationModal from "./components/customer/CustomerRegistrationModal";
import DsaAnalyticsUI from "./components/DsaAnalyticsUI";
import SupportLanding from "./components/SupportLanding";
import SupportTicketView from "./components/SupportTicketView";
import GeneralSupportView from "./components/GeneralSupportView";
import MyTicketsView from "./components/MyTicketsView";
import { customerApiService } from "@/services/customerApiService";
import { dashboardApiService } from "@/services/dashboardApiService";
import { socketService } from "@/services/socketService";
import { useAuth } from "@/hooks/useAuth";
import FinanceLoadingAnimation from "@/components/FinanceLoadingAnimation";

const VALID_DSA_SECTIONS = [
  "overview",
  "applications",
  "customers",
  "commission",
  "support",
  "support-customer-application",
  "support-general",
  "support-account",
  "support-tickets",
  "support-ticket",
  "support-contact",
  "profile",
];

export default function DSADashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user, logout } = useAuth("dsa");
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab");
        if (tabParam && VALID_DSA_SECTIONS.includes(tabParam)) {
          return tabParam;
        }
        const storedTab = localStorage.getItem("dsa_selected_section");
        if (storedTab && VALID_DSA_SECTIONS.includes(storedTab)) {
          return storedTab;
        }
      } catch (e) {}
    }
    return "overview";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [userName, setUserName] = useState("");

  // Live Data States
  const [dsaProfile, setDsaProfile] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [customerCases, setCustomerCases] = useState([]);
  const [notificationsData, setNotificationsData] = useState([]);
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

  // Synchronize and persist activeTab selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab) {
      if (VALID_DSA_SECTIONS.includes(activeTab)) {
        try {
          localStorage.setItem("dsa_selected_section", activeTab);
        } catch (e) {}
      }
    }
  }, [activeTab]);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingCases(true);
    setFetchError("");
    const startTime = Date.now();
    try {
      const dashRes = await dashboardApiService.getDsaDashboard();
      if (dashRes && dashRes.status && dashRes.data) {
        if (dashRes.data.profile) {
          setDsaProfile(dashRes.data.profile);
          if (dashRes.data.profile.name) {
            const realName = dashRes.data.profile.name.trim();
            setUserName(realName);
            try {
              localStorage.setItem("userName", realName);
              localStorage.setItem("name", realName);
              if (dashRes.data.profile.email) {
                localStorage.setItem("userEmail", dashRes.data.profile.email);
                localStorage.setItem("email", dashRes.data.profile.email);
              }
            } catch (e) {}
          }
        }
        if (dashRes.data.summary) {
          setDashboardSummary(dashRes.data.summary);
        }
        if (Array.isArray(dashRes.data.notifications)) {
          setNotificationsData(dashRes.data.notifications);
        }
        if (Array.isArray(dashRes.data.loanCases) && dashRes.data.loanCases.length > 0) {
          // Format cases to ensure compatibility with existing list rendering
          const formatted = dashRes.data.loanCases.map(c => ({
            id: c.id,
            applicationNo: c.application_number || c.case_number || `CASE-#${c.id}`,
            caseNumber: c.case_number,
            customerName: c.customer_name,
            name: c.customer_name,
            mobile: c.mobile_number,
            bank: c.bank_name || "Bank Partner",
            sanctionAmount: c.sanction_amount ? `₹${Number(c.sanction_amount).toLocaleString("en-IN")}` : "₹0",
            status: c.status || "Submitted",
            disbursementDate: c.disbursement_date || c.created_at,
            date: c.created_at,
            pddCleared: c.pdd_cleared === "YES",
          }));
          setCustomerCases(formatted);
        } else {
          const fallbackData = await customerApiService.fetchCustomerCases().catch(() => []);
          setCustomerCases(fallbackData || []);
        }
      } else {
        const fallbackData = await customerApiService.fetchCustomerCases().catch(() => []);
        setCustomerCases(fallbackData || []);
      }
      // Ensure smooth visible spin feedback (minimum 1200ms)
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      setLastSyncTime(new Date());
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      setFetchError("Unable to sync customer cases. Please try again.");
    } finally {
      setIsLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (user) {
      setRole(user.role || "dsa");
      const storedName = user.name;
      if (storedName && !storedName.includes("@")) {
        setUserName(storedName.trim());
      } else {
        setUserName("DSA Partner");
      }
    }

    loadDashboardData();

    const handleDashboardUpdate = () => {
      loadDashboardData();
    };

    socketService.subscribeDashboardUpdated(handleDashboardUpdate);

    return () => {
      socketService.unsubscribeDashboardUpdated(handleDashboardUpdate);
    };
  }, [isAuthenticated, user, loadDashboardData]);

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
      case "support-customer-application":
      case "support-ticket":
        return "Customer Application Support";
      case "support-general":
      case "support-contact":
      case "support-account":
        return "General Support";
      case "support-tickets":
        return "My Tickets";
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

  // Dynamic KPI Card Calculations (from backend calculated summary or fallback)
  const totalApplications = dashboardSummary?.loanCases ?? customerCases.length;

  const approvedCasesCount = useMemo(() => {
    if (dashboardSummary?.accepted !== undefined) {
      return dashboardSummary.accepted;
    }
    return customerCases.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return s === "accepted" || s === "approved" || s === "verified";
    }).length;
  }, [dashboardSummary, customerCases]);

  const pddPendingCount = useMemo(() => {
    return customerCases.filter((c) => !c.pddCleared).length;
  }, [customerCases]);

  const totalSanctionVolume = useMemo(() => {
    if (dashboardSummary?.totalSanctionAmount !== undefined) {
      return Number(dashboardSummary.totalSanctionAmount);
    }
    return customerCases.reduce((sum, c) => {
      const rawStr = String(c.sanctionAmount || "").replace(/[^0-9.]/g, "");
      const val = parseFloat(rawStr) || 0;
      return sum + val;
    }, 0);
  }, [dashboardSummary, customerCases]);

  // Donut Chart Metrics Calculation
  const donutMetrics = useMemo(() => {
    const total = totalApplications;
    let accepted = dashboardSummary?.accepted;
    let submitted = dashboardSummary?.submitted;
    let rejected = dashboardSummary?.rejected;

    if (accepted === undefined || submitted === undefined || rejected === undefined) {
      accepted = 0;
      submitted = 0;
      rejected = 0;
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
    }

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
  }, [totalApplications, dashboardSummary, customerCases]);

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

  const handleLogout = () => {
    logout();
  };

  if (isAuthLoading || !isAuthenticated) {
    return <FinanceLoadingAnimation />;
  }

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
        dsaName={userName}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Workspace */}
      <main className="lg:ml-64 min-h-screen pt-16 pb-12">
        <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-8 sm:py-6 space-y-3.5 sm:space-y-6 max-w-[1600px] mx-auto">
          {/* Overview Tab Content */}
          {activeTab === "overview" && (
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
                        <linearGradient id="dsaOpBar1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C084FC" />
                          <stop offset="100%" stopColor="#9333EA" />
                        </linearGradient>
                        <linearGradient id="dsaOpBar2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#7E22CE" />
                        </linearGradient>
                        <linearGradient id="dsaOpBar3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#B063FF" />
                          <stop offset="100%" stopColor="#6B21A8" />
                        </linearGradient>
                        <linearGradient id="dsaOpTrend" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <filter id="dsaIconShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#7E22CE" floodOpacity="0.22" />
                        </filter>
                      </defs>
                      <g filter="url(#dsaIconShadow)">
                        {/* 3D Vibrant Analytics Bars */}
                        <rect x="3" y="11" width="4.5" height="10" rx="1.6" fill="url(#dsaOpBar1)" />
                        <rect x="9.75" y="6.5" width="4.5" height="14.5" rx="1.6" fill="url(#dsaOpBar2)" />
                        <rect x="16.5" y="2.5" width="4.5" height="18.5" rx="1.6" fill="url(#dsaOpBar3)" />
                        {/* Neon Trend Curve */}
                        <path
                          d="M3.2 13.5L9.5 8L15 9.5L20.5 3.2"
                          stroke="url(#dsaOpTrend)"
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

                {/* Sync Overview Button Container with absolute timestamp underneath */}
                <div className="relative shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    disabled={isLoadingCases}
                    title="Sync Overview"
                    className={`inline-flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3.5 rounded-md text-xs font-medium transition-colors shrink-0 sm:min-w-[124px] ${
                      isLoadingCases
                        ? "bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed shadow-2xs"
                        : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer shadow-2xs"
                    }`}
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-purple-600 shrink-0 ${
                        isLoadingCases ? "animate-spin" : ""
                      }`}
                      style={isLoadingCases ? { animationDuration: "1.4s" } : {}}
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
                      {isLoadingCases ? "Syncing..." : "Sync Overview"}
                    </span>
                  </button>
                  <span className="hidden sm:block absolute top-full mt-1 right-0.5 text-[11px] font-medium text-slate-400 tabular-nums whitespace-nowrap pointer-events-none">
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

              {/* NEXT-LEVEL DSA ANALYTICS PORTAL UI */}
              <DsaAnalyticsUI
                dashboardSummary={dashboardSummary}
                loanCases={customerCases}
                notifications={notificationsData}
                isLoading={isLoadingCases}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              />
            </>
          )}

          {/* My Profile Tab View */}
          {activeTab === "profile" && <MyProfile dsaName={userName} dsaProfile={dsaProfile} />}

          {/* Customer Management Tab View */}
          {activeTab === "customers" && (
            <CustomerManagement
              customers={customerCases}
              onNewApplication={() => setShowNewAppModal(true)}
              onRefresh={loadDashboardData}
            />
          )}

          {/* Support Center Tabbed Workspace (identical to Admin Settings design) */}
          {typeof activeTab === "string" && activeTab.startsWith("support") && (
            <SupportLanding
              initialTab={
                activeTab === "support-tickets"
                  ? "my-tickets"
                  : activeTab === "support-general" || activeTab === "support-contact" || activeTab === "support-account"
                  ? "general"
                  : "customer-application"
              }
              dsaName={userName}
              dsaProfile={dsaProfile}
              customerCases={customerCases}
              isLoadingCases={isLoadingCases}
              onTabChange={(tabId) => {
                if (tabId === "my-tickets") setActiveTab("support-tickets");
                else if (tabId === "general") setActiveTab("support-general");
                else if (tabId === "guidelines") setActiveTab("support-contact");
                else setActiveTab("support-customer-application");
              }}
            />
          )}

          {/* Other Tabs View Placeholder (Applications, Commission) */}
          {activeTab !== "overview" &&
            activeTab !== "customers" &&
            activeTab !== "profile" &&
            typeof activeTab === "string" &&
            !activeTab.startsWith("support") && (
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
                className="mt-4 inline-flex items-center gap-2 rounded-md btn-primary px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
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