"use client";

import { useMemo } from "react";

export default function DsaAnalyticsUI({
  dashboardSummary,
  loanCases = [],
  payments = [],
  disbursements = [],
  notifications = [],
  isLoading = false,
  onNavigateTab,
  onSelectCustomer,
}) {
  // 1. KPI SUMMARY METRICS
  const kpiMetrics = useMemo(() => {
    const total = dashboardSummary?.loanCases ?? loanCases.length;
    const accepted = dashboardSummary?.accepted ?? loanCases.filter(c => ["accepted", "approved", "verified"].includes((c.status||"").toLowerCase())).length;
    const submitted = dashboardSummary?.submitted ?? loanCases.filter(c => (c.status||"").toLowerCase() === "submitted").length;
    const rejected = dashboardSummary?.rejected ?? loanCases.filter(c => (c.status||"").toLowerCase() === "rejected").length;
    const draft = dashboardSummary?.draft ?? loanCases.filter(c => (c.status||"").toLowerCase() === "draft").length;

    let totalSanctionVal = dashboardSummary?.totalSanctionAmount;
    if (totalSanctionVal === undefined || totalSanctionVal === null) {
      totalSanctionVal = loanCases.reduce((sum, c) => {
        const raw = String(c.sanction_amount || c.sanctionAmount || "").replace(/[^0-9.]/g, "");
        return sum + (parseFloat(raw) || 0);
      }, 0);
    } else {
      totalSanctionVal = Number(totalSanctionVal);
    }

    return {
      total,
      accepted,
      submitted,
      rejected,
      draft,
      totalSanctionVal,
    };
  }, [dashboardSummary, loanCases]);

  // 2. LOAN APPLICATION STATUS DONUT CHART METRICS
  const statusDonutMetrics = useMemo(() => {
    const total = kpiMetrics.total || 1;
    const { accepted, submitted, rejected, draft } = kpiMetrics;

    const acceptedPct = (accepted / total) * 100;
    const submittedPct = (submitted / total) * 100;
    const rejectedPct = (rejected / total) * 100;
    const draftPct = (draft / total) * 100;

    const circumference = 238.76; // 2 * PI * 38
    const acceptedDash = (acceptedPct / 100) * circumference;
    const submittedDash = (submittedPct / 100) * circumference;
    const rejectedDash = (rejectedPct / 100) * circumference;
    const draftDash = (draftPct / 100) * circumference;

    return {
      total: kpiMetrics.total,
      accepted,
      submitted,
      rejected,
      draft,
      acceptedPct: acceptedPct.toFixed(1),
      submittedPct: submittedPct.toFixed(1),
      rejectedPct: rejectedPct.toFixed(1),
      draftPct: draftPct.toFixed(1),
      acceptedOffset: 0,
      submittedOffset: -acceptedDash,
      rejectedOffset: -(acceptedDash + submittedDash),
      draftOffset: -(acceptedDash + submittedDash + rejectedDash),
      acceptedDash: `${acceptedDash} ${circumference}`,
      submittedDash: `${submittedDash} ${circumference}`,
      rejectedDash: `${rejectedDash} ${circumference}`,
      draftDash: `${draftDash} ${circumference}`,
    };
  }, [kpiMetrics]);

  // 3. FINANCIAL OVERVIEW METRICS (Sanctioned vs Disbursed vs Received)
  const financialMetrics = useMemo(() => {
    let totalSanctioned = kpiMetrics.totalSanctionVal || 0;
    let totalDisbursed = 0;
    let totalPaid = 0;

    if (Array.isArray(loanCases)) {
      loanCases.forEach((lc) => {
        totalDisbursed += Number(lc.disbursement_amount || lc.disbursementAmount || 0);
        totalPaid += Number(lc.total_paid || lc.totalPaid || 0);
      });
    }

    const maxVal = Math.max(totalSanctioned, totalDisbursed, totalPaid) || 1;

    return {
      sanctioned: totalSanctioned,
      disbursed: totalDisbursed,
      paid: totalPaid,
      sanctionedPct: Math.round((totalSanctioned / maxVal) * 100),
      disbursedPct: Math.round((totalDisbursed / maxVal) * 100),
      paidPct: Math.round((totalPaid / maxVal) * 100),
    };
  }, [kpiMetrics, loanCases]);

  // 4. APPLICATION ACTIVITY TREND (Grouped by month using created_at)
  const trendData = useMemo(() => {
    if (!Array.isArray(loanCases) || loanCases.length === 0) return [];

    const monthCounts = {};
    loanCases.forEach((lc) => {
      const dateStr = lc.created_at || lc.date || lc.disbursement_date;
      if (dateStr && dateStr !== "—") {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const label = date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
            monthCounts[label] = (monthCounts[label] || 0) + 1;
          }
        } catch (e) {}
      }
    });

    const entries = Object.entries(monthCounts);
    if (entries.length === 0) return [];
    if (entries.length === 1) {
      return [
        { label: "Prev Period", count: 0 },
        { label: entries[0][0], count: entries[0][1] },
      ];
    }
    return entries.map(([label, count]) => ({ label, count }));
  }, [loanCases]);

  // 5. PORTFOLIO PERFORMANCE INSIGHTS
  const insights = useMemo(() => {
    const total = kpiMetrics.total;
    const accepted = kpiMetrics.accepted;
    const rejected = kpiMetrics.rejected;

    const approvalRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0";
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0";
    const avgSanction = accepted > 0 ? Math.round(kpiMetrics.totalSanctionVal / accepted) : 0;

    return {
      approvalRate,
      rejectionRate,
      avgSanction,
    };
  }, [kpiMetrics]);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return "₹0";
    return `₹${Number(val).toLocaleString("en-IN")}`;
  };

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
    if (!dateStr) return "Recently";
    try {
      const date = new Date(dateStr);
      const diffMs = new Date() - date;
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch (e) {
      return "Recently";
    }
  };

  const statusBadges = {
    Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Verified: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    Submitted: "bg-amber-50 text-amber-700 border-amber-200/80",
    Pending: "bg-amber-50 text-amber-700 border-amber-200/80",
    Rejected: "bg-red-50 text-red-700 border-red-200/80",
    Draft: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const statusDots = {
    Accepted: "bg-emerald-500",
    Approved: "bg-emerald-500",
    Verified: "bg-emerald-500",
    Submitted: "bg-amber-500",
    Pending: "bg-amber-500",
    Rejected: "bg-red-500",
    Draft: "bg-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* 3 INTERACTIVE DSA KPI CARDS (GRADIENT UPDATE: TOP-LEFT TO WHITE RIGHT) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Total Applications */}
        <div className="group rounded-xl border-l-4 border-blue-300 bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-white p-5 transition-all duration-200 hover:shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applications</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/70 border border-blue-200/60 text-blue-700 transition-transform duration-200 group-hover:scale-105">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3.5">
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                {kpiMetrics.total.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
            <span>Registered portfolio applications</span>
            <span className="font-medium text-slate-700 tabular-nums">{kpiMetrics.accepted} accepted</span>
          </div>
        </div>

        {/* 2. Total Sanctioned Amount */}
        <div className="group rounded-xl border-l-4 border-purple-400 bg-gradient-to-br from-purple-100/80 via-purple-50/50 to-white p-5 transition-all duration-200 hover:shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sanctioned Amount</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100/70 border border-purple-200/60 text-purple-700 font-bold text-sm transition-transform duration-200 group-hover:scale-105">
  ₹
</div>
          </div>
          <div className="mt-3.5">
            {isLoading ? (
              <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                {formatCurrency(kpiMetrics.totalSanctionVal)}
              </p>
            )}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
            <span>Average per accepted loan</span>
            <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(insights.avgSanction)}</span>
          </div>
        </div>

        {/* 3. Application Success Rate */}
        <div className="group rounded-xl border-l-4 border-emerald-400 bg-gradient-to-br from-emerald-50/90 via-emerald-50/25 to-white p-5 transition-all duration-200 hover:shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Application Success Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100/70 border border-emerald-200/60 text-emerald-700 transition-transform duration-200 group-hover:scale-105">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {isLoading ? (
              <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {insights.approvalRate}%
                </p>
              </div>
            )}
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0 self-center">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, parseFloat(insights.approvalRate) || 0))}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
            <span>Accepted ratio</span>
            <span className="font-medium text-emerald-700 tabular-nums">{kpiMetrics.accepted} of {kpiMetrics.total} applications</span>
          </div>
        </div>
      </div>

      {/* ROW 1: LOAN APPLICATION STATUS DONUT CHART & LOAN AMOUNT OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. LOAN APPLICATION STATUS DONUT CHART (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Loan Application Status
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              Breakdown of submitted, accepted, rejected, and draft applications.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
            </div>
          ) : statusDonutMetrics.total === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No application status data available.
            </div>
          ) : (
            <div className="relative py-4 flex flex-col items-center justify-center my-auto">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {statusDonutMetrics.accepted > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray={statusDonutMetrics.acceptedDash}
                      strokeDashoffset={statusDonutMetrics.acceptedOffset}
                    />
                  )}
                  {statusDonutMetrics.submitted > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="12"
                      strokeDasharray={statusDonutMetrics.submittedDash}
                      strokeDashoffset={statusDonutMetrics.submittedOffset}
                    />
                  )}
                  {statusDonutMetrics.rejected > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth="12"
                      strokeDasharray={statusDonutMetrics.rejectedDash}
                      strokeDashoffset={statusDonutMetrics.rejectedOffset}
                    />
                  )}
                </svg>

                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-xl font-semibold text-slate-900 leading-tight tabular-nums">
                    {statusDonutMetrics.total}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Total Cases
                  </span>
                </div>
              </div>

              {/* Status Donut Legend */}
              <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center">
                <div className="p-2 rounded-md bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-medium text-slate-700">Submitted</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-800 block mt-0.5 tabular-nums">
                    {statusDonutMetrics.submitted} ({statusDonutMetrics.submittedPct}%)
                  </span>
                </div>

                <div className="p-2 rounded-md bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-slate-700">Accepted</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 block mt-0.5 tabular-nums">
                    {statusDonutMetrics.accepted} ({statusDonutMetrics.acceptedPct}%)
                  </span>
                </div>

                <div className="p-2 rounded-md bg-red-50/60 border border-red-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-medium text-slate-700">Rejected</span>
                  </div>
                  <span className="text-[11px] font-semibold text-red-700 block mt-0.5 tabular-nums">
                    {statusDonutMetrics.rejected} ({statusDonutMetrics.rejectedPct}%)
                  </span>
                </div>                
              </div>
            </div>
          )}
        </div>

        {/* 2. LOAN AMOUNT OVERVIEW (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Loan Amount Overview
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              Compare sanctioned, disbursed, and received loan amounts.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 space-y-4 my-auto">
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-4/5" />
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-2/3" />
            </div>
          ) : (
            <div className="py-4 my-auto space-y-4">
              {/* Sanctioned Amount Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Total Sanctioned Volume</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(financialMetrics.sanctioned)}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, financialMetrics.sanctionedPct)}%` }}
                  />
                </div>
              </div>

              {/* Disbursed Amount Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Total Disbursed Volume</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {formatCurrency(financialMetrics.disbursed)}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, financialMetrics.disbursedPct)}%` }}
                  />
                </div>
              </div>

              {/* Payments Received Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Total Payments Received</span>
                  <span className="font-semibold text-blue-700 tabular-nums">
                    {formatCurrency(financialMetrics.paid)}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, financialMetrics.paidPct)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span>Calculated from your active portfolio cases</span>
                <span className="font-medium text-slate-700">{loanCases.length} total cases</span>
              </div>
            </div>
          )}
        </div>
      </div>

            {/* ROW 2: APPLICATION ACTIVITY (8 COLS) & RECENT ACTIVITY (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* APPLICATION ACTIVITY (8 COLS) */}
        <div className="lg:col-span-8 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Application Activity
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              Loan applications submitted over time
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-3/4" />
            </div>
          ) : trendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No application activity recorded yet.
            </div>
          ) : (
            <div className="py-4 my-auto space-y-3">
              <div className="h-36 w-full flex items-end justify-between gap-2 border-b border-slate-200/80 pb-1 pt-4 px-2">
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

              <div className="flex justify-between gap-2 px-2 text-center">
                {trendData.map((pt, idx) => (
                  <div key={idx} className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 font-medium truncate block max-w-full">
                      {pt.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                <span>Monthly application submission trajectory</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  Total: {kpiMetrics.total} cases
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY (4 COLS) */}
        <div className="lg:col-span-4 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Recent Activity
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              Stay updated with the latest activity across the platform.
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-5/6" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No recent activity recorded.
            </div>
          ) : (
            <div className="py-2 space-y-3.5 my-auto">
              {notifications.slice(0, 6).map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                    🔔
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 leading-snug truncate">
                      {act.title || "Activity Update"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {act.message || act.notification_type || "Application notification"}
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

      {/* ROW 3: RECENT APPLICATIONS TABLE (12 COLS - FULL WIDTH) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-12 rounded-lg border border-slate-200/80 bg-white p-5 lg:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                View the latest customer loan applications and their current status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("customers")}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <span>View Customer Management</span>
              <span>→</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-normal">
              Loading customer cases...
            </div>
          ) : loanCases.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80">
              No customer applications found.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                    <th className="py-3 px-3">Case Number</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Bank</th>
                    <th className="py-3 px-3">Sanction Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loanCases.slice(0, 6).map((lc) => {
                    const rawStatus = (lc.status || "Submitted").trim();
                    const sLower = rawStatus.toLowerCase();
                    const statusKey =
                      sLower === "accepted" || sLower === "approved" || sLower === "verified"
                        ? "Accepted"
                        : sLower === "rejected"
                        ? "Rejected"
                        : "Submitted";

                    return (
                      <tr key={lc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-900 tabular-nums">
                          {lc.applicationNo || lc.caseNumber || lc.case_number || `#${lc.id}`}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {lc.customerName || lc.customer_name || lc.name || "N/A"}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {lc.bank || lc.bank_name || "Bank Partner"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 tabular-nums">
                          {lc.sanctionAmount || formatCurrency(lc.sanction_amount)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                              statusBadges[statusKey] || "bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDots[statusKey] || "bg-slate-500"}`} />
                            {statusKey}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                          {formatDate(lc.created_at || lc.date || lc.disbursementDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}