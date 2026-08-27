"use client";

import { useMemo } from "react";

export default function AdminAnalyticsUI({
  dashboardSummary,
  loanCases = [],
  dsaUsers = [],
  notifications = [],
  signupRequests = [],
  isLoading = false,
  onNavigateTab,
  onSelectCase,
}) {
  // 1. APPLICATION STATUS DONUT CHART METRICS
  const statusMetrics = useMemo(() => {
    const total = dashboardSummary?.loanCases || 0;
    const accepted = dashboardSummary?.accepted || 0;
    const submitted = dashboardSummary?.submitted || 0;
    const rejected = dashboardSummary?.rejected || 0;
    const draft = dashboardSummary?.draft || 0;

    const divisor = total || 1;
    const acceptedPct = (accepted / divisor) * 100;
    const submittedPct = (submitted / divisor) * 100;
    const rejectedPct = (rejected / divisor) * 100;
    const draftPct = (draft / divisor) * 100;

    const circumference = 238.76; // 2 * PI * 38
    const acceptedDash = (acceptedPct / 100) * circumference;
    const submittedDash = (submittedPct / 100) * circumference;
    const rejectedDash = (rejectedPct / 100) * circumference;
    const draftDash = (draftPct / 100) * circumference;

    return {
      total,
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
  }, [dashboardSummary]);

  // 2. FINANCIAL OVERVIEW METRICS (Sanctioned vs Disbursed vs Paid)
  const financialMetrics = useMemo(() => {
    let totalSanctioned = 0;
    let totalDisbursed = 0;
    let totalPaid = 0;

    if (Array.isArray(loanCases)) {
      loanCases.forEach((lc) => {
        totalSanctioned += Number(lc.sanction_amount || 0);
        totalDisbursed += Number(lc.disbursement_amount || 0);
        totalPaid += Number(lc.total_paid || 0);
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
  }, [loanCases]);

  // 3. APPLICATION VOLUME TREND
  const trendData = useMemo(() => {
    if (!Array.isArray(loanCases) || loanCases.length === 0) return [];

    const monthCounts = {};
    loanCases.forEach((lc) => {
      if (lc.created_at) {
        try {
          const date = new Date(lc.created_at);
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

  // 4. DSA PERFORMANCE RANKING
  const dsaPerformance = useMemo(() => {
    if (!Array.isArray(loanCases) || loanCases.length === 0) return [];

    const stats = {};
    loanCases.forEach((lc) => {
      const dName = (lc.dsa_name || "Direct / Unassigned").trim();
      if (!stats[dName]) {
        stats[dName] = { count: 0, volume: 0 };
      }
      stats[dName].count += 1;
      stats[dName].volume += Number(lc.sanction_amount || 0);
    });

    const sorted = Object.entries(stats)
      .map(([name, item]) => ({ name, count: item.count, volume: item.volume }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = sorted.length > 0 ? sorted[0].count : 1;

    return sorted.map((d) => ({
      ...d,
      pct: Math.round((d.count / maxCount) * 100),
    }));
  }, [loanCases]);

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
    ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200/80",
    REJECTED: "bg-red-50 text-red-700 border-red-200/80",
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const statusDots = {
    ACCEPTED: "bg-emerald-500",
    SUBMITTED: "bg-amber-500",
    REJECTED: "bg-red-500",
    DRAFT: "bg-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* ROW 1: APPLICATION STATUS OVERVIEW & LOAN AMOUNT OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. APPLICATION STATUS OVERVIEW (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Application Status Overview
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              See the current breakdown of submitted, accepted, rejected, and draft applications.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
            </div>
          ) : statusMetrics.total === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No loan case data available.
            </div>
          ) : (
            <div className="relative py-4 flex flex-col items-center justify-center my-auto">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {statusMetrics.accepted > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray={statusMetrics.acceptedDash}
                      strokeDashoffset={statusMetrics.acceptedOffset}
                    />
                  )}
                  {statusMetrics.submitted > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="12"
                      strokeDasharray={statusMetrics.submittedDash}
                      strokeDashoffset={statusMetrics.submittedOffset}
                    />
                  )}
                  {statusMetrics.rejected > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth="12"
                      strokeDasharray={statusMetrics.rejectedDash}
                      strokeDashoffset={statusMetrics.rejectedOffset}
                    />
                  )}
                </svg>

                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-xl font-semibold text-slate-900 leading-tight tabular-nums">
                    {statusMetrics.total}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Total Cases
                  </span>
                </div>
              </div>

              {/* Status Donut Legend */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full text-center">
                <div className="p-2 rounded-md bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-medium text-slate-700">Submitted</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-800 block mt-0.5 tabular-nums">
                    {statusMetrics.submitted} ({statusMetrics.submittedPct}%)
                  </span>
                </div>

                <div className="p-2 rounded-md bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-slate-700">Accepted</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 block mt-0.5 tabular-nums">
                    {statusMetrics.accepted} ({statusMetrics.acceptedPct}%)
                  </span>
                </div>

                <div className="p-2 rounded-md bg-red-50/60 border border-red-100">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-medium text-slate-700">Rejected</span>
                  </div>
                  <span className="text-[11px] font-semibold text-red-700 block mt-0.5 tabular-nums">
                    {statusMetrics.rejected} ({statusMetrics.rejectedPct}%)
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

              {/* Paid / Recovered Amount Bar */}
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
                <span>Based on complete loan case records</span>
                <span className="font-medium text-slate-700">{loanCases.length} total cases</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: APPLICATION VOLUME TREND & DSA PERFORMANCE OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 3. APPLICATION VOLUME TREND (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Application Volume Trend
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              Track how loan application volume changes over time.
            </p>
          </div>

          {isLoading ? (
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
              <div className="h-32 w-full flex items-end justify-between gap-2 border-b border-slate-200/80 pb-1 pt-4 px-2">
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
                <span>Application submission timeline</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  Total: {loanCases.length} cases
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. DSA PERFORMANCE OVERVIEW (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                DSA Performance Overview
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Compare DSA partners by application volume and sanctioned business.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("dsa")}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer shrink-0 ml-2"
            >
              View DSAs →
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-3/4" />
            </div>
          ) : dsaPerformance.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No DSA performance data recorded yet.
            </div>
          ) : (
            <div className="py-3 space-y-3 my-auto">
              {dsaPerformance.map((d, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-900 truncate max-w-[200px] font-semibold">
                      {d.name}
                    </span>
                    <span className="text-slate-600 font-semibold tabular-nums">
                      {d.count} case{d.count > 1 ? "s" : ""} • {formatCurrency(d.volume)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, d.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: RECENT APPLICATIONS TABLE & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 5. RECENT APPLICATIONS TABLE (8 COLS) */}
        <div className="lg:col-span-8 rounded-lg border border-slate-200/80 bg-white p-5 lg:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                View the latest customer loan applications and their current status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("customer-applications")}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <span>View all loan cases</span>
              <span>→</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-normal">
              Loading loan cases...
            </div>
          ) : loanCases.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80">
              No loan applications found.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                    <th className="py-3 px-3">Case Number</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">DSA Partner</th>
                    <th className="py-3 px-3">Bank</th>
                    <th className="py-3 px-3">Sanction Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loanCases.slice(0, 6).map((lc) => {
                    const statusKey = String(lc.status || "SUBMITTED").toUpperCase();
                    return (
                      <tr key={lc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-900 tabular-nums">
                          {lc.case_number || `#${lc.id}`}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {lc.customer_name || "N/A"}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {lc.dsa_name || "Direct"}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {lc.bank_name || "Bank Partner"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(lc.sanction_amount)}
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
                          {formatDate(lc.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. RECENT ACTIVITY (4 COLS) */}
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
    </div>
  );
}
