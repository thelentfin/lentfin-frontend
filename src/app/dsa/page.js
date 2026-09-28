"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CustomerRegistrationModal from "./components/customer/CustomerRegistrationModal";
import DsaCustomerDetailsDrawer from "./components/DsaCustomerDetailsDrawer";
import DsaAnalyticsUI from "./components/DsaAnalyticsUI";
import { customerApiService } from "@/services/customerApiService";
import { dashboardApiService } from "@/services/dashboardApiService";
import { socketService } from "@/services/socketService";

export default function DSADashboardPage() {
  const router = useRouter();

  // Backward compatibility: redirect any legacy ?tab= queries to clean URL routes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab");
        if (tabParam) {
          const tabMap = {
            "customers": "/dsa/customer-applications",
            "customer-applications": "/dsa/customer-applications",
            "commission": "/dsa/commission",
            "payments": "/dsa/commission",
            "support": "/dsa/support",
            "support-customer-application": "/dsa/support",
            "support-general": "/dsa/support",
            "support-account": "/dsa/support",
            "support-tickets": "/dsa/support",
            "support-contact": "/dsa/support",
            "profile": "/dsa/profile",
          };
          if (tabMap[tabParam]) {
            router.replace(tabMap[tabParam]);
          }
        }
      } catch (e) {}
    }
  }, [router]);

  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Live Data States
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [customerCases, setCustomerCases] = useState([]);
  const [notificationsData, setNotificationsData] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    const startTime = Date.now();
    try {
      const dashRes = await dashboardApiService.getDsaDashboard();
      if (dashRes && dashRes.status && dashRes.data) {
        if (dashRes.data.summary) {
          setDashboardSummary(dashRes.data.summary);
        }
        if (Array.isArray(dashRes.data.notifications)) {
          setNotificationsData(dashRes.data.notifications);
        }
        if (Array.isArray(dashRes.data.loanCases) && dashRes.data.loanCases.length > 0) {
          const paymentsMap = {};
          if (Array.isArray(dashRes.data.payments)) {
            dashRes.data.payments.forEach((p) => {
              if (p.case_id) paymentsMap[p.case_id] = p;
            });
          }

          const disbursementsMap = {};
          if (Array.isArray(dashRes.data.disbursements)) {
            dashRes.data.disbursements.forEach((d) => {
              if (d.case_id) disbursementsMap[d.case_id] = d;
            });
          }

          const formatted = dashRes.data.loanCases.map((c) => {
            const pay = paymentsMap[c.id];
            const disb = disbursementsMap[c.id];
            const rawSanction = c.sanction_amount ? Number(c.sanction_amount) : 0;
            const rawDisb = disb?.disbursement_amount
              ? Number(disb.disbursement_amount)
              : (c.disbursement_amount ? Number(c.disbursement_amount) : null);
            const payAmount = pay?.payment_amount
              ? Number(pay.payment_amount)
              : (c.payment_amount ? Number(c.payment_amount) : null);

            return {
              ...c,
              id: c.id,
              applicationNo: c.application_number || c.case_number || `CASE-#${c.id}`,
              caseNumber: c.case_number,
              customerName: c.customer_name,
              name: c.customer_name,
              mobile: c.mobile_number,
              bank: c.bank_name || "Bank Partner",
              sanctionAmount: rawSanction
                ? `₹${rawSanction.toLocaleString("en-IN")}`
                : "₹0",
              rawSanctionAmount: rawSanction,
              disbursementAmount: rawDisb
                ? `₹${rawDisb.toLocaleString("en-IN")}`
                : "—",
              rawDisbursementAmount: rawDisb,
              disbursementType: disb?.disbursement_type || c.disbursement_type || "—",
              disbursementDate: disb?.disbursement_date || c.disbursement_date || c.created_at,
              rate: disb?.rate ? `${disb.rate}%` : (c.rate ? `${c.rate}%` : "—"),
              pf: disb?.pf ? `₹${disb.pf}` : (c.pf ? `₹${c.pf}` : "—"),
              tenure: disb?.tenure ? `${disb.tenure} Months` : (c.tenure ? `${c.tenure} Months` : "—"),
              insuranceAmount: disb?.insurance_amount ? `₹${disb.insurance_amount}` : (c.insurance_amount ? `₹${c.insurance_amount}` : "—"),
              chequeHandoverDate: disb?.cheque_handover_date || c.cheque_handover_date || "—",
              pddCleared: (disb?.pdd_cleared || c.pdd_cleared) === "YES",
              smName: c.sm_name || "—",
              smNumber: c.sm_mobile || "—",
              smEmail: c.sm_email || "—",
              asmName: c.asm_name || "—",
              asmNumber: c.asm_mobile || "—",
              asmEmail: c.asm_email || "—",
              paymentType: pay?.payment_option || c.payment_option || c.payment_type || "—",
              paymentPercentage: pay?.payment_percentage || c.payment_percentage || null,
              paymentAmount: payAmount ? `₹${payAmount.toLocaleString("en-IN")}` : null,
              rawPaymentAmount: payAmount,
              baseLoanAmount: pay?.loan_amount
                ? `₹${Number(pay.loan_amount).toLocaleString("en-IN")}`
                : null,
              status: c.status || "Submitted",
              date: c.created_at,
            };
          });
          setCustomerCases(formatted);
        } else {
          const fallbackData = await customerApiService.fetchCustomerCases().catch(() => []);
          setCustomerCases(fallbackData);
        }
      } else {
        const fallbackData = await customerApiService.fetchCustomerCases().catch(() => []);
        setCustomerCases(fallbackData);
      }
    } catch (err) {
      setFetchError("Unable to fetch latest loan applications. Showing recent local records.");
    } finally {
      const elapsed = Date.now() - startTime;
      const minDelay = 250;
      if (elapsed < minDelay) {
        setTimeout(() => {
          setIsLoadingCases(false);
          setLastSyncTime(new Date());
        }, minDelay - elapsed);
      } else {
        setIsLoadingCases(false);
        setLastSyncTime(new Date());
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time socket updates for new submissions
  useEffect(() => {
    const handleCaseUpdate = (data) => {
      loadDashboardData();
    };

    if (typeof socketService?.subscribeToCaseUpdates === "function") {
      socketService.subscribeToCaseUpdates(handleCaseUpdate);
    }

    return () => {
      if (typeof socketService?.unsubscribeFromCaseUpdates === "function") {
        socketService.unsubscribeFromCaseUpdates(handleCaseUpdate);
      }
    };
  }, [loadDashboardData]);



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
                <rect x="3" y="11" width="4.5" height="10" rx="1.6" fill="url(#dsaOpBar1)" />
                <rect x="9.75" y="6.5" width="4.5" height="14.5" rx="1.6" fill="url(#dsaOpBar2)" />
                <rect x="16.5" y="2.5" width="4.5" height="18.5" rx="1.6" fill="url(#dsaOpBar3)" />
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

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* New Application Button */}
          <button
            type="button"
            onClick={() => setShowNewAppModal(true)}
            title="New Application"
            aria-label="New Application"
            className="w-9 h-9 rounded-md bg-[#B063FF] hover:bg-[#9e4def] active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 select-none"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* Sync Overview Button Container with timestamp */}
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
      </div>

      {/* Error State Banner */}
      {fetchError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="font-medium underline hover:text-red-900"
          >
            Retry Sync
          </button>
        </div>
      )}



      {/* DSA ANALYTICS UI & REAL-TIME ACTIVITY STREAM */}
      <DsaAnalyticsUI
        dashboardSummary={dashboardSummary}
        loanCases={customerCases}
        notifications={notificationsData}
        isLoading={isLoadingCases}
        onNavigateTab={(tab) => {
          if (tab === "customer-applications") router.push("/dsa/customer-applications");
          else if (tab.startsWith("support")) router.push("/dsa/support");
          else router.push(`/dsa/${tab}`);
        }}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
      />

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
        <DsaCustomerDetailsDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </>
  );
}