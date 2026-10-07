"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { dashboardApiService } from "@/services/dashboardApiService";
import { exportCommissionStatementToExcel } from "./dsaCommissionExcelExport";

export default function CommissionSettlementHub() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, EARNED, PENDING, SPOT, STANDARD
  const [sortBy, setSortBy] = useState("NEWEST"); // NEWEST, COMM_DESC, AMOUNT_DESC

  // Estimator Modal state (on-demand instead of cluttering main page)
  const [showEstimatorModal, setShowEstimatorModal] = useState(false);
  const [estimatorAmount, setEstimatorAmount] = useState(2500000); // 25 Lakh default

  // Voucher Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch DSA Dashboard data from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    const startTime = Date.now();
    if (isRefresh) {
      setIsSyncing(true);
    } else {
      setIsInitialLoading(true);
    }
    setFetchError("");
    try {
      const res = await dashboardApiService.getDsaDashboard();
      if (res && res.status && res.data) {
        setDashboardData(res.data);
        setLastSyncTime(new Date());
      } else {
        setFetchError("Unable to retrieve settlement ledger at this time.");
      }
    } catch (err) {
      console.error("Commission Hub fetch error:", err);
      setFetchError("Error connecting to server. Please try again.");
    } finally {
      // Ensure the circular arrows spin smoothly for at least 800ms so user clearly sees the visual feedback
      if (isRefresh) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 800) {
          await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
        }
      }
      setIsInitialLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Copy to clipboard helper
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Currency Formatter (Indian Lakhs/Crores)
  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
    const num = Number(val);
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString("en-IN", {
      maximumFractionDigits: hasDecimals ? 2 : 0,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    })}`;
  };

  // Date Formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Extract Profile & Summary
  const profile = dashboardData?.profile || {};
  const summary = dashboardData?.summary || {};
  const rawCases = dashboardData?.loanCases || [];
  const payments = dashboardData?.payments || [];
  const disbursements = dashboardData?.disbursements || [];

  // Payments & Disbursements lookup maps
  const paymentsMap = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (p && p.case_id) map[p.case_id] = p;
    });
    return map;
  }, [payments]);

  const disbursementsMap = useMemo(() => {
    const map = {};
    disbursements.forEach((d) => {
      if (d && d.case_id) map[d.case_id] = d;
    });
    return map;
  }, [disbursements]);

  // Enriched normalized case list
  const cases = useMemo(() => {
    return rawCases.map((c) => {
      const p = paymentsMap[c.id];
      const d = disbursementsMap[c.id];

      const sanctionAmt = Number(c.sanction_amount || 0);
      const disbAmt = Number(d?.disbursement_amount || c.disbursement_amount || 0);
      const baseAmt = disbAmt > 0 ? disbAmt : sanctionAmt;

      const rawStatus = String(c.status || "").trim().toUpperCase();
      const isAccepted = ["ACCEPTED", "APPROVED", "VERIFIED"].includes(rawStatus);
      const isRejected = ["REJECTED", "CANCELLED", "DECLINED"].includes(rawStatus);
      const isPending = !isAccepted && !isRejected;

      // Plan Option & Rate
      const paymentOption = String(p?.payment_option || c.payment_option || "");
      const isSpot =
        paymentOption.includes("48") ||
        paymentOption.includes("SPOT") ||
        Number(c.payment_percentage) === 0.85;

      const commissionRate =
        p?.payment_percentage !== undefined && p?.payment_percentage !== null
          ? Number(p.payment_percentage)
          : c.commission_rate !== undefined && c.commission_rate !== null
          ? Number(c.commission_rate)
          : isSpot
          ? 0.85
          : 0.90;

      // Commission Amount
      let commissionAmount = 0;
      if (c.commission_amount !== undefined && Number(c.commission_amount) > 0) {
        commissionAmount = Number(c.commission_amount);
      } else if (p?.payment_amount && Number(p.payment_amount) > 0) {
        commissionAmount = Number(p.payment_amount);
      } else if (baseAmt > 0) {
        commissionAmount = Math.round((baseAmt * commissionRate) / 100);
      }

      const planLabel = isSpot ? "Spot 48h (0.85%)" : "Standard 5-Days (0.90%)";

      return {
        ...c,
        sanction_amount: sanctionAmt,
        disbursement_amount: disbAmt,
        base_amount: baseAmt,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        isAccepted,
        isPending,
        isRejected,
        statusCategory: isAccepted ? "ACCEPTED" : isRejected ? "REJECTED" : "PENDING",
        isSpot,
        planLabel,
        voucherId: `VCH-${c.case_number ? c.case_number.replace(/[^a-zA-Z0-9]/g, "") : c.id}`,
      };
    });
  }, [rawCases, paymentsMap, disbursementsMap]);

  // Aggregated totals
  const metrics = useMemo(() => {
    let unlocked = 0;
    let pending = 0;
    let totalSanction = 0;
    let totalDisbursed = 0;

    let spotCount = 0;
    let spotVolume = 0;
    let spotCommission = 0;

    let standardCount = 0;
    let standardVolume = 0;
    let standardCommission = 0;

    cases.forEach((c) => {
      totalSanction += c.sanction_amount;
      totalDisbursed += c.disbursement_amount;

      if (c.isAccepted) {
        unlocked += c.commission_amount;
      } else if (c.isPending) {
        pending += c.commission_amount;
      }

      if (c.isSpot) {
        spotCount += 1;
        spotVolume += c.base_amount;
        if (c.isAccepted) spotCommission += c.commission_amount;
      } else {
        standardCount += 1;
        standardVolume += c.base_amount;
        if (c.isAccepted) standardCommission += c.commission_amount;
      }
    });

    const finalUnlocked = summary.earnedCommission !== undefined ? Number(summary.earnedCommission) : unlocked;
    const finalPending = summary.pendingCommission !== undefined ? Number(summary.pendingCommission) : pending;
    const finalTotal = finalUnlocked + finalPending;

    return {
      unlockedCommission: finalUnlocked,
      pendingCommission: finalPending,
      totalCommission: finalTotal,
      totalSanctionVolume: summary.totalSanctionAmount ? Number(summary.totalSanctionAmount) : totalSanction,
      totalDisbursedVolume: summary.totalDisbursedAmount ? Number(summary.totalDisbursedAmount) : totalDisbursed,
      totalCases: cases.length,
      spot: {
        count: spotCount,
        volume: spotVolume,
        commission: spotCommission,
      },
      standard: {
        count: standardCount,
        volume: standardVolume,
        commission: standardCommission,
      },
    };
  }, [cases, summary]);

  // Filter & Search Logic
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (activeFilter === "EARNED" && !c.isAccepted) return false;
        if (activeFilter === "PENDING" && !c.isPending) return false;
        if (activeFilter === "SPOT" && !c.isSpot) return false;
        if (activeFilter === "STANDARD" && c.isSpot) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = String(c.customer_name || "").toLowerCase();
          const caseNo = String(c.case_number || "").toLowerCase();
          const bank = String(c.bank_name || "").toLowerCase();
          const phone = String(c.mobile_number || "").toLowerCase();
          const amountStr = String(c.sanction_amount || "");

          return (
            name.includes(q) ||
            caseNo.includes(q) ||
            bank.includes(q) ||
            phone.includes(q) ||
            amountStr.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "COMM_DESC") {
          return b.commission_amount - a.commission_amount;
        }
        if (sortBy === "AMOUNT_DESC") {
          return b.base_amount - a.base_amount;
        }
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [cases, activeFilter, searchQuery, sortBy]);

  // Export to Decorated Excel Function (.xlsx)
  const handleExportExcel = async () => {
    if (!filteredCases || filteredCases.length === 0) return;
    setIsExporting(true);
    try {
      await exportCommissionStatementToExcel({
        cases: filteredCases,
        profile,
        metrics,
      });
    } catch (err) {
      console.error("Excel export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Estimator Calculations for the on-demand modal
  const spotEstimatedPayout = Math.round((estimatorAmount * 0.85) / 100);
  const standardEstimatedPayout = Math.round((estimatorAmount * 0.90) / 100);
  const estimatedDifference = standardEstimatedPayout - spotEstimatedPayout;

  return (
    <div className="space-y-6 pb-12 min-h-[calc(100vh-140px)]">
      {/* 1. MINIMAL HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Connected
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              Partner: <strong className="text-slate-700 font-mono">{profile.dsa_code || profile.id || "DSA"}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payments & Commission
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent commission earnings, payout plans, and transaction settlement records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowEstimatorModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#B063FF] bg-purple-50 hover:bg-purple-100/80 border border-purple-200 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Open Commission Estimator"
          >
            <span>⚡ Calculate</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 w-[76px] text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-80 shrink-0"
            title="Refresh latest updates"
          >
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                isSyncing ? "text-[#B063FF]" : "text-slate-400"
              }`}
              style={{
                transformOrigin: "center",
                animation: isSyncing ? "spin 1.25s linear infinite" : "none",
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="truncate">{isSyncing ? "Sync..." : "Sync"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || filteredCases.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
            title="Download formatted Excel statement (.xlsx)"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF ANY */}
      {fetchError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="font-semibold text-amber-900 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. COMPACT, CLEAN 4-CARD TOP KPI ROW (NO GRADIENTS, NO COLOR OVERLAYS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Unlocked Commission */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">Unlocked Commission</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ready for Payout
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.unlockedCommission)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Approved disbursements</span>
              <span className="font-medium text-emerald-600">● Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: In-Review Pipeline */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">In-Review Pipeline</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Pending
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.pendingCommission)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{cases.filter((c) => c.isPending).length} case(s) in review</span>
              <span className="font-medium text-amber-600">⏳ Verification</span>
            </div>
          </div>
        </div>

        {/* Card 3: Spot 48-Hour Plan */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">Spot 48-Hour (0.85%)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-[#B063FF] border border-purple-200">
              ⚡ 48h
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.spot.volume)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{metrics.spot.count} {metrics.spot.count === 1 ? "case" : "cases"}</span>
              <span className="font-semibold text-[#B063FF] font-mono">
                {formatCurrency(metrics.spot.commission)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Standard 5-Days Plan */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">Standard 5-Days (0.90%)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              📈 5 Days
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.standard.volume)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{metrics.standard.count} {metrics.standard.count === 1 ? "case" : "cases"}</span>
              <span className="font-semibold text-sky-600 font-mono">
                {formatCurrency(metrics.standard.commission)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLEAN TRANSACTION STATEMENT LEDGER */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              All ({cases.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("EARNED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "EARNED"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Unlocked ({cases.filter((c) => c.isAccepted).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "PENDING"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              In Review ({cases.filter((c) => c.isPending).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("SPOT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "SPOT"
                  ? "bg-[#B063FF] text-white"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              ⚡ Spot 48h ({cases.filter((c) => c.isSpot).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("STANDARD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === "STANDARD"
                  ? "bg-sky-600 text-white"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              📅 Standard ({cases.filter((c) => !c.isSpot).length})
            </button>
          </div>

          {/* Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case, customer..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-[#B063FF]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] cursor-pointer"
            >
              <option value="NEWEST">Newest First</option>
              <option value="COMM_DESC">Highest Comm.</option>
              <option value="AMOUNT_DESC">Highest Volume</option>
            </select>
          </div>
        </div>

        {/* Clean Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date & Ref</th>
                <th className="py-3 px-4">Customer & Lender</th>
                <th className="py-3 px-4">Base Volume</th>
                <th className="py-3 px-4">Payout Model</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isInitialLoading && !dashboardData ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-[#B063FF] rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5 max-w-sm mx-auto">
                      <span className="text-xl">📄</span>
                      <p className="text-xs font-semibold text-slate-600">No records found</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery ? `No files matching "${searchQuery}".` : "Loan records will appear here as they are processed."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id || c.case_number}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedVoucher(c)}
                  >
                    {/* Date & Ref */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{formatDate(c.created_at)}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[11px] text-slate-400 font-medium">
                          {c.case_number || `#${c.id}`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(c.case_number || String(c.id), c.id);
                          }}
                          className="text-slate-300 hover:text-slate-500"
                          title="Copy Case Number"
                        >
                          {copiedId === c.id ? (
                            <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Customer & Lender */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#B063FF] transition-colors">
                        {c.customer_name || "—"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {c.bank_name || "Direct Partner Bank"}
                      </div>
                    </td>

                    {/* Base Volume */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 font-mono">
                        {formatCurrency(c.base_amount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.disbursement_amount > 0 ? "Disbursed" : "Sanctioned"}
                      </div>
                    </td>

                    {/* Payout Model */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {c.isSpot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          ⚡ Spot (0.85%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                          📅 Standard (0.90%)
                        </span>
                      )}
                    </td>

                    {/* Clean Commission Amount (No repeated formula noise) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(c.commission_amount)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {c.isAccepted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Unlocked
                        </span>
                      ) : c.isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          In Review
                        </span>
                      )}
                    </td>

                    {/* Receipt Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVoucher(c);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>View</span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Minimal Footer */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-700">{filteredCases.length}</strong> of{" "}
            <strong className="text-slate-700">{cases.length}</strong> files
          </div>
          <div className="flex items-center gap-4">
            <span>
              Unlocked: <strong className="text-slate-800 font-mono">{formatCurrency(metrics.unlockedCommission)}</strong>
            </span>
            <span>
              In Review: <strong className="text-slate-800 font-mono">{formatCurrency(metrics.pendingCommission)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. ON-DEMAND COMMISSION ESTIMATOR MODAL */}
      {showEstimatorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowEstimatorModal(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-[#B063FF] border border-purple-200 flex items-center justify-center font-bold text-sm">
                  ⚡
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Commission Estimator</h3>
                  <p className="text-xs text-slate-500">Compare payout amounts for any loan ticket size</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEstimatorModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input & Quick Chips */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Loan Ticket Base</label>
                <div className="flex items-center gap-1">
                  {[500000, 1500000, 2500000, 5000000, 10000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEstimatorAmount(preset)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        estimatorAmount === preset
                          ? "bg-[#B063FF] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {preset >= 10000000 ? `₹${preset / 10000000}Cr` : `₹${preset / 100000}L`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={estimatorAmount}
                  onChange={(e) => setEstimatorAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-base font-bold focus:outline-hidden focus:bg-white focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF]"
                />
              </div>

              <input
                type="range"
                min="100000"
                max="20000000"
                step="100000"
                value={estimatorAmount}
                onChange={(e) => setEstimatorAmount(Number(e.target.value))}
                className="w-full accent-[#B063FF] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Side-by-Side Results */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1 font-semibold text-purple-900">
                  <span>Spot 48h (0.85%)</span>
                  <span className="text-[10px] bg-purple-100 px-1.5 py-0.2 rounded text-purple-800">Fast 48h</span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(spotEstimatedPayout)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {formatCurrency(estimatorAmount)} × 0.85%
                </span>
              </div>

              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1 font-semibold text-sky-900">
                  <span>Standard 5-D (0.90%)</span>
                  <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded text-emerald-800 font-bold">
                    +{formatCurrency(estimatedDifference)}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(standardEstimatedPayout)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {formatCurrency(estimatorAmount)} × 0.90%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEstimatorModal(false)}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OUT DIGITAL SETTLEMENT VOUCHER DRAWER */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
            onClick={() => setSelectedVoucher(null)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B063FF] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Voucher
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">
                    {selectedVoucher.voucherId}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Commission Statement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Voucher Details Body */}
            <div className="p-5 space-y-4 flex-1 text-xs">
              {/* Status Alert */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  selectedVoucher.isAccepted
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : selectedVoucher.isRejected
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {selectedVoucher.isAccepted ? "✅" : selectedVoucher.isRejected ? "❌" : "⏳"}
                  </span>
                  <div>
                    <h4 className="font-bold text-[11px] uppercase tracking-wide">
                      {selectedVoucher.isAccepted
                        ? "Commission Unlocked"
                        : selectedVoucher.isRejected
                        ? "Case Rejected"
                        : "Under Verification"}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {selectedVoucher.isAccepted
                        ? "Ready for transfer to registered account."
                        : "Will unlock upon final bank approval."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <strong className="text-slate-900">{selectedVoucher.customer_name || "—"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Case Number:</span>
                  <strong className="font-mono text-slate-800">{selectedVoucher.case_number || "—"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank:</span>
                  <span className="font-semibold text-slate-800">{selectedVoucher.bank_name || "LentFin Partner Bank"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-700">{formatDate(selectedVoucher.created_at)}</span>
                </div>
              </div>

              {/* Commission Calculation */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sanction Amount:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(selectedVoucher.sanction_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Disbursed Amount:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatCurrency(selectedVoucher.disbursement_amount || selectedVoucher.sanction_amount)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">Payout Model:</span>
                  <span className="font-bold text-slate-800">{selectedVoucher.planLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate Applied:</span>
                  <span className="font-bold text-purple-800 font-mono bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                    {selectedVoucher.commission_rate}%
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Total Commission:</span>
                  <span className="font-extrabold text-[#B063FF] font-mono text-base">
                    {formatCurrency(selectedVoucher.commission_amount)}
                  </span>
                </div>
              </div>

              {/* Settlement Realization & Amount Received Card */}
              <div className={`rounded-xl p-3.5 border shadow-2xs ${
                selectedVoucher.isAccepted
                  ? "bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200"
                  : selectedVoucher.isRejected
                  ? "bg-rose-50/50 border-rose-200"
                  : "bg-amber-50/60 border-amber-200"
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Settlement & Payout Realization
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedVoucher.isAccepted
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : selectedVoucher.isRejected
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {selectedVoucher.isAccepted
                      ? "✓ Paid & Settled"
                      : selectedVoucher.isRejected
                      ? "✕ Case Rejected"
                      : "⏳ Pending Clearance"}
                  </span>
                </div>

                <div className="mt-2.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Payable Commission:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(selectedVoucher.commission_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/95 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${selectedVoucher.isAccepted ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                      <span className="font-bold text-slate-800 text-xs">Amount Received / Credited:</span>
                    </div>
                    <span className={`font-mono font-extrabold text-sm tabular-nums ${
                      selectedVoucher.isAccepted ? "text-emerald-700" : "text-slate-400"
                    }`}>
                      {selectedVoucher.isAccepted ? formatCurrency(selectedVoucher.commission_amount) : "₹0"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <span className={`font-mono font-semibold ${
                      selectedVoucher.isAccepted ? "text-slate-400" : "text-amber-700 font-bold"
                    }`}>
                      {selectedVoucher.isAccepted ? "₹0 (Fully Cleared)" : formatCurrency(selectedVoucher.commission_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Stamp */}
              <div className="flex justify-center py-0.5">
                <div className={`px-4 py-1 rounded-md border-2 border-dashed uppercase font-extrabold tracking-widest text-[11px] transform -rotate-1 ${
                  selectedVoucher.isAccepted
                    ? "border-emerald-500 text-emerald-800 bg-emerald-50/70"
                    : selectedVoucher.isRejected
                    ? "border-rose-400 text-rose-700 bg-rose-50/70"
                    : "border-amber-400 text-amber-800 bg-amber-50/70"
                }`}>
                  {selectedVoucher.isAccepted
                    ? "★ SETTLED & CREDITED ★"
                    : selectedVoucher.isRejected
                    ? "✕ CLAIM REJECTED ✕"
                    : "⏳ SETTLEMENT PENDING ⏳"}
                </div>
              </div>

              {/* Settlement Transfer Particulars */}
              <div className="rounded-lg p-3 bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Credit Destination:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {profile.name || "DSA Registered Account"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Transfer Mode:</span>
                  <span className="font-medium text-slate-700">Direct RTGS / NEFT</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Processing Window:</span>
                  <span className="font-medium text-slate-700">
                    {selectedVoucher.isSpot ? "⚡ 48-Hour Spot Disbursement" : "📅 Standard 5-Day Settlement"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/80">
                  <span>Audit Voucher Ref:</span>
                  <span className="font-mono font-medium text-slate-500">{selectedVoucher.voucherId}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
