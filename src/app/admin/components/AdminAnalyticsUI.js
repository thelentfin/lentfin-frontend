"use client";

import { useState, useMemo, useEffect, useRef } from "react";

function StatusDonutOverview({ statusMetrics, isLoading }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const isVisibleRef = useRef(false);

  const startAnimation = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startTime = performance.now();
    const duration = 550; // Fast, immediate, smooth reveal (550ms)

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Instant start ease-out curve (no initial lag)
      const eased = 1 - Math.pow(1 - progress, 2.2);
      setAnimationProgress(eased);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    setAnimationProgress(0);
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const wasVisible = isVisibleRef.current;
            isVisibleRef.current = true;
            if (!wasVisible && !isLoading && statusMetrics?.total > 0) {
              startAnimation();
            }
          } else {
            isVisibleRef.current = false;
            setAnimationProgress(0);
            if (animRef.current) cancelAnimationFrame(animRef.current);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    // Trigger animation on initial mount / data load if already in viewport
    if (!isLoading && statusMetrics?.total > 0 && isVisibleRef.current) {
      startAnimation();
    }

    return () => {
      observer.unobserve(node);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isLoading, statusMetrics?.total]);

  const segments = useMemo(() => {
    const items = [
      {
        key: "submitted",
        label: "Submitted",
        count: statusMetrics.submitted,
        pct: statusMetrics.submittedPct,
        color: "#f59e0b",
        dotClass: "bg-amber-500",
      },
      {
        key: "accepted",
        label: "Accepted",
        count: statusMetrics.accepted,
        pct: statusMetrics.acceptedPct,
        color: "#10b981",
        dotClass: "bg-emerald-500",
      },
      {
        key: "rejected",
        label: "Rejected",
        count: statusMetrics.rejected,
        pct: statusMetrics.rejectedPct,
        color: "#ef4444",
        dotClass: "bg-red-500",
      },
    ];

    if (statusMetrics.draft > 0) {
      items.push({
        key: "draft",
        label: "Draft",
        count: statusMetrics.draft,
        pct: statusMetrics.draftPct,
        color: "#94a3b8",
        dotClass: "bg-slate-400",
      });
    }

    return items;
  }, [statusMetrics]);

  const circumference = 238.76;
  let accumulatedLength = 0;

  const renderedSegments = segments.map((seg) => {
    const rawPct = statusMetrics.total > 0 ? seg.count / statusMetrics.total : 0;
    const dashLength = rawPct * circumference;
    const currentOffset = accumulatedLength;
    accumulatedLength += dashLength;

    const animatedDash = dashLength * animationProgress;
    const animatedOffset = -(currentOffset * animationProgress);

    return {
      ...seg,
      dashArray: `${animatedDash} ${circumference}`,
      dashOffset: animatedOffset,
    };
  });

  const sortedRenderedSegments = useMemo(() => {
    if (!hoveredSegment) return renderedSegments;
    const regular = renderedSegments.filter((s) => s.key !== hoveredSegment);
    const hovered = renderedSegments.find((s) => s.key === hoveredSegment);
    return hovered ? [...regular, hovered] : renderedSegments;
  }, [renderedSegments, hoveredSegment]);

  const hoveredInfo = useMemo(() => {
    if (!hoveredSegment) return null;
    return segments.find((s) => s.key === hoveredSegment);
  }, [hoveredSegment, segments]);

  return (
    <div ref={containerRef} className="relative py-3 flex flex-col items-center justify-center my-auto w-full">
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-48 h-48 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ) : statusMetrics.total === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto w-full">
          No loan case data available.
        </div>
      ) : (
        <>
          {/* Slightly Larger Donut Chart */}
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="11"
              />

              {sortedRenderedSegments.map((seg) => {
                if (seg.count === 0) return null;
                const isHovered = hoveredSegment === seg.key;

                return (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered ? 13.5 : 11}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-300 ease-out cursor-pointer"
                    style={{
                      pointerEvents: seg.count > 0 ? "stroke" : "none",
                      filter: isHovered ? "drop-shadow(0px 2px 5px rgba(0,0,0,0.12))" : "none",
                    }}
                    onMouseEnter={() => setHoveredSegment(seg.key)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                );
              })}
            </svg>

            {/* Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2 transition-all duration-200">
              {hoveredInfo ? (
                <div className="flex flex-col items-center transition-all duration-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {hoveredInfo.label}
                  </span>
                  <span className="text-3xl font-extrabold text-slate-900 leading-tight tabular-nums my-0.5">
                    {hoveredInfo.count}
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums"
                    style={{
                      color: hoveredInfo.color,
                      backgroundColor: `${hoveredInfo.color}18`,
                    }}
                  >
                    {hoveredInfo.pct}%
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center transition-all duration-200">
                  <span className="text-3xl font-extrabold text-slate-900 leading-tight tabular-nums">
                    {statusMetrics.total}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Total Cases
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Simple Legend: Dot + Label ONLY */}
          <div className="mt-3.5 flex items-center justify-center gap-6 sm:gap-8 w-full text-center">
            {segments.map((seg) => {
              const isHovered = hoveredSegment === seg.key;

              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setHoveredSegment(seg.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                    isHovered ? "opacity-100 scale-105 font-bold" : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`} />
                  <span className="text-xs font-semibold text-slate-700 select-none">{seg.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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
  const [viewBy, setViewBy] = useState("Month");
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
    const cases = Array.isArray(loanCases) ? loanCases : [];

    // Parse valid timestamps from loanCases
    const validCases = cases
      .map((lc) => {
        if (!lc?.created_at) return null;
        const d = new Date(lc.created_at);
        return isNaN(d.getTime()) ? null : { ...lc, dateObj: d };
      })
      .filter(Boolean);

    const now = new Date();

    if (viewBy === "Month") {
      // Range: at least past 6 months up to current month
      let minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      let maxDate = new Date(now.getFullYear(), now.getMonth(), 1);

      validCases.forEach((c) => {
        const firstOfMonth = new Date(c.dateObj.getFullYear(), c.dateObj.getMonth(), 1);
        if (firstOfMonth < minDate) minDate = firstOfMonth;
        if (firstOfMonth > maxDate) maxDate = firstOfMonth;
      });

      // Generate consecutive months list
      const months = [];
      const curr = new Date(minDate);
      while (curr <= maxDate) {
        const year = curr.getFullYear();
        const monthIndex = curr.getMonth();
        const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
        const label = curr.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        const fullLabel = curr.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        months.push({ key: monthKey, label, fullLabel, year, monthIndex, count: 0 });
        curr.setMonth(curr.getMonth() + 1);
      }

      // Populate counts
      validCases.forEach((c) => {
        const key = `${c.dateObj.getFullYear()}-${String(c.dateObj.getMonth() + 1).padStart(2, "0")}`;
        const match = months.find((m) => m.key === key);
        if (match) {
          match.count += 1;
        }
      });

      return months;
    }

    if (viewBy === "Week") {
      // 7-day week periods leading up to current week
      const currentDay = now.getDay();
      const diffToMonday = (currentDay + 6) % 7;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - diffToMonday);
      currentWeekStart.setHours(0, 0, 0, 0);

      let numWeeks = 8;
      if (validCases.length > 0) {
        const earliest = validCases.reduce((min, c) => (c.dateObj < min ? c.dateObj : min), validCases[0].dateObj);
        const diffWeeks = Math.ceil((currentWeekStart - earliest) / (7 * 24 * 60 * 60 * 1000)) + 1;
        if (diffWeeks > numWeeks) numWeeks = Math.min(diffWeeks, 16);
      }

      const weeks = [];
      for (let i = numWeeks - 1; i >= 0; i--) {
        const wStart = new Date(currentWeekStart);
        wStart.setDate(currentWeekStart.getDate() - i * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        const label = wStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const fullLabel = `${wStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${wEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

        weeks.push({
          key: wStart.toISOString(),
          startDate: wStart,
          endDate: wEnd,
          label,
          fullLabel,
          count: 0,
        });
      }

      validCases.forEach((c) => {
        const match = weeks.find((w) => c.dateObj >= w.startDate && c.dateObj <= w.endDate);
        if (match) {
          match.count += 1;
        }
      });

      return weeks;
    }

    if (viewBy === "Year") {
      let minYear = now.getFullYear() - 2;
      let maxYear = now.getFullYear();

      validCases.forEach((c) => {
        const y = c.dateObj.getFullYear();
        if (y < minYear) minYear = y;
        if (y > maxYear) maxYear = y;
      });

      const years = [];
      for (let y = minYear; y <= maxYear; y++) {
        years.push({
          key: String(y),
          label: String(y),
          fullLabel: `Year ${y}`,
          count: 0,
        });
      }

      validCases.forEach((c) => {
        const yStr = String(c.dateObj.getFullYear());
        const match = years.find((y) => y.key === yStr);
        if (match) {
          match.count += 1;
        }
      });

      return years;
    }

    return [];
  }, [loanCases, viewBy]);

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
              Customer Application Status Overview
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              See the current breakdown of submitted, accepted, and rejected applications.
            </p>
          </div>

          <StatusDonutOverview statusMetrics={statusMetrics} isLoading={isLoading} />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Application Volume Trend
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Track how loan application volume changes over time.
              </p>
            </div>

            {/* View By Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0 self-start sm:self-auto">
              {["Month", "Week", "Year"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setViewBy(option)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    viewBy === option
                      ? "bg-white text-[#B063FF] shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
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
              {/* Compact Column Chart Container */}
              <div className="h-36 w-full flex items-end justify-between gap-1.5 sm:gap-2 border-b border-slate-200/80 pb-1 pt-6 px-1">
                {trendData.map((pt, idx) => {
                  const maxVal = Math.max(...trendData.map((t) => t.count), 1);
                  const heightPct = pt.count > 0 ? Math.max(12, Math.round((pt.count / maxVal) * 100)) : 0;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end group h-full relative min-w-0">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-7 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="bg-slate-900 text-white text-[10px] font-semibold py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                          {pt.count} {pt.count === 1 ? "case" : "cases"} ({pt.fullLabel || pt.label})
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                      </div>

                      {/* Visible Count Badge above bar if count > 0 */}
                      {pt.count > 0 && (
                        <span className="text-[10px] font-bold text-[#B063FF] mb-1 tabular-nums">
                          {pt.count}
                        </span>
                      )}

                      {/* Vertical Column */}
                      <div className="w-full max-w-[28px] flex items-end justify-center h-full">
                        {pt.count > 0 ? (
                          <div
                            className="w-full bg-[#B063FF] hover:bg-[#9c4be8] rounded-t-sm transition-all duration-300 shadow-2xs"
                            style={{ height: `${heightPct}%` }}
                          />
                        ) : (
                          <div className="w-full h-0.5 bg-slate-200 rounded-full" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between gap-1.5 sm:gap-2 px-1 text-center">
                {trendData.map((pt, idx) => (
                  <div key={idx} className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 font-medium truncate block max-w-full" title={pt.fullLabel || pt.label}>
                      {pt.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 border-t border-slate-100/80">
                <span>Grouped by {viewBy.toLowerCase()}</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  Total: {loanCases.length} case{loanCases.length !== 1 ? "s" : ""}
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
