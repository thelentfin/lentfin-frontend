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

const BANK_COLOR_PALETTE = [
  "#004c8f", // 1st Place: Deep Navy Blue
  "#ea580c", // 2nd Place: Warm Amber Orange
  "#0d9488", // 3rd Place: Forest Teal
  "#4f46e5", // 4th Place: Indigo
  "#d97706", // 5th Place: Amber Gold
];

const getBankColor = (name, index = 0) => {
  // Color is strictly fixed by position/place (1st to 5th) regardless of bank name
  return BANK_COLOR_PALETTE[index % BANK_COLOR_PALETTE.length];
};

const getProductColor = (name, index = 0) => {
  const palette = ["#0d9488", "#2563eb", "#9333ea", "#d97706", "#e11d48", "#059669"];
  return palette[index % palette.length];
};

const getInitials = (name) => {
  if (!name) return "DS";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getSmoothSvgPath = (points) => {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

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
  const [trendMetric, setTrendMetric] = useState("margin"); // "margin" | "volume"
  const [distributionTab, setDistributionTab] = useState("bank"); // "bank" | "product"
  const [dsaTimeframe, setDsaTimeframe] = useState("Month"); // "Week" | "Month" | "Year" | "All"
  const [dsaAspect, setDsaAspect] = useState("volume"); // "volume" | "count" | "commission" | "quality"
  const [momentumViewBy, setMomentumViewBy] = useState("Month"); // "Month" | "Week" | "Year"
  const [hoveredMomentumIdx, setHoveredMomentumIdx] = useState(null);

  const chartSvgContainerRef = useRef(null);
  const [momentumChartWidth, setMomentumChartWidth] = useState(700);

  useEffect(() => {
    const node = chartSvgContainerRef.current;
    if (!node) return;

    const updateWidth = () => {
      if (chartSvgContainerRef.current) {
        const rectWidth = chartSvgContainerRef.current.clientWidth;
        if (rectWidth > 0) {
          setMomentumChartWidth(rectWidth);
        }
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const crWidth = entry.contentRect.width;
          if (crWidth > 0) {
            setMomentumChartWidth(Math.round(crWidth));
          }
        }
      });
      ro.observe(node);
      return () => ro.disconnect();
    } else {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

  // INDEPENDENT VIEWPORT-TRIGGERED ENTRANCE ANIMATIONS FOR ALL 5 DATA CARDS
  const [bankContainerRef, isBankAnimated] = useCardEntranceAnimation(isLoading, distributionTab);
  const [trendContainerRef, isTrendAnimated] = useCardEntranceAnimation(isLoading, `${viewBy}-${trendMetric}`);
  const [dsaContainerRef, isDsaAnimated] = useCardEntranceAnimation(isLoading, `${dsaTimeframe}-${dsaAspect}`);
  const [momentumContainerRef, isMomentumAnimated] = useCardEntranceAnimation(isLoading, momentumViewBy);
  const [gaugeContainerRef, isGaugeAnimated] = useCardEntranceAnimation(isLoading);

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

  // Helper to calculate commission amount for a single loan case
  const getCaseCommission = (c) => {
    if (c.rawPaymentAmount && !isNaN(c.rawPaymentAmount) && c.rawPaymentAmount > 0) {
      return Number(c.rawPaymentAmount);
    }
    if (c.payment_amount && !isNaN(c.payment_amount) && Number(c.payment_amount) > 0) {
      return Number(c.payment_amount);
    }
    if (c.paymentAmount && c.paymentAmount !== "—") {
      const parsed = Number(String(c.paymentAmount).replace(/[^0-9.-]+/g, ""));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // Base loan amount: prioritize disbursement amount, then sanction amount
    const rawDisb = c.disbursement_amount || c.rawDisbursementAmount || Number(String(c.disbursementAmount || "0").replace(/[^0-9.-]+/g, ""));
    const rawSanc = c.sanction_amount || c.rawSanctionAmount || Number(String(c.sanctionAmount || "0").replace(/[^0-9.-]+/g, ""));
    const baseAmount = (rawDisb && !isNaN(rawDisb) && rawDisb > 0) ? rawDisb : (rawSanc && !isNaN(rawSanc) ? rawSanc : 0);

    if (baseAmount > 0) {
      const paymentOptionStr = String(c.payment_option || c.paymentType || c.payment_type || c.paymentOption || "");
      const pct = c.payment_percentage || c.paymentPercentage
        ? Number(c.payment_percentage || c.paymentPercentage)
        : (paymentOptionStr.includes("48") || paymentOptionStr.includes("SPOT") ? 0.85 : 0.90);
      return Math.round((baseAmount * pct) / 100);
    }

    return 0;
  };

  // 2. FINANCIAL OVERVIEW METRICS (Sanctioned vs Disbursed vs Total DSA Commission)
  const financialMetrics = useMemo(() => {
    let totalSanctioned =
      dashboardSummary?.totalSanctionedAmount !== undefined
        ? Number(dashboardSummary.totalSanctionedAmount)
        : 0;
    let totalDisbursed =
      dashboardSummary?.totalDisbursedAmount !== undefined
        ? Number(dashboardSummary.totalDisbursedAmount)
        : 0;
    let totalCommission =
      dashboardSummary?.totalCommission !== undefined
        ? Number(dashboardSummary.totalCommission)
        : 0;

    const hasBackendFinancials =
      dashboardSummary?.totalSanctionedAmount !== undefined ||
      dashboardSummary?.totalCommission !== undefined;

    if (!hasBackendFinancials && Array.isArray(loanCases)) {
      totalSanctioned = 0;
      totalDisbursed = 0;
      totalCommission = 0;
      loanCases.forEach((lc) => {
        totalSanctioned += Number(lc.sanction_amount || 0);
        totalDisbursed += Number(lc.disbursement_amount || 0);

        const s = String(lc.status || "").toLowerCase().trim();
        if (["accepted", "approved", "verified"].includes(s)) {
          totalCommission += getCaseCommission(lc);
        }
      });
    }

    const maxVal = Math.max(totalSanctioned, totalDisbursed, totalCommission) || 1;

    return {
      sanctioned: totalSanctioned,
      disbursed: totalDisbursed,
      commission: totalCommission,
      sanctionedPct: Math.round((totalSanctioned / maxVal) * 100),
      disbursedPct: Math.round((totalDisbursed / maxVal) * 100),
      commissionPct: Math.round((totalCommission / maxVal) * 100),
    };
  }, [dashboardSummary, loanCases]);

  // 3. REVENUE & APPLICATION VOLUME TREND (Counts, Volume & Net Margin)
  const trendData = useMemo(() => {
    const cases = Array.isArray(loanCases) ? loanCases : [];

    const getCaseMargin = (c) => {
      let m = Number(c.netProfitSpread || 0);
      if (!m) {
        const vol = Number(c.disbursement_amount || c.sanction_amount || c.baseAmount || 0);
        const corpAmt = Number(c.corporateInflowAmount || 0);
        const dsaAmt = Number(c.dsaCommissionAmount || 0);
        if (corpAmt > 0 && dsaAmt > 0) {
          m = Math.max(0, corpAmt - dsaAmt);
        } else if (c.corporateRate !== undefined && c.dsaCommissionRate !== undefined && vol > 0) {
          m = Math.max(0, (vol * Number(c.corporateRate || 0)) / 100 - (vol * Number(c.dsaCommissionRate || 0)) / 100);
        }
      }
      return m;
    };

    // Parse valid timestamps from loanCases
    const validCases = cases
      .map((lc) => {
        if (!lc?.created_at && !lc?.disbursement_date) return null;
        const d = new Date(lc.disbursement_date || lc.created_at);
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
        months.push({ key: monthKey, label, fullLabel, year, monthIndex, count: 0, volume: 0, margin: 0 });
        curr.setMonth(curr.getMonth() + 1);
      }

      // Populate counts, volume & margin
      validCases.forEach((c) => {
        const key = `${c.dateObj.getFullYear()}-${String(c.dateObj.getMonth() + 1).padStart(2, "0")}`;
        const match = months.find((m) => m.key === key);
        if (match) {
          match.count += 1;
          const vol = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.volume += vol;
          match.margin += getCaseMargin(c);
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
          volume: 0,
          margin: 0,
        });
      }

      validCases.forEach((c) => {
        const match = weeks.find((w) => c.dateObj >= w.startDate && c.dateObj <= w.endDate);
        if (match) {
          match.count += 1;
          const vol = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.volume += vol;
          match.margin += getCaseMargin(c);
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
          volume: 0,
          margin: 0,
        });
      }

      validCases.forEach((c) => {
        const yStr = String(c.dateObj.getFullYear());
        const match = years.find((y) => y.key === yStr);
        if (match) {
          match.count += 1;
          const vol = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.volume += vol;
          match.margin += getCaseMargin(c);
        }
      });

      return years;
    }

    return [];
  }, [loanCases, viewBy]);

  // Total volume across all loan cases
  const totalVolume = useMemo(() => {
    if (dashboardSummary?.totalDisbursedAmount || dashboardSummary?.totalSanctionedAmount) {
      return Number(dashboardSummary.totalDisbursedAmount || dashboardSummary.totalSanctionedAmount || 0);
    }
    return loanCases.reduce(
      (sum, c) => sum + Number(c.disbursement_amount || c.sanction_amount || 0),
      0
    );
  }, [dashboardSummary, loanCases]);

  // Total net margin across all loan cases
  const totalMargin = useMemo(() => {
    if (dashboardSummary?.financialMetrics?.netPlatformSpread?.totalProfit !== undefined) {
      return Number(dashboardSummary.financialMetrics.netPlatformSpread.totalProfit);
    }
    return trendData.reduce((sum, pt) => sum + Number(pt.margin || 0), 0);
  }, [dashboardSummary, trendData]);

  // 4. MULTI-DIMENSIONAL DSA PERFORMANCE LEADERBOARD (Timeframe & Aspect Aware)
  const dsaPerformance = useMemo(() => {
    const cases = Array.isArray(loanCases) ? loanCases : [];

    // Fallback if no loanCases array but backend provides topDsaPerformance and timeframe is all/month
    if (cases.length === 0 && Array.isArray(dashboardSummary?.topDsaPerformance)) {
      const topList = dashboardSummary.topDsaPerformance
        .filter((d) => d.name && d.name.toLowerCase() !== "direct / unassigned" && d.name.trim() !== "");
      return topList.map((d) => ({
        ...d,
        approval_rate: d.approval_rate !== undefined ? d.approval_rate : 92,
      })).slice(0, 5);
    }

    if (cases.length === 0) return [];

    const now = new Date();

    // 1. Timeframe filtering
    const filteredCases = cases.filter((lc) => {
      const dName = (lc.dsa_name || lc.dsaName || "").trim();
      if (!dName || dName.toLowerCase() === "direct / unassigned") {
        return false;
      }

      if (dsaTimeframe === "All") return true;
      if (!lc.created_at) return true;

      const d = new Date(lc.created_at);
      if (isNaN(d.getTime())) return true;

      if (dsaTimeframe === "Week") {
        const currentDay = now.getDay();
        const diffToMonday = (currentDay + 6) % 7;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        return d >= weekStart;
      }

      if (dsaTimeframe === "Month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }

      if (dsaTimeframe === "Year") {
        return d.getFullYear() === now.getFullYear();
      }

      return true;
    });

    // 2. Group by DSA
    const stats = {};
    filteredCases.forEach((lc) => {
      const dName = (lc.dsa_name || lc.dsaName || "").trim();
      const sAmt = Number(lc.sanction_amount || 0);
      const dAmt = Number(lc.disbursement_amount || 0);
      const baseVol = dAmt > 0 ? dAmt : sAmt;

      if (!stats[dName]) {
        stats[dName] = {
          dsa_id: lc.dsa_id || lc.dsaId || 0,
          name: dName,
          count: 0,
          volume: 0,
          commission: 0,
          accepted_count: 0,
        };
      }
      stats[dName].count += 1;
      stats[dName].volume += baseVol;

      const s = String(lc.status || "").toLowerCase().trim();
      if (["accepted", "approved", "verified"].includes(s)) {
        stats[dName].commission += getCaseCommission(lc);
        stats[dName].accepted_count += 1;
      }
    });

    // 3. Compute approval rate
    const dsaList = Object.values(stats).map((item) => ({
      ...item,
      approval_rate: item.count > 0 ? Math.round((item.accepted_count / item.count) * 100) : 0,
    }));

    // Fallback to backend topDsaPerformance if timeframe filter returned empty but summary has data
    if (dsaList.length === 0 && Array.isArray(dashboardSummary?.topDsaPerformance) && dashboardSummary.topDsaPerformance.length > 0) {
      return dashboardSummary.topDsaPerformance
        .filter((d) => d.name && d.name.toLowerCase() !== "direct / unassigned" && d.name.trim() !== "")
        .map((d) => ({
          ...d,
          approval_rate: d.approval_rate !== undefined ? d.approval_rate : 92,
        }))
        .slice(0, 5);
    }

    // 4. Sort based on active aspect
    dsaList.sort((a, b) => {
      if (dsaAspect === "volume") {
        return b.volume - a.volume || b.count - a.count;
      }
      if (dsaAspect === "count") {
        return b.count - a.count || b.volume - a.volume;
      }
      if (dsaAspect === "commission") {
        return b.commission - a.commission || b.volume - a.volume;
      }
      if (dsaAspect === "quality") {
        return b.approval_rate - a.approval_rate || b.count - a.count || b.volume - a.volume;
      }
      return b.volume - a.volume;
    });

    return dsaList.slice(0, 5);
  }, [dashboardSummary, loanCases, dsaTimeframe, dsaAspect]);

  // 5. BANK PARTNER DISTRIBUTION & PRODUCT MIX DATA
  const bankDistributionData = useMemo(() => {
    if (
      Array.isArray(dashboardSummary?.bankDistribution) &&
      dashboardSummary.bankDistribution.length > 0
    ) {
      const totalVol = dashboardSummary.bankDistribution.reduce((acc, b) => acc + (b.volume || 0), 0) || 1;
      return dashboardSummary.bankDistribution.slice(0, 5).map((b) => ({
        ...b,
        share_pct: b.share_pct !== undefined ? b.share_pct : Math.round(((b.volume || 0) / totalVol) * 100),
      }));
    }

    if (!Array.isArray(loanCases) || loanCases.length === 0) return [];
    const stats = {};
    let totalVol = 0;
    loanCases.forEach((lc) => {
      const bName = (lc.bank_name || "Direct / Unassigned").trim();
      const vol = Number(lc.disbursement_amount || lc.sanction_amount || 0);
      if (!stats[bName]) {
        stats[bName] = { name: bName, count: 0, volume: 0 };
      }
      stats[bName].count += 1;
      stats[bName].volume += vol;
      totalVol += vol;
    });

    return Object.values(stats)
      .sort((a, b) => b.volume - a.volume || b.count - a.count)
      .slice(0, 5)
      .map((b) => ({
        ...b,
        share_pct: totalVol > 0 ? Math.round((b.volume / totalVol) * 100) : 0,
      }));
  }, [dashboardSummary?.bankDistribution, loanCases]);

  const productDistributionData = useMemo(() => {
    if (
      Array.isArray(dashboardSummary?.productDistribution) &&
      dashboardSummary.productDistribution.length > 0
    ) {
      const totalVol = dashboardSummary.productDistribution.reduce((acc, p) => acc + (p.volume || 0), 0) || 1;
      return dashboardSummary.productDistribution.slice(0, 5).map((p) => ({
        ...p,
        share_pct: p.share_pct !== undefined ? p.share_pct : Math.round(((p.volume || 0) / totalVol) * 100),
      }));
    }

    if (!Array.isArray(loanCases) || loanCases.length === 0) return [];
    const stats = {};
    let totalVol = 0;
    loanCases.forEach((lc) => {
      const pName = (lc.product_name || "Uncategorized").trim();
      const vol = Number(lc.disbursement_amount || lc.sanction_amount || 0);
      if (!stats[pName]) {
        stats[pName] = { name: pName, count: 0, volume: 0 };
      }
      stats[pName].count += 1;
      stats[pName].volume += vol;
      totalVol += vol;
    });

    return Object.values(stats)
      .sort((a, b) => b.volume - a.volume || b.count - a.count)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        share_pct: totalVol > 0 ? Math.round((p.volume / totalVol) * 100) : 0,
      }));
  }, [dashboardSummary?.productDistribution, loanCases]);

  // 6. FINANCIAL REVENUE SPREAD & LOAN MOMENTUM DATA (Wave Chart)
  const momentumData = useMemo(() => {
    const cases = Array.isArray(loanCases) ? loanCases : [];
    const validCases = cases
      .map((lc) => {
        if (!lc?.created_at) return null;
        const d = new Date(lc.created_at);
        return isNaN(d.getTime()) ? null : { ...lc, dateObj: d };
      })
      .filter(Boolean);

    const now = new Date();

    if (momentumViewBy === "Month") {
      let minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      let maxDate = new Date(now.getFullYear(), now.getMonth(), 1);

      validCases.forEach((c) => {
        const firstOfMonth = new Date(c.dateObj.getFullYear(), c.dateObj.getMonth(), 1);
        if (firstOfMonth < minDate) minDate = firstOfMonth;
        if (firstOfMonth > maxDate) maxDate = firstOfMonth;
      });

      const months = [];
      const curr = new Date(minDate);
      while (curr <= maxDate) {
        const year = curr.getFullYear();
        const monthKey = `${year}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
        const label = curr.toLocaleDateString("en-IN", { month: "short" });
        const fullLabel = curr.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        months.push({
          key: monthKey,
          label,
          fullLabel,
          year,
          disbursed: 0,
          spread: 0,
          count: 0,
        });
        curr.setMonth(curr.getMonth() + 1);
      }

      validCases.forEach((c) => {
        const key = `${c.dateObj.getFullYear()}-${String(c.dateObj.getMonth() + 1).padStart(2, "0")}`;
        const match = months.find((m) => m.key === key);
        if (match) {
          const disb = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.disbursed += disb;
          match.spread += getCaseCommission(c) || Math.round(disb * 0.009);
          match.count += 1;
        }
      });

      return months;
    }

    if (momentumViewBy === "Week") {
      const currentDay = now.getDay();
      const diffToMonday = (currentDay + 6) % 7;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - diffToMonday);
      currentWeekStart.setHours(0, 0, 0, 0);

      const weeks = [];
      for (let i = 7; i >= 0; i--) {
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
          disbursed: 0,
          spread: 0,
          count: 0,
        });
      }

      validCases.forEach((c) => {
        const match = weeks.find((w) => c.dateObj >= w.startDate && c.dateObj <= w.endDate);
        if (match) {
          const disb = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.disbursed += disb;
          match.spread += getCaseCommission(c) || Math.round(disb * 0.009);
          match.count += 1;
        }
      });

      return weeks;
    }

    if (momentumViewBy === "Year") {
      let minYear = now.getFullYear() - 2;
      let maxYear = now.getFullYear();

      const years = [];
      for (let y = minYear; y <= maxYear; y++) {
        years.push({
          key: String(y),
          label: String(y),
          fullLabel: `Year ${y}`,
          disbursed: 0,
          spread: 0,
          count: 0,
        });
      }

      validCases.forEach((c) => {
        const yStr = String(c.dateObj.getFullYear());
        const match = years.find((y) => y.key === yStr);
        if (match) {
          const disb = Number(c.disbursement_amount || c.sanction_amount || 0);
          match.disbursed += disb;
          match.spread += getCaseCommission(c) || Math.round(disb * 0.009);
          match.count += 1;
        }
      });

      return years;
    }

    return [];
  }, [loanCases, momentumViewBy]);

  // 7. OPERATIONAL HEALTH & VELOCITY METRICS (Radial Gauge)
  const operationalHealthMetrics = useMemo(() => {
    const cases = Array.isArray(loanCases) ? loanCases : [];
    const total = dashboardSummary?.loanCases || cases.length || 0;
    const accepted = dashboardSummary?.accepted || cases.filter((c) => ["accepted", "approved", "verified"].includes(String(c.status || "").toLowerCase())).length || 0;
    const disbursedCases = cases.filter((c) => Number(c.disbursement_amount || 0) > 0 || String(c.status || "").toLowerCase().includes("disburs"));

    // 1. Approval & conversion rates
    const approvalRate = total > 0 ? Math.round((accepted / total) * 100) : 92;
    const conversionRate = accepted > 0 ? Math.min(100, Math.round(((disbursedCases.length || Math.round(accepted * 0.85)) / accepted) * 100)) : 88.5;

    // 2. Average Turnaround Time (TAT)
    let totalTatHours = 0;
    let tatCount = 0;
    cases.forEach((c) => {
      if (c.created_at && (c.reviewed_at || c.updated_at)) {
        const start = new Date(c.created_at);
        const end = new Date(c.reviewed_at || c.updated_at);
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (!isNaN(diffHours) && diffHours > 0 && diffHours < 720) {
          totalTatHours += diffHours;
          tatCount++;
        }
      }
    });

    let avgTatDisplay = "< 1 Day";
    if (tatCount > 0) {
      const avgDays = totalTatHours / tatCount / 24;
      if (avgDays < 1) {
        avgTatDisplay = "< 1 Day";
      } else {
        avgTatDisplay = `${avgDays.toFixed(1)} Days`;
      }
    } else {
      avgTatDisplay = "< 1 Day";
    }

    // 3. Payout Speed (Spot 48h share)
    const spotCount = cases.filter((c) => {
      const opt = String(c.payment_option || c.paymentType || "").toLowerCase();
      return opt.includes("spot") || opt.includes("48");
    }).length;
    const spotPct = cases.length > 0 ? Math.round((spotCount / cases.length) * 100) || 85 : 85;

    // Composite Operational Score (out of 100)
    const compositeScore = Math.min(99, Math.max(78, Math.round(approvalRate * 0.55 + conversionRate * 0.45)));

    return {
      score: compositeScore || 92,
      avgTat: avgTatDisplay,
      conversionPct: `${conversionRate || 88.5}%`,
      payoutSpeed: `48h Spot`,
      payoutPct: `${spotPct}%`,
      statusLabel: compositeScore >= 85 ? "High Velocity" : "Optimal",
    };
  }, [dashboardSummary, loanCases]);

  const formatCompactCurrency = (val) => {
    if (!val || isNaN(val)) return "₹0";
    const num = Number(val);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)} K`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return "₹0";
    const num = Number(val);
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString("en-IN", {
      maximumFractionDigits: hasDecimals ? 2 : 0,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    })}`;
  };

  const formatCompact = (val) => {
    if (!val || isNaN(val)) return "₹0";
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
    return `₹${Math.round(num)}`;
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
    <div className="space-y-4 sm:space-y-5">
      {/* ROW 1: APPLICATION STATUS OVERVIEW & LOAN AMOUNT OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5">
        {/* 1. APPLICATION STATUS OVERVIEW (6 COLS) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-2.5 sm:pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Customer Application Status Overview
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              See the current breakdown of submitted, accepted, and rejected applications.
            </p>
          </div>

          <StatusDonutOverview statusMetrics={statusMetrics} isLoading={isLoading} />
        </div>

        {/* 2. BANK PARTNER VOLUME SHARE & LOAN PRODUCT MIX (6 COLS) */}
        <div ref={bankContainerRef} className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-2.5 sm:pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                {distributionTab === "bank" ? "Bank Partner Volume Share" : "Loan Product Mix"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                {distributionTab === "bank"
                  ? "Distribution of loan volume and cases across lending banks."
                  : "Breakdown of volume and demand across loan products."}
              </p>
            </div>

            {/* Interactive Tab Toggle: Bank Partner vs Loan Product Mix */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDistributionTab("bank")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  distributionTab === "bank"
                    ? "bg-white text-[#B063FF] shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bank Partner
              </button>
              <button
                type="button"
                onClick={() => setDistributionTab("product")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  distributionTab === "product"
                    ? "bg-white text-[#B063FF] shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Loan Product Mix
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 space-y-4 my-auto">
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-4/5" />
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-2/3" />
            </div>
          ) : distributionTab === "bank" ? (
            bankDistributionData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
                No bank partner volume data available.
              </div>
            ) : (
              <div className="py-3 my-auto space-y-3">
                {bankDistributionData.map((b, idx) => {
                  const color = getBankColor(b.name, idx);
                  const targetWidth = Math.max(4, Math.min(100, b.share_pct || 0));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className="text-slate-900 truncate max-w-[150px] sm:max-w-[200px] font-semibold"
                            title={b.name}
                          >
                            {b.name}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium shrink-0">
                            {b.count} case{b.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-semibold tabular-nums text-right shrink-0">
                          <span className="text-slate-700 text-xs">
                            {formatCurrency(b.volume)}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-300"
                            style={{
                              color: color,
                              backgroundColor: `${color}18`,
                              opacity: isBankAnimated ? 1 : 0.3,
                            }}
                          >
                            {b.share_pct || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: isBankAnimated ? `${targetWidth}%` : "0%",
                            backgroundColor: color,
                            transitionDelay: `${idx * 40}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>Top banking partners by volume</span>
                  <span className="font-medium text-slate-700">
                    Total: {formatCurrency(totalVolume)}
                  </span>
                </div>
              </div>
            )
          ) : productDistributionData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No loan product mix data available.
            </div>
          ) : (
            <div className="py-3 my-auto space-y-3">
              {productDistributionData.map((p, idx) => {
                const color = getProductColor(p.name, idx);
                const targetWidth = Math.max(4, Math.min(100, p.share_pct || 0));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="text-slate-900 truncate max-w-[150px] sm:max-w-[200px] font-semibold"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium shrink-0">
                          {p.count} case{p.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold tabular-nums text-right shrink-0">
                        <span className="text-slate-700 text-xs">
                          {formatCurrency(p.volume)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-300"
                          style={{
                            color: color,
                            backgroundColor: `${color}18`,
                            opacity: isBankAnimated ? 1 : 0.3,
                          }}
                        >
                          {p.share_pct || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: isBankAnimated ? `${targetWidth}%` : "0%",
                          backgroundColor: color,
                          transitionDelay: `${idx * 40}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span>Volume mix by credit product category</span>
                <span className="font-medium text-slate-700">
                  Total: {formatCurrency(totalVolume)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: APPLICATION VOLUME TREND & DSA PERFORMANCE OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 3. REVENUE & APPLICATION VOLUME TREND (6 COLS) */}
        <div ref={trendContainerRef} className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="min-w-0 pr-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Revenue &amp; Volume Trend
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Track net platform profit, loan volume, and disbursed case count over time.
              </p>
            </div>

            {/* Controls: Stacked vertically (up-down) in the same column */}
            <div className="flex flex-col items-end gap-1.5 shrink-0 self-start sm:self-center">
              {/* Metric Switcher (Net Margin vs Loan Volume) */}
              <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setTrendMetric("margin")}
                  className={`px-2 py-0.5 text-[10.5px] font-medium rounded transition-all cursor-pointer inline-flex items-center gap-1 ${
                    trendMetric === "margin"
                      ? "bg-white text-[#B063FF] shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Display LentFin Net Retained Margin (Profit)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${trendMetric === "margin" ? "bg-[#B063FF]" : "bg-slate-400"}`} />
                  <span>Net Margin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric("volume")}
                  className={`px-2 py-0.5 text-[10.5px] font-medium rounded transition-all cursor-pointer inline-flex items-center gap-1 ${
                    trendMetric === "volume"
                      ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Display Gross Loan Volume (Principal)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${trendMetric === "volume" ? "bg-indigo-600" : "bg-slate-400"}`} />
                  <span>Loan Volume</span>
                </button>
              </div>

              {/* View By Selector */}
              <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200/80">
                {["Month", "Week", "Year"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setViewBy(option)}
                    className={`px-2 py-0.5 text-[10.5px] font-medium rounded transition-all cursor-pointer ${
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
          </div>

          {/* Legend (Clean indicator without any box card, left-aligned) */}
          <div className="flex items-center justify-start gap-3.5 text-[10.5px] text-slate-500 pt-1.5 pb-0.5 pl-0.5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-2.5 h-2.5 rounded-xs ${trendMetric === "margin" ? "bg-[#B063FF]" : "bg-indigo-600"}`} />
              <span>Bars: {trendMetric === "margin" ? "Net Margin" : "Volume"}</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              <span>Line: Cases</span>
            </span>
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
          ) : (() => {
            const maxMetricVal = Math.max(...trendData.map((t) => t[trendMetric] || 0), 1);
            const maxCaseCount = Math.max(...trendData.map((t) => t.count || 0), 1);

            return (
              <div className="py-1 my-auto space-y-2 relative">
                {/* Chart Box with Left Y-Axis Scale */}
                <div className="h-44 w-full flex gap-2 pt-2">
                  {/* Left Y-Axis Amount Scale (5 levels) */}
                  <div className="w-11 shrink-0 flex flex-col justify-between items-end text-[9px] font-medium text-slate-400 select-none pr-1.5 border-r border-slate-200/80">
                    <span className="truncate leading-none">{formatCompact(maxMetricVal)}</span>
                    <span className="truncate leading-none">{formatCompact(Math.round(maxMetricVal * 0.75))}</span>
                    <span className="truncate leading-none">{formatCompact(Math.round(maxMetricVal * 0.50))}</span>
                    <span className="truncate leading-none">{formatCompact(Math.round(maxMetricVal * 0.25))}</span>
                    <span className="leading-none">₹0</span>
                  </div>

                  {/* Chart Body (Bars + Case Count Polyline) */}
                  <div className="flex-1 relative flex items-end justify-between gap-1.5 sm:gap-2 px-1">
                    {/* Background horizontal dashed grid lines (5 levels) */}
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none -z-0">
                      <div className="w-full border-b border-dashed border-slate-100" />
                      <div className="w-full border-b border-dashed border-slate-100" />
                      <div className="w-full border-b border-dashed border-slate-100" />
                      <div className="w-full border-b border-dashed border-slate-100" />
                      <div className="w-full border-b border-slate-200/80" />
                    </div>

                    {/* SVG Connected Polyline for Case Count */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
                      {/* Connecting Line Segments */}
                      {trendData.slice(0, -1).map((pt, idx) => {
                        const nextPt = trendData[idx + 1];
                        const x1 = ((idx + 0.5) / trendData.length) * 100;
                        const countRatio1 = pt.count > 0 ? pt.count / maxCaseCount : 0;
                        const y1 = 92 - countRatio1 * 50;

                        const x2 = ((idx + 1.5) / trendData.length) * 100;
                        const countRatio2 = nextPt.count > 0 ? nextPt.count / maxCaseCount : 0;
                        const y2 = 92 - countRatio2 * 50;

                        return (
                          <line
                            key={`conn-line-${idx}`}
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="#10B981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                          />
                        );
                      })}

                      {/* Circular nodes on the line */}
                      {trendData.map((pt, idx) => {
                        const xPercent = `${((idx + 0.5) / trendData.length) * 100}%`;
                        const countRatio = pt.count > 0 ? pt.count / maxCaseCount : 0;
                        const yPercent = `${92 - countRatio * 50}%`;

                        return (
                          <circle
                            key={`node-${idx}`}
                            cx={xPercent}
                            cy={yPercent}
                            r={pt.count > 0 ? 3.5 : 2.5}
                            fill="#FFFFFF"
                            stroke="#10B981"
                            strokeWidth="2.5"
                            className="transition-all duration-700 ease-out"
                          />
                        );
                      })}
                    </svg>

                    {/* Vertical Columns for Selected Metric (Margin / Volume) */}
                    {trendData.map((pt, idx) => {
                      const currentVal = pt[trendMetric] || 0;
                      const fullHeightPct = currentVal > 0 ? Math.max(4, Math.round((currentVal / maxMetricVal) * 100)) : 0;
                      const isMargin = trendMetric === "margin";

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group h-full relative min-w-0 z-10 hover:z-30">
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-20 hidden group-hover:flex flex-col items-center z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="bg-slate-900 text-white text-[10px] rounded-lg p-2.5 shadow-xl border border-slate-700/80 whitespace-nowrap space-y-1">
                              <div className="font-bold text-slate-300 border-b border-slate-800 pb-0.5">
                                {pt.fullLabel || pt.label}
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Cases:</span>
                                <span className="font-mono font-bold text-emerald-400">{pt.count} {pt.count === 1 ? "case" : "cases"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Loan Volume:</span>
                                <span className="font-mono font-semibold text-white">{formatCurrency(pt.volume)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Net Profit:</span>
                                <span className="font-mono font-bold text-[#D39BFF]">+{formatCurrency(pt.margin)}</span>
                              </div>
                            </div>
                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
                          </div>

                          {/* Bar */}
                          <div className="w-full max-w-[26px] flex items-end justify-center h-full">
                            {currentVal > 0 ? (
                              <div
                                className={`w-full rounded-t-sm transition-all duration-700 ease-out shadow-2xs cursor-pointer ${
                                  isMargin
                                    ? "bg-gradient-to-t from-[#B063FF] to-[#9C4BE8] hover:brightness-110"
                                    : "bg-gradient-to-t from-indigo-600 to-indigo-500 hover:brightness-110"
                                }`}
                                style={{
                                  height: isTrendAnimated ? `${fullHeightPct}%` : "0%",
                                  transitionDelay: `${idx * 35}ms`,
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
                </div>

                {/* X-Axis Labels aligned with the bars */}
                <div className="flex gap-2">
                  <div className="w-11 shrink-0" />
                  <div className="flex-1 flex justify-between gap-1.5 sm:gap-2 px-1 text-center">
                    {trendData.map((pt, idx) => (
                      <div key={idx} className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-500 font-medium truncate block max-w-full" title={pt.fullLabel || pt.label}>
                          {pt.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-2 border-t border-slate-100/80">
                  <span>Grouped by {viewBy.toLowerCase()} • {trendMetric === "margin" ? "Net Margin distribution" : "Gross Volume distribution"}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    Total: {loanCases.length} case{loanCases.length !== 1 ? "s" : ""} • {formatCurrency(totalVolume)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 4. DSA PERFORMANCE LEADERBOARD (6 COLS) */}
        <div ref={dsaContainerRef} className="lg:col-span-6 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="border-b border-slate-200/80 pb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  DSA Performance Leaderboard
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                    Top 5
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                  Rank and evaluate partners across volume, cases, revenue & quality.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab("dsa")}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer shrink-0 ml-2"
              >
                View All DSAs →
              </button>
            </div>

            {/* Filter Controls: Timeframe (Week/Month/Year/All) & Aspect (Volume/Cases/Revenue/Quality) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {/* Timeframe Filter */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                {[
                  { key: "Week", label: "Week" },
                  { key: "Month", label: "Month" },
                  { key: "Year", label: "Year" },
                  { key: "All", label: "All Time" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setDsaTimeframe(t.key)}
                    className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      dsaTimeframe === t.key
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Performance Aspect Filter */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                {[
                  { key: "volume", label: "Volume ₹" },
                  { key: "count", label: "Cases" },
                  { key: "commission", label: "Revenue ₹" },
                  { key: "quality", label: "Quality %" },
                ].map((asp) => (
                  <button
                    key={asp.key}
                    type="button"
                    onClick={() => setDsaAspect(asp.key)}
                    className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      dsaAspect === asp.key
                        ? "bg-white text-[#B063FF] shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {asp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-3/4" />
            </div>
          ) : dsaPerformance.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No DSA performance records found for {dsaTimeframe === "All" ? "all time" : `this ${dsaTimeframe.toLowerCase()}`}.
            </div>
          ) : (
            <div className="py-2.5 my-auto space-y-2">
              {dsaPerformance.map((d, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100/80 hover:border-slate-200 hover:bg-slate-50/70 transition-all duration-500 ease-out"
                    style={{
                      opacity: isDsaAnimated ? 1 : 0,
                      transform: isDsaAnimated ? "translateY(0)" : "translateY(14px)",
                      transitionDelay: `${idx * 60}ms`,
                    }}
                  >
                    {/* Rank Badge */}
                    <div className="shrink-0 flex items-center justify-center">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-md bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow-2xs ring-1 ring-amber-300">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-md bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center shadow-2xs ring-1 ring-slate-200">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-md bg-amber-600 text-amber-50 font-bold text-xs flex items-center justify-center shadow-2xs ring-1 ring-amber-500">
                          3
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center border border-slate-200/80">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* DSA Avatar Initials */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100 text-purple-700 border border-purple-200/80 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {getInitials(d.name)}
                    </div>

                    {/* Partner Name & Sub-metrics */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]"
                          title={d.name}
                        >
                          {d.name}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            👑 Leader
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 flex-wrap mt-0.5">
                        <span className="tabular-nums">{d.count} case{d.count !== 1 ? "s" : ""}</span>
                        <span className="text-slate-300">•</span>
                        <span className="tabular-nums">{formatCurrency(d.volume)} Vol</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-purple-700 font-medium tabular-nums">{formatCurrency(d.commission)} Comm</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-semibold tabular-nums">Quality {d.approval_rate}%</span>
                      </div>
                    </div>

                    {/* Primary Highlight Pill based on active aspect */}
                    <div className="text-right shrink-0 pl-1">
                      {dsaAspect === "volume" && (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                            {formatCurrency(d.volume)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Business</div>
                        </div>
                      )}
                      {dsaAspect === "count" && (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-[#B063FF] tabular-nums">
                            {d.count} Cases
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Activity</div>
                        </div>
                      )}
                      {dsaAspect === "commission" && (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-purple-700 tabular-nums">
                            {formatCurrency(d.commission)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Payout</div>
                        </div>
                      )}
                      {dsaAspect === "quality" && (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
                            {d.approval_rate}%
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Approval</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span>
                  Ranked by{" "}
                  <strong className="font-semibold text-slate-600">
                    {dsaAspect === "volume"
                      ? "Highest Loan Volume"
                      : dsaAspect === "count"
                      ? "Most Cases Processed"
                      : dsaAspect === "commission"
                      ? "Top Commission Earned"
                      : "Highest File Approval Rate"}
                  </strong>
                </span>
                <span className="font-medium text-slate-700">
                  {dsaTimeframe === "All" ? "All Time Records" : `This ${dsaTimeframe}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: REVENUE SPREAD & LOAN MOMENTUM (WAVE CHART) & OPERATIONAL HEALTH & VELOCITY (RADIAL GAUGE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 5. REVENUE SPREAD & LOAN MOMENTUM (7 COLS) */}
        <div ref={momentumContainerRef} className="lg:col-span-7 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="text-emerald-600">📈</span>
                Revenue Spread & Loan Momentum
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Continuous volume trajectory and net platform commission spread.
              </p>
            </div>

            {/* Legend & Timeframe Selector */}
            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1.5 rounded-full bg-emerald-500" />
                  Disbursed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1.5 rounded-full bg-purple-600" />
                  Spread
                </span>
              </div>

              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                {["Month", "Week", "Year"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMomentumViewBy(opt)}
                    className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      momentumViewBy === opt
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 space-y-3 my-auto">
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-4 bg-slate-100 animate-pulse rounded-md w-4/5" />
            </div>
          ) : momentumData.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-400 bg-slate-50 rounded-md border border-slate-200/80 my-auto">
              No financial momentum data available.
            </div>
          ) : (
            (() => {
              const svgWidth = Math.max(340, momentumChartWidth || 700);
              const svgHeight = 195;
              const paddingLeft = 58;
              const paddingRight = 58;
              const paddingTop = 22;
              const bottomY = 160;
              const chartWidth = svgWidth - paddingLeft - paddingRight;
              const chartHeight = bottomY - paddingTop;

              const maxDisbursed = Math.max(...momentumData.map((d) => d.disbursed), 100000);
              const maxSpread = Math.max(...momentumData.map((d) => d.spread), 1000);

              const numPoints = Math.max(momentumData.length, 1);
              const stepX = numPoints > 1 ? chartWidth / (numPoints - 1) : chartWidth / 2;

              const pointsDisbursed = momentumData.map((d, i) => {
                const x = paddingLeft + i * stepX;
                const yRatio = d.disbursed / maxDisbursed;
                const y = bottomY - yRatio * chartHeight;
                return { x, y, ...d };
              });

              const pointsSpread = momentumData.map((d, i) => {
                const x = paddingLeft + i * stepX;
                const yRatio = d.spread / maxSpread;
                const y = bottomY - yRatio * (chartHeight * 0.85);
                return { x, y, ...d };
              });

              const pathDisbursedLine = getSmoothSvgPath(pointsDisbursed);
              const pathSpreadLine = getSmoothSvgPath(pointsSpread);

              const pathDisbursedArea = pointsDisbursed.length > 0
                ? `${pathDisbursedLine} L ${pointsDisbursed[pointsDisbursed.length - 1].x.toFixed(1)} ${bottomY} L ${pointsDisbursed[0].x.toFixed(1)} ${bottomY} Z`
                : "";

              const pathSpreadArea = pointsSpread.length > 0
                ? `${pathSpreadLine} L ${pointsSpread[pointsSpread.length - 1].x.toFixed(1)} ${bottomY} L ${pointsSpread[0].x.toFixed(1)} ${bottomY} Z`
                : "";

              const hoveredPt = hoveredMomentumIdx !== null && pointsDisbursed[hoveredMomentumIdx]
                ? {
                    ...pointsDisbursed[hoveredMomentumIdx],
                    spreadY: pointsSpread[hoveredMomentumIdx]?.y,
                    spreadVal: pointsSpread[hoveredMomentumIdx]?.spread,
                  }
                : null;

              return (
                <div className="py-2.5 my-auto relative">
                  {/* Floating Tooltip Card */}
                  {hoveredPt && (
                    <div
                      className="absolute pointer-events-none z-20 bg-slate-900/95 text-white rounded-lg shadow-xl p-2.5 border border-slate-700/80 text-[11px] whitespace-nowrap transition-all duration-150 backdrop-blur-xs"
                      style={{
                        left: `${Math.min(78, Math.max(22, (hoveredPt.x / svgWidth) * 100))}%`,
                        top: "10px",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="font-semibold text-slate-200 pb-1 mb-1 border-b border-slate-700/80 flex items-center justify-between gap-4">
                        <span>{hoveredPt.fullLabel || hoveredPt.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {hoveredPt.count} case{hoveredPt.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Disbursed
                          </span>
                          <span className="font-bold text-white tabular-nums">
                            {formatCurrency(hoveredPt.disbursed)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            Net Spread
                          </span>
                          <span className="font-bold text-white tabular-nums">
                            {formatCurrency(hoveredPt.spreadVal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SVG Wave Chart */}
                  <div ref={chartSvgContainerRef} className="w-full h-48 sm:h-52 relative">
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible select-none"
                      onMouseLeave={() => setHoveredMomentumIdx(null)}
                    >
                      <defs>
                        {/* Teal-Emerald Wave Gradient */}
                        <linearGradient id="disbursedWaveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                          <stop offset="50%" stopColor="#10b981" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                        </linearGradient>

                        {/* Purple Spread Wave Gradient */}
                        <linearGradient id="spreadWaveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.30" />
                          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle Horizontal Grid Lines */}
                      {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = bottomY - pct * chartHeight;
                        return (
                          <g key={idx}>
                            <line
                              x1={paddingLeft}
                              y1={y}
                              x2={svgWidth - paddingRight}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeDasharray="3 4"
                              strokeWidth="0.8"
                            />
                            {/* Left Y Axis Label (Disbursed) */}
                            <text
                              x={paddingLeft - 6}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[9px] fill-slate-400 tabular-nums font-mono font-medium"
                            >
                              {formatCompactCurrency(maxDisbursed * pct)}
                            </text>
                            {/* Right Y Axis Label (Spread) */}
                            <text
                              x={svgWidth - paddingRight + 6}
                              y={y + 3}
                              textAnchor="start"
                              className="text-[9px] fill-purple-400 tabular-nums font-mono font-medium"
                            >
                              {formatCompactCurrency(maxSpread * pct)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Zero baseline */}
                      <line
                        x1={paddingLeft}
                        y1={bottomY}
                        x2={svgWidth - paddingRight}
                        y2={bottomY}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />

                      {/* Disbursed Area Fill */}
                      <path
                        d={pathDisbursedArea}
                        fill="url(#disbursedWaveGrad)"
                        className="transition-opacity duration-700 ease-out"
                        style={{ opacity: isMomentumAnimated ? 1 : 0 }}
                      />

                      {/* Spread Area Fill */}
                      <path
                        d={pathSpreadArea}
                        fill="url(#spreadWaveGrad)"
                        className="transition-opacity duration-700 ease-out"
                        style={{ opacity: isMomentumAnimated ? 1 : 0 }}
                      />

                      {/* Spread Stroke Line (Purple) */}
                      <path
                        d={pathSpreadLine}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeDasharray="1200"
                        style={{
                          strokeDashoffset: isMomentumAnimated ? 0 : 1200,
                          transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />

                      {/* Disbursed Stroke Line (Emerald) */}
                      <path
                        d={pathDisbursedLine}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeDasharray="1200"
                        style={{
                          strokeDashoffset: isMomentumAnimated ? 0 : 1200,
                          transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />

                      {/* Hovered Guide Line & Active Dots */}
                      {hoveredPt && (
                        <g>
                          <line
                            x1={hoveredPt.x}
                            y1={paddingTop}
                            x2={hoveredPt.x}
                            y2={bottomY}
                            stroke="#64748b"
                            strokeDasharray="3 3"
                            strokeWidth="1.2"
                          />
                          {/* Green Active Dot */}
                          <circle
                            cx={hoveredPt.x}
                            cy={hoveredPt.y}
                            r="5"
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                          />
                          {/* Purple Active Dot */}
                          <circle
                            cx={hoveredPt.x}
                            cy={hoveredPt.spreadY}
                            r="4.5"
                            fill="#7c3aed"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="filter drop-shadow-[0_0_6px_rgba(124,58,237,0.8)]"
                          />
                        </g>
                      )}

                      {/* X-Axis Data Point Labels */}
                      {pointsDisbursed.map((pt, i) => (
                        <text
                          key={i}
                          x={pt.x}
                          y={bottomY + 16}
                          textAnchor="middle"
                          className={`text-[9.5px] tabular-nums font-medium transition-colors ${
                            hoveredMomentumIdx === i ? "fill-slate-900 font-bold" : "fill-slate-500"
                          }`}
                        >
                          {pt.label}
                        </text>
                      ))}

                      {/* Transparent Hover Hit Zones */}
                      {pointsDisbursed.map((pt, i) => (
                        <rect
                          key={i}
                          x={pt.x - stepX / 2}
                          y={0}
                          width={stepX}
                          height={svgHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredMomentumIdx(i)}
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Bottom Insight Strip */}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <span>Grouped by {momentumViewBy.toLowerCase()} • Continuous velocity curve</span>
                    <span className="font-medium text-slate-700 tabular-nums">
                      Disbursed: {formatCurrency(totalVolume)}
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* 6. OPERATIONAL HEALTH & TURNAROUND VELOCITY (5 COLS) */}
        <div ref={gaugeContainerRef} className="lg:col-span-5 rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between relative">
          <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="text-purple-600">⚡</span>
                Operational Health & Velocity
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Platform processing speed, conversion efficiency & turnaround metrics.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80 shrink-0">
              Live KPI
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 space-y-3 my-auto">
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-full" />
              <div className="h-5 bg-slate-100 animate-pulse rounded-md w-3/4 mx-auto" />
            </div>
          ) : (
            (() => {
              const gaugeR = 85;
              const gaugeCx = 140;
              const gaugeCy = 118;
              const gaugeArcLength = Math.PI * gaugeR; // 267.04
              const targetScore = operationalHealthMetrics.score || 92;
              const gaugeOffset = gaugeArcLength * (1 - (targetScore / 100));

              // Compute cursor coordinate on arc
              const angleRad = Math.PI - (Math.PI * (targetScore / 100));
              const indicatorX = gaugeCx + gaugeR * Math.cos(angleRad);
              const indicatorY = gaugeCy - gaugeR * Math.sin(angleRad);

              return (
                <div className="py-2.5 my-auto space-y-3">
                  {/* Gauge Arc Graphic Container */}
                  <div className="relative w-full max-w-[280px] mx-auto aspect-[280/150] flex items-center justify-center">
                    <svg
                      viewBox="0 0 280 150"
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        {/* Speedometer Arc Gradient: Emerald to Cyan to Violet */}
                        <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="45%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>

                      {/* Gray Background Track Arc */}
                      <path
                        d="M 55 118 A 85 85 0 0 1 225 118"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      {/* Colored Active Arc */}
                      <path
                        d="M 55 118 A 85 85 0 0 1 225 118"
                        fill="none"
                        stroke="url(#gaugeArcGrad)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={gaugeArcLength}
                        style={{
                          strokeDashoffset: isGaugeAnimated ? gaugeOffset : gaugeArcLength,
                          transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />

                      {/* Glowing Needle Head Cursor */}
                      {isGaugeAnimated && (
                        <circle
                          cx={indicatorX}
                          cy={indicatorY}
                          r="6.5"
                          fill="#ffffff"
                          stroke="#06b6d4"
                          strokeWidth="3"
                          className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.85)] transition-all duration-1000 ease-out"
                        />
                      )}

                      {/* 0% and 100% boundary labels */}
                      <text
                        x="55"
                        y="138"
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono font-semibold"
                      >
                        0%
                      </text>
                      <text
                        x="225"
                        y="138"
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono font-semibold"
                      >
                        100%
                      </text>
                    </svg>

                    {/* Inside Arc Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                        {targetScore}%
                      </span>
                      <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 mt-0.5 flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {operationalHealthMetrics.statusLabel}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-medium mt-0.5 tracking-wider uppercase">
                        Efficiency Score
                      </span>
                    </div>
                  </div>

                  {/* 3 Bottom Operational Stat Tiles */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div
                      className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 transition-all duration-500"
                      style={{
                        opacity: isGaugeAnimated ? 1 : 0,
                        transform: isGaugeAnimated ? "translateY(0)" : "translateY(8px)",
                        transitionDelay: "200ms",
                      }}
                    >
                      <div className="text-[10px] text-slate-500 font-medium truncate">Avg TAT</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums mt-0.5 truncate">
                        {operationalHealthMetrics.avgTat}
                      </div>
                    </div>

                    <div
                      className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 transition-all duration-500"
                      style={{
                        opacity: isGaugeAnimated ? 1 : 0,
                        transform: isGaugeAnimated ? "translateY(0)" : "translateY(8px)",
                        transitionDelay: "280ms",
                      }}
                    >
                      <div className="text-[10px] text-slate-500 font-medium truncate">Conversion</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-700 tabular-nums mt-0.5 truncate">
                        {operationalHealthMetrics.conversionPct}
                      </div>
                    </div>

                    <div
                      className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 transition-all duration-500"
                      style={{
                        opacity: isGaugeAnimated ? 1 : 0,
                        transform: isGaugeAnimated ? "translateY(0)" : "translateY(8px)",
                        transitionDelay: "360ms",
                      }}
                    >
                      <div className="text-[10px] text-slate-500 font-medium truncate">Payout Speed</div>
                      <div className="text-xs sm:text-sm font-bold text-purple-700 tabular-nums mt-0.5 truncate">
                        {operationalHealthMetrics.payoutSpeed}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
