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

  // Dynamically reorder rendered segments so the currently hovered segment is drawn last (top of SVG z-index)
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
    <div ref={containerRef} className="relative py-2 flex items-center justify-center my-auto w-full">
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-56 h-56 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ) : statusMetrics.total === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto w-full">
          No loan case data available.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 sm:gap-8 w-full py-1 my-auto">
          {/* Larger Donut Chart positioned on the left */}
          <div className="relative w-56 h-56 sm:w-60 sm:h-60 lg:w-64 lg:h-64 flex items-center justify-center shrink-0">
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
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tabular-nums my-0.5">
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
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tabular-nums">
                    {statusMetrics.total}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Total Cases
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown Legend on the right side */}
          <div className="flex flex-col justify-center gap-3 sm:gap-3.5 shrink-0 min-w-[130px] sm:min-w-[150px]">
            {segments.map((seg) => {
              const isHovered = hoveredSegment === seg.key;

              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setHoveredSegment(seg.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center gap-2.5 cursor-pointer transition-all duration-200 ${
                    isHovered ? "opacity-100 scale-105 font-bold" : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full shrink-0 ${seg.dotClass}`} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 select-none">
                    {seg.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums ml-auto pl-2">
                    {seg.count}
                  </span>
                  <span
                    className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                    style={{
                      color: seg.color,
                      backgroundColor: `${seg.color}18`,
                    }}
                  >
                    {seg.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
 
function getBankBadge(name = "") {
  const n = String(name || "").toUpperCase();
  if (n.includes("HDFC")) {
    return { bg: "bg-blue-600", text: "text-white", code: "HDFC" };
  }
  if (n.includes("ICICI")) {
    return { bg: "bg-orange-600", text: "text-white", code: "ICICI" };
  }
  if (n.includes("SBI") || n.includes("STATE BANK")) {
    return { bg: "bg-sky-600", text: "text-white", code: "SBI" };
  }
  if (n.includes("AXIS")) {
    return { bg: "bg-rose-700", text: "text-white", code: "AXIS" };
  }
  if (n.includes("KOTAK")) {
    return { bg: "bg-red-600", text: "text-white", code: "KOTAK" };
  }
  if (n.includes("BARODA")) {
    return { bg: "bg-amber-600", text: "text-white", code: "BOB" };
  }
  if (n.includes("PUNJAB") || n.includes("PNB")) {
    return { bg: "bg-yellow-700", text: "text-white", code: "PNB" };
  }
  const initials =
    String(name || "BNK")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "BNK";
  return { bg: "bg-purple-600", text: "text-white", code: initials };
}

// INDEPENDENT VIEWPORT-TRIGGERED ENTRANCE ANIMATION HOOK
function useCardEntranceAnimation(isLoading = false, triggerKey = "") {
  const [isAnimated, setIsAnimated] = useState(false);
  const containerRef = useRef(null);
  const isIntersectingRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsAnimated(true);
      return;
    }

    let timer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isIntersectingRef.current = true;
            if (!isLoading) {
              // Ensure 0% initial state paints first, then trigger smooth CSS transition
              timer = setTimeout(() => {
                setIsAnimated(true);
              }, 50);
            }
          } else {
            isIntersectingRef.current = false;
            if (timer) clearTimeout(timer);
            setIsAnimated(false);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    // If triggerKey changes while already in viewport, replay smoothly
    if (isIntersectingRef.current && !isLoading) {
      setIsAnimated(false);
      timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
    }

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [isLoading, triggerKey]);

  return [containerRef, isAnimated];
}

export default function DsaAnalyticsUI({
  dashboardSummary,
  payoutSettlement,
  bankPerformance,
  loanCases = [],
  payments = [],
  disbursements = [],
  notifications = [],
  isSubDsa = false,
  isLoading = false,
  onNavigateTab,
  onSelectCustomer,
}) {
  const [viewBy, setViewBy] = useState("Month");

  // INDEPENDENT VIEWPORT-TRIGGERED ENTRANCE ANIMATIONS FOR CARDS
  const [activityContainerRef, isActivityAnimated] = useCardEntranceAnimation(isLoading, viewBy);
  const [bankContainerRef, isBankAnimated] = useCardEntranceAnimation(isLoading);
  const [recentContainerRef, isRecentAnimated] = useCardEntranceAnimation(isLoading);

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

    let totalDisbursedVal = dashboardSummary?.totalDisbursedAmount;
    if (totalDisbursedVal === undefined || totalDisbursedVal === null) {
      totalDisbursedVal = loanCases.reduce((sum, c) => {
        const raw = String(
          c.rawDisbursementAmount || c.disbursement_amount || c.disbursementAmount || ""
        ).replace(/[^0-9.]/g, "");
        return sum + (parseFloat(raw) || 0);
      }, 0);
    } else {
      totalDisbursedVal = Number(totalDisbursedVal);
    }

    // Helper to calculate commission amount for a single loan case
    const getCaseCommission = (c) => {
      if (c.rawPaymentAmount && !isNaN(c.rawPaymentAmount) && c.rawPaymentAmount > 0) {
        return Number(c.rawPaymentAmount);
      }
      if (c.paymentAmount && c.paymentAmount !== "—") {
        const parsed = Number(String(c.paymentAmount).replace(/[^0-9.-]+/g, ""));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }

      // Base loan amount: prioritize disbursement amount, then sanction amount
      const rawDisb = c.rawDisbursementAmount || Number(String(c.disbursementAmount || "0").replace(/[^0-9.-]+/g, ""));
      const rawSanc = c.rawSanctionAmount || Number(String(c.sanction_amount || c.sanctionAmount || "0").replace(/[^0-9.-]+/g, ""));
      const baseAmount = (rawDisb && !isNaN(rawDisb) && rawDisb > 0) ? rawDisb : (rawSanc && !isNaN(rawSanc) ? rawSanc : 0);

      if (baseAmount > 0) {
        const paymentOptionStr = String(c.paymentType || c.payment_type || c.paymentOption || "");
        const pct = c.paymentPercentage
          ? Number(c.paymentPercentage)
          : isSubDsa
          ? null
          : (paymentOptionStr.includes("48") || paymentOptionStr.includes("SPOT") ? 0.85 : 0.90);
        return pct !== null ? Math.round((baseAmount * pct) / 100) : 0;
      }

      return 0;
    };

    // Prioritize backend calculated commission if provided
    let earnedCommission =
      dashboardSummary?.earnedCommission !== undefined
        ? Number(dashboardSummary.earnedCommission)
        : null;
    let pendingCommission =
      dashboardSummary?.pendingCommission !== undefined
        ? Number(dashboardSummary.pendingCommission)
        : null;

    if (earnedCommission === null || pendingCommission === null) {
      earnedCommission = 0;
      pendingCommission = 0;

      loanCases.forEach((c) => {
        const s = String(c.status || "").toLowerCase().trim();
        const comm = getCaseCommission(c);
        if (["accepted", "approved", "verified"].includes(s)) {
          earnedCommission += comm;
        } else if (["submitted", "pending", "under_review", "under review"].includes(s)) {
          pendingCommission += comm;
        }
      });
    }

    return {
      total,
      accepted,
      submitted,
      rejected,
      draft,
      totalSanctionVal,
      totalDisbursedVal,
      earnedCommission,
      pendingCommission,
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

  // 4. APPLICATION ACTIVITY TREND (Month, Week, Year)
  const trendData = useMemo(() => {
    const cases = Array.isArray(loanCases) ? loanCases : [];

    // Parse valid timestamps from loanCases
    const validCases = cases
      .map((lc) => {
        const dateStr = lc?.created_at || lc?.date || lc?.disbursement_date || lc?.disbursementDate;
        if (!dateStr || dateStr === "—") return null;
        const d = new Date(dateStr);
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

  // 5. PORTFOLIO PERFORMANCE INSIGHTS
  const insights = useMemo(() => {
    const total = kpiMetrics.total;
    const accepted = kpiMetrics.accepted;
    const rejected = kpiMetrics.rejected;

    const approvalRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0";
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0";
    const avgSanction = accepted > 0 ? Math.round(kpiMetrics.totalSanctionVal / accepted) : 0;
    const disbursalRate =
      kpiMetrics.totalSanctionVal > 0
        ? ((kpiMetrics.totalDisbursedVal / kpiMetrics.totalSanctionVal) * 100).toFixed(1)
        : "0.0";

    return {
      approvalRate,
      rejectionRate,
      avgSanction,
      disbursalRate,
    };
  }, [kpiMetrics]);

  // 6. PAYOUT SETTLEMENT BREAKDOWN (Spot 48h vs 5-Day settlement)
  const settlementMetrics = useMemo(() => {
    if (
      payoutSettlement &&
      (payoutSettlement.spot48h?.casesCount > 0 ||
        payoutSettlement.standard5Days?.casesCount > 0 ||
        payoutSettlement.spot48h?.disbursedAmount > 0 ||
        payoutSettlement.standard5Days?.disbursedAmount > 0)
    ) {
      const spotCases = payoutSettlement.spot48h?.casesCount || 0;
      const spotDisbursed = payoutSettlement.spot48h?.disbursedAmount || 0;
      const spotCommission = payoutSettlement.spot48h?.commissionEarned || 0;

      const stdCases = payoutSettlement.standard5Days?.casesCount || 0;
      const stdDisbursed = payoutSettlement.standard5Days?.disbursedAmount || 0;
      const stdCommission = payoutSettlement.standard5Days?.commissionEarned || 0;

      const totalDisb = spotDisbursed + stdDisbursed || 1;
      return {
        spot48h: {
          rate: payoutSettlement.spot48h?.rate || (isSubDsa ? "Partner Rate" : "0.85%"),
          casesCount: spotCases,
          disbursedAmount: spotDisbursed,
          commissionEarned: spotCommission,
          pct: Math.round((spotDisbursed / totalDisb) * 100),
        },
        standard5Days: {
          rate: payoutSettlement.standard5Days?.rate || (isSubDsa ? "Partner Rate" : "0.90%"),
          casesCount: stdCases,
          disbursedAmount: stdDisbursed,
          commissionEarned: stdCommission,
          pct: Math.round((stdDisbursed / totalDisb) * 100),
        },
      };
    }

    // Fallback: calculate directly from loanCases
    let spotCases = 0, spotDisb = 0, spotComm = 0;
    let stdCases = 0, stdDisb = 0, stdComm = 0;

    loanCases.forEach((lc) => {
      const opt = String(lc.paymentType || lc.payment_option || lc.paymentOption || "");
      const isSpot =
        opt.includes("48") ||
        opt.toUpperCase().includes("SPOT") ||
        Number(lc.paymentPercentage || lc.payment_percentage) === 0.85;
      const disb = Number(lc.rawDisbursementAmount || lc.disbursement_amount || lc.disbursementAmount || 0);
      const comm = Number(lc.rawPaymentAmount || lc.commission_amount || lc.payment_amount || 0);

      if (isSpot) {
        spotCases += 1;
        spotDisb += disb;
        spotComm += comm;
      } else {
        stdCases += 1;
        stdDisb += disb;
        stdComm += comm;
      }
    });

    const totalDisb = spotDisb + stdDisb || 1;
    return {
      spot48h: {
        rate: isSubDsa ? "Partner Rate" : "0.85%",
        casesCount: spotCases,
        disbursedAmount: spotDisb,
        commissionEarned: spotComm,
        pct: Math.round((spotDisb / totalDisb) * 100),
      },
      standard5Days: {
        rate: isSubDsa ? "Partner Rate" : "0.90%",
        casesCount: stdCases,
        disbursedAmount: stdDisb,
        commissionEarned: stdComm,
        pct: Math.round((stdDisb / totalDisb) * 100),
      },
    };
  }, [payoutSettlement, loanCases, isSubDsa]);

  // 7. BANK PARTNER PERFORMANCE MATRIX
  const bankList = useMemo(() => {
    if (Array.isArray(bankPerformance) && bankPerformance.length > 0) {
      return bankPerformance;
    }

    // Fallback grouping from loanCases
    const bMap = {};
    loanCases.forEach((lc) => {
      const bName = lc.bank || lc.bank_name || "Partner Bank";
      if (!bMap[bName]) {
        bMap[bName] = {
          bank_name: bName,
          totalCases: 0,
          approvedCases: 0,
          totalSanction: 0,
          totalDisbursed: 0,
        };
      }
      bMap[bName].totalCases += 1;
      bMap[bName].totalSanction += Number(lc.rawSanctionAmount || lc.sanction_amount || 0);
      bMap[bName].totalDisbursed += Number(lc.rawDisbursementAmount || lc.disbursement_amount || 0);

      const s = String(lc.status || "").toLowerCase().trim();
      if (["accepted", "approved", "verified"].includes(s)) {
        bMap[bName].approvedCases += 1;
      }
    });

    return Object.values(bMap)
      .map((b) => ({
        ...b,
        approvalRate:
          b.totalCases > 0
            ? Number(((b.approvedCases / b.totalCases) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalSanction - a.totalSanction);
  }, [bankPerformance, loanCases]);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return "₹0";
    const num = Number(val);
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString("en-IN", {
      maximumFractionDigits: hasDecimals ? 2 : 0,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    })}`;
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
    <div className="space-y-3.5 sm:space-y-6">
      {/* 4 MASTER FINANCIAL & OPERATIONAL KPI CARDS ROW (AIRY, BALANCED, RICH SUB-METRICS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
        {/* 1. Total Applications & Approval Rate */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-blue-400 bg-gradient-to-br from-blue-50/90 via-blue-50/30 to-white p-3.5 sm:p-5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 border border-blue-200/60 shrink-0">
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 tabular-nums">
              {insights.approvalRate}% Approved
            </span>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xs font-medium text-slate-500 truncate">Total Applications</p>
            {isLoading ? (
              <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {kpiMetrics.total.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="mt-2 text-xs font-normal text-slate-500 hidden sm:block truncate">
            <span className="font-semibold text-emerald-600">{kpiMetrics.accepted} accepted</span> • {kpiMetrics.total - kpiMetrics.accepted} in pipeline
          </div>
          <div className="mt-1.5 sm:hidden text-[10px] font-medium text-slate-500 truncate">
            {kpiMetrics.accepted} accepted of {kpiMetrics.total}
          </div>
        </div>

        {/* 2. Total Sanctioned Amount */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-purple-400 bg-gradient-to-br from-purple-100/80 via-purple-50/30 to-white p-3.5 sm:p-5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-purple-100/70 border border-purple-200/60 text-purple-700 font-bold text-sm sm:text-base shrink-0">
              ₹
            </div>
            <span className="inline-flex items-center text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/70 truncate">
              Portfolio
            </span>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xs font-medium text-slate-500 truncate">Total Sanctioned</p>
            {isLoading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {formatCurrency(kpiMetrics.totalSanctionVal)}
              </p>
            )}
          </div>
          <div className="mt-2 text-xs font-normal text-slate-500 hidden sm:block truncate">
            Avg: <span className="font-semibold text-slate-700">{formatCurrency(insights.avgSanction)}</span> per approved loan
          </div>
          <div className="mt-1.5 sm:hidden text-[10px] font-normal text-slate-500 truncate">
            Avg: {formatCurrency(insights.avgSanction)}
          </div>
        </div>

        {/* 3. Disbursed Volume & Conversion Rate */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-indigo-400 bg-gradient-to-br from-indigo-50/90 via-indigo-50/30 to-white p-3.5 sm:p-5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-indigo-100/70 text-indigo-700 border border-indigo-200/60 shrink-0">
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70 tabular-nums truncate">
              {insights.disbursalRate}% Disbursed
            </span>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xs font-medium text-slate-500 truncate">Disbursed Volume</p>
            {isLoading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {formatCurrency(kpiMetrics.totalDisbursedVal)}
              </p>
            )}
          </div>
          <div className="mt-2 text-xs font-normal text-slate-500 hidden sm:block truncate">
            {kpiMetrics.totalSanctionVal - kpiMetrics.totalDisbursedVal > 0 ? (
              <>
                <span className="font-semibold text-amber-600">
                  {formatCurrency(kpiMetrics.totalSanctionVal - kpiMetrics.totalDisbursedVal)}
                </span> pending disbursal
              </>
            ) : (
              <span className="text-emerald-600 font-medium">100% of sanctions disbursed</span>
            )}
          </div>
          <div className="mt-1.5 sm:hidden text-[10px] font-normal text-slate-500 truncate">
            {insights.disbursalRate}% of sanctions
          </div>
        </div>

        {/* 4. Total Commission & Payout Status */}
        <div className="group rounded-xl border-l-3 sm:border-l-4 border-amber-400 bg-gradient-to-br from-amber-50/90 via-amber-50/30 to-white p-3.5 sm:p-5 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-amber-100/70 border border-amber-200/60 text-amber-700 font-bold text-sm sm:text-base shrink-0">
              ₹
            </div>
            <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 truncate">
              {isSubDsa ? "Partner Share" : "0.85% / 0.90%"}
            </span>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xs font-medium text-slate-500 truncate">Commission Earned</p>
            {isLoading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {formatCurrency(kpiMetrics.earnedCommission)}
              </p>
            )}
          </div>
          <div className="mt-2 text-xs font-normal text-slate-500 hidden sm:block truncate">
            {kpiMetrics.pendingCommission > 0 ? (
              <>
                <span className="font-semibold text-sky-700">
                  + {formatCurrency(kpiMetrics.pendingCommission)}
                </span> in clearance
              </>
            ) : (
              "All payouts cleared & settled"
            )}
          </div>
          <div className="mt-1.5 sm:hidden text-[10px] font-normal text-slate-500 truncate">
            {kpiMetrics.pendingCommission > 0 ? `+ ${formatCurrency(kpiMetrics.pendingCommission)} in review` : "Settled"}
          </div>
        </div>
      </div>

      {/* ROW 1: LOAN APPLICATION STATUS DONUT CHART & PAYOUT SETTLEMENT BREAKDOWN */}
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

          <StatusDonutOverview statusMetrics={statusDonutMetrics} isLoading={isLoading} />
        </div>

        {/* 2. APPLICATION ACTIVITY (6 COLS - BESIDE DONUT CHART) */}
        <div ref={activityContainerRef} className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Application Activity
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Loan applications submitted over time
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
              No application activity recorded yet.
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
                        <span
                          className="text-[10px] font-bold text-[#B063FF] mb-1 tabular-nums transition-all duration-500 ease-out"
                          style={{
                            opacity: isActivityAnimated ? 1 : 0,
                            transform: isActivityAnimated ? "translateY(0)" : "translateY(6px)",
                            transitionDelay: `${idx * 40 + 150}ms`,
                          }}
                        >
                          {pt.count}
                        </span>
                      )}

                      {/* Vertical Column */}
                      <div className="w-full max-w-[28px] flex items-end justify-center h-full">
                        {pt.count > 0 ? (
                          <div
                            className="w-full bg-[#B063FF] hover:bg-[#9c4be8] rounded-t-sm transition-all duration-700 ease-out shadow-2xs"
                            style={{
                              height: isActivityAnimated ? `${heightPct}%` : "0%",
                              transitionDelay: `${idx * 40}ms`,
                            }}
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
                  Total: {kpiMetrics.total} case{kpiMetrics.total !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: BANK PARTNER PERFORMANCE (12 COLS - FULL WIDTH LENDING MATRIX) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div ref={bankContainerRef} className="lg:col-span-12 rounded-lg border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Bank Partner Performance
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Sanction volume, disbursal liquidity, and approval rates by lending partner.
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Lending Matrix
            </span>
          </div>

          {isLoading ? (
            <div className="py-10 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-5/6" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-4/6" />
            </div>
          ) : bankList.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No bank application data logged yet.
            </div>
          ) : (
            <div className="py-2.5 my-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Partner Bank</th>
                    <th className="py-2.5 px-3 text-center">Total Cases</th>
                    <th className="py-2.5 px-3 text-center">Approved Files</th>
                    <th className="py-2.5 px-3">Sanction Volume</th>
                    <th className="py-2.5 px-3">Disbursed Volume</th>
                    <th className="py-2.5 px-3 text-right">Approval Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {bankList.map((b, idx) => {
                    const badge = getBankBadge(b.bank_name);
                    const maxSanc = Math.max(...bankList.map((x) => x.totalSanction), 1);
                    const barPct = Math.max(8, Math.round((b.totalSanction / maxSanc) * 100));

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/70 transition-all duration-500 ease-out"
                        style={{
                          opacity: isBankAnimated ? 1 : 0,
                          transform: isBankAnimated ? "translateY(0)" : "translateY(10px)",
                          transitionDelay: `${idx * 50}ms`,
                        }}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${badge.bg} ${badge.text}`}>
                              {badge.code}
                            </span>
                            <span className="font-semibold text-slate-900 truncate" title={b.bank_name}>
                              {b.bank_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-700 tabular-nums">
                          {b.totalCases}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-emerald-700 tabular-nums">
                          {b.approvedCases}
                        </td>
                        <td className="py-3 px-3 min-w-[150px]">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-900 tabular-nums block">
                              {formatCurrency(b.totalSanction)}
                            </span>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-600 rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: isBankAnimated ? `${barPct}%` : "0%",
                                  transitionDelay: `${idx * 50 + 100}ms`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-indigo-700 tabular-nums">
                          {formatCurrency(b.totalDisbursed)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums border transition-all duration-500 ease-out ${
                              b.approvalRate >= 70
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : b.approvalRate >= 45
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                            style={{
                              opacity: isBankAnimated ? 1 : 0.3,
                              transitionDelay: `${idx * 50 + 150}ms`,
                            }}
                          >
                            {b.approvalRate}%
                          </span>
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

      {/* ROW 3: RECENT APPLICATIONS TABLE (12 COLS - FULL WIDTH) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div ref={recentContainerRef} className="lg:col-span-12 rounded-lg border border-slate-200/80 bg-white p-5 lg:p-6 space-y-4">
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
                  {loanCases.slice(0, 6).map((lc, idx) => {
                    const rawStatus = (lc.status || "Submitted").trim();
                    const sLower = rawStatus.toLowerCase();
                    const statusKey =
                      sLower === "accepted" || sLower === "approved" || sLower === "verified"
                        ? "Accepted"
                        : sLower === "rejected"
                        ? "Rejected"
                        : "Submitted";

                    return (
                      <tr
                        key={lc.id}
                        className="hover:bg-slate-50/60 transition-all duration-500 ease-out"
                        style={{
                          opacity: isRecentAnimated ? 1 : 0,
                          transform: isRecentAnimated ? "translateY(0)" : "translateY(8px)",
                          transitionDelay: `${idx * 40}ms`,
                        }}
                      >
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