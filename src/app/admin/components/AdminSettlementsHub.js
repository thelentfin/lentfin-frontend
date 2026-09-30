"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { dashboardApiService } from "@/services/dashboardApiService";
import { exportAdminSettlementsToExcel } from "./adminSettlementsExcelExport";
import { customerApiService } from "@/services/customerApiService";

export default function AdminSettlementsHub() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PAID, PENDING, SPOT, STANDARD, DIRECT
  const [sortBy, setSortBy] = useState("NEWEST"); // NEWEST, PROFIT_DESC, AMOUNT_DESC, DSA_DESC

  // Modals
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showModelExplainer, setShowModelExplainer] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Quick Corporate Rate Modal state
  const [editingRateCase, setEditingRateCase] = useState(null);
  const [rateModalInput, setRateModalInput] = useState("");
  const [statusModalInput, setStatusModalInput] = useState("PENDING");
  const [receivedAtModalInput, setReceivedAtModalInput] = useState("");
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [rateModalError, setRateModalError] = useState("");

  // Fetch Admin Dashboard data from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    const startTime = Date.now();
    if (isRefresh) {
      setIsSyncing(true);
    } else {
      setIsInitialLoading(true);
    }
    setFetchError("");

    try {
      const res = await dashboardApiService.getAdminDashboard();
      if (res && res.status && res.data) {
        setDashboardData(res.data);
        setLastSyncTime(new Date());
      } else {
        setFetchError("Unable to retrieve corporate settlement ledger at this time.");
      }
    } catch (err) {
      console.error("Admin Settlements Hub fetch error:", err);
      setFetchError("Error connecting to server. Please try again.");
    } finally {
      // Smooth minimum spin duration of 800ms
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

  // Copy helper
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Currency Formatter
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

  // Raw data from dashboard
  const rawCases = dashboardData?.loanCases || [];
  const payments = dashboardData?.payments || [];
  const disbursements = dashboardData?.disbursements || [];

  // Lookup maps for payments and disbursements
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

  // Normalization and Enriching Cases with 3-Way Corporate Spread
  const cases = useMemo(() => {
    return rawCases.map((c) => {
      const p = paymentsMap[c.id];
      const d = disbursementsMap[c.id];

      const sanctionAmt = Number(c.sanction_amount || 0);
      const disbAmt = Number(d?.disbursement_amount || c.disbursement_amount || 0);
      const baseAmount = disbAmt > 0 ? disbAmt : sanctionAmt;

      const rawStatus = String(c.status || "").trim().toUpperCase();
      const isAccepted = ["ACCEPTED", "APPROVED", "VERIFIED"].includes(rawStatus);
      const isRejected = ["REJECTED", "CANCELLED", "DECLINED"].includes(rawStatus);
      const isPending = !isAccepted && !isRejected;

      // DSA Partner Attribution (all cases originate via DSA)
      const dsaPartnerName = (c.dsa_name || "").trim() || `DSA Partner #${c.dsa_id || "101"}`;

      // Corporate Company Attribution
      const corporateCompanyName = c.company_name || p?.company_name || "Corporate DSA";

      // Plan Option & DSA Rate
      const paymentOption = String(p?.payment_option || c.payment_option || "");
      const isSpot =
        paymentOption.includes("48") ||
        paymentOption.includes("SPOT") ||
        Number(c.payment_percentage) === 0.85;

      const dsaCommissionRate =
        p?.payment_percentage !== undefined && p?.payment_percentage !== null
          ? Number(p.payment_percentage)
          : c.commission_rate !== undefined && c.commission_rate !== null
          ? Number(c.commission_rate)
          : isSpot
          ? 0.85
          : 0.90;

      // DSA Commission Amount
      let dsaCommissionAmount = 0;
      if (c.commission_amount !== undefined && Number(c.commission_amount) > 0) {
        dsaCommissionAmount = Number(c.commission_amount);
      } else if (p?.payment_amount && Number(p.payment_amount) > 0) {
        dsaCommissionAmount = Number(p.payment_amount);
      } else if (baseAmount > 0) {
        dsaCommissionAmount = Math.round((baseAmount * dsaCommissionRate) / 100);
      }

      // Dynamic Corporate Rate (Dynamic/manual per case from Corporate DSA)
      const hasCorporateRate = p?.corporate_rate !== null && p?.corporate_rate !== undefined && p?.corporate_rate !== "";
      const corporateRate = hasCorporateRate ? Number(p.corporate_rate) : null;

      // Corporate Inflow Amount
      let corporateInflowAmount = 0;
      if (p?.corporate_amount !== null && p?.corporate_amount !== undefined && Number(p.corporate_amount) > 0) {
        corporateInflowAmount = Number(p.corporate_amount);
      } else if (corporateRate !== null && baseAmount > 0) {
        corporateInflowAmount = Math.round((baseAmount * corporateRate) / 100);
      }

      // LentFin Admin Net Profit Spread (Corporate Inflow - DSA Outflow)
      let netProfitSpread = 0;
      let netProfitRate = 0;
      if (corporateRate !== null) {
        netProfitSpread = Math.max(0, corporateInflowAmount - dsaCommissionAmount);
        netProfitRate = Math.max(0, corporateRate - dsaCommissionRate);
      }

      // Corporate Settlement Status
      const corporatePaymentStatus = p?.corporate_payment_status || "PENDING";
      const corporateReceivedAt = p?.corporate_received_at || null;

      return {
        ...c,
        corporateCompanyName,
        corporateRate,
        corporateInflowAmount,
        hasCorporateRate,
        corporatePaymentStatus,
        corporateReceivedAt,
        dsa_name: dsaPartnerName,
        baseAmount,
        disbursedAmount: disbAmt,
        sanctionedAmount: sanctionAmt,
        isAccepted,
        isPending,
        isRejected,
        isSpot,
        bankInflowAmount: corporateInflowAmount,
        bankMasterRate: corporateRate,
        dsaCommissionRate,
        dsaCommissionAmount,
        netProfitSpread,
        netProfitRate,
        disbursement_date: d?.disbursement_date || c.disbursement_date || c.created_at,
        disbursement_type: d?.disbursement_type || c.disbursement_type || "Full",
      };
    });
  }, [rawCases, paymentsMap, disbursementsMap]);

  // Executive Metric Aggregations
  const metrics = useMemo(() => {
    let totalVolume = 0;
    let totalBankInflow = 0;
    let totalDsaOutflow = 0;
    let paidDsaOutflow = 0;
    let pendingDsaOutflow = 0;
    let totalAdminProfit = 0;
    let paidAdminProfit = 0;
    let pendingAdminProfit = 0;

    cases.forEach((c) => {
      totalVolume += c.baseAmount;
      totalBankInflow += c.corporateInflowAmount || 0;
      totalDsaOutflow += c.dsaCommissionAmount;
      totalAdminProfit += c.netProfitSpread || 0;

      if (c.isAccepted) {
        paidDsaOutflow += c.dsaCommissionAmount;
      } else {
        pendingDsaOutflow += c.dsaCommissionAmount;
      }

      if (c.corporatePaymentStatus === "RECEIVED") {
        paidAdminProfit += c.netProfitSpread || 0;
      } else {
        pendingAdminProfit += c.netProfitSpread || 0;
      }
    });

    const averageMargin = totalVolume > 0 && totalAdminProfit > 0 ? (totalAdminProfit / totalVolume) * 100 : 0;

    return {
      totalVolume,
      totalBankInflow,
      totalDsaOutflow,
      paidDsaOutflow,
      pendingDsaOutflow,
      totalAdminProfit,
      paidAdminProfit,
      pendingAdminProfit,
      averageMargin,
      totalCasesCount: cases.length,
      paidCasesCount: cases.filter((c) => c.isAccepted).length,
      pendingCasesCount: cases.filter((c) => !c.isAccepted && !c.isRejected).length,
    };
  }, [cases]);

  // Filtering & Sorting
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Tab Filter
      if (activeFilter === "PAID" && !c.isAccepted) return false;
      if (activeFilter === "PENDING" && !c.isPending) return false;
      if (activeFilter === "SPOT" && !c.isSpot) return false;
      if (activeFilter === "STANDARD" && c.isSpot) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCase = String(c.case_number || "").toLowerCase().includes(q);
        const matchesDsa = String(c.dsa_name || "").toLowerCase().includes(q);
        const matchesCust = String(c.customer_name || "").toLowerCase().includes(q);
        const matchesBank = String(c.bank_name || "").toLowerCase().includes(q);
        const matchesLoanAcc = String(c.loan_account_number || c.application_number || "").toLowerCase().includes(q);
        if (!matchesCase && !matchesDsa && !matchesCust && !matchesBank && !matchesLoanAcc) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === "PROFIT_DESC") {
        return b.netProfitSpread - a.netProfitSpread;
      }
      if (sortBy === "AMOUNT_DESC") {
        return b.baseAmount - a.baseAmount;
      }
      if (sortBy === "DSA_DESC") {
        return b.dsaCommissionAmount - a.dsaCommissionAmount;
      }
      return 0;
    });
  }, [cases, activeFilter, searchQuery, sortBy]);

  // Trigger Excel Export
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportAdminSettlementsToExcel({
        cases: filteredCases.length > 0 ? filteredCases : cases,
        metrics,
      });
    } catch (err) {
      console.error("Failed to export Excel statement:", err);
      alert("Error generating Excel file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Settlements & Commission Hub
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#B063FF]/10 text-[#B063FF] border border-[#B063FF]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B063FF] animate-pulse" />
              Corporate Revenue
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconcile Corporate DSA Inflows (Dynamic Rates), DSA Partner Payouts, and Platform Net Spread.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Revenue Model Explainer Trigger */}
          <button
            type="button"
            onClick={() => setShowModelExplainer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 transition-all shadow-2xs cursor-pointer"
            title="View LentFin Revenue Breakdown"
          >
            <svg className="w-4 h-4 text-[#B063FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Revenue Model</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || cases.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
          </button>

          {/* Sync Button (Smooth Spin, Stabilized Width) */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 w-[76px] px-2.5 py-2 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs hover:shadow transition-all disabled:opacity-70 cursor-pointer"
            title="Sync Corporate Ledger"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              style={{
                animation: isSyncing ? "spin 1.25s linear infinite" : "none",
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isSyncing ? "Sync..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* 4 TOP FINANCIAL KPI CARDS (PURE CLEAN WHITE - NO DARK CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Corporate Inflow */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Corporate Inflow
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalBankInflow)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Corporate Inflow</span>
              <span className="font-semibold text-[#B063FF] bg-[#B063FF]/10 px-1.5 py-0.5 rounded">
                Dynamic Rates
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: DSA Commission Outflow */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              DSA Partner Payouts
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalDsaOutflow)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Paid: <span className="font-medium text-emerald-600">{formatCurrency(metrics.paidDsaOutflow)}</span>
              </span>
              <span className="text-slate-500">
                Pending: <span className="font-medium text-amber-600">{formatCurrency(metrics.pendingDsaOutflow)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Net Profit Spread */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Platform Spread
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {formatCurrency(metrics.totalAdminProfit)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">LentFin Net Margin</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                +{metrics.averageMargin.toFixed(2)}% Spread
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Audited Loan Volume */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Portfolio Disbursed
            </span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalVolume)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{cases.length} Registered Cases</span>
              <span className="text-slate-700 font-medium">100% Audited</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK REVENUE FORMULA RIBBON (CLEAN WHITE) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center shrink-0">
            <span className="font-bold text-xs">₹</span>
          </div>
          <p className="text-slate-600">
            <strong className="text-slate-900 font-semibold">Corporate Spread Architecture:</strong>{" "}
            Corporate Company Inflow <span className="font-medium text-[#B063FF]">(Dynamic % e.g. Urban Money)</span> &minus; DSA Partner Commission <span className="font-medium text-amber-700">(0.85% / 0.90%)</span> = LentFin Retained Spread. Corporate rates are recorded dynamically per case by Admin.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px]">
          <span>
            {lastSyncTime ? `Synced: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Live Ledger"}
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setShowModelExplainer(true)}
            className="text-[#B063FF] hover:underline font-medium cursor-pointer"
          >
            How Admin Earns &rarr;
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              placeholder="Search by case #, DSA partner, customer, bank..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] cursor-pointer"
            >
              <option value="NEWEST">Newest First</option>
              <option value="PROFIT_DESC">Highest Profit Spread</option>
              <option value="AMOUNT_DESC">Highest Volume</option>
              <option value="DSA_DESC">Highest DSA Commission</option>
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {[
            { id: "ALL", label: "All Settlements", count: cases.length },
            { id: "PAID", label: "Unlocked / Paid", count: cases.filter((c) => c.isAccepted).length, badgeColor: "bg-emerald-50 text-emerald-700" },
            { id: "PENDING", label: "Pending Review", count: cases.filter((c) => !c.isAccepted && !c.isRejected).length, badgeColor: "bg-amber-50 text-amber-700" },
            { id: "SPOT", label: "Spot 48h (0.85%)", count: cases.filter((c) => c.isSpot).length },
            { id: "STANDARD", label: "Standard 5d (0.90%)", count: cases.filter((c) => !c.isSpot).length },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#B063FF] text-white shadow-2xs font-semibold"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                    isActive
                      ? "bg-white/25 text-white"
                      : tab.badgeColor || "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SETTLEMENT AUDIT TABLE (CLEAN WHITE) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isInitialLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 border-3 border-slate-200 border-t-[#B063FF] rounded-full animate-spin" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Loading Corporate Ledger...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching enriched loan cases & payout records</p>
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-red-600">{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] text-white cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No Settlement Records Found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref & Date</th>
                  <th className="py-3 px-4">Corporate Co.</th>
                  <th className="py-3 px-4">DSA Partner</th>
                  <th className="py-3 px-4">Customer & Lender</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-right">Corporate Inflow</th>
                  <th className="py-3 px-4 text-right">DSA Payout</th>
                  <th className="py-3 px-4 text-right">Net Profit Spread</th>
                  <th className="py-3 px-4 text-center">Settlement Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCases.map((c) => {
                  const isPaid = c.isAccepted;

                  return (
                    <tr
                      key={c.id || c.case_number}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Ref & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 group-hover:text-[#B063FF] transition-colors">
                          {c.case_number || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatDate(c.disbursement_date || c.created_at)}
                        </div>
                      </td>

                      {/* Corporate Company */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#B063FF]/10 text-[#B063FF] border border-[#B063FF]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B063FF]" />
                          {c.corporateCompanyName || "Corporate DSA"}
                        </span>
                      </td>

                      {/* DSA Partner */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{c.dsa_name || "Partner DSA"}</div>
                        <div className="text-[11px] text-slate-500">DSA ID #{c.dsa_id || "—"}</div>
                      </td>

                      {/* Customer & Lender */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{c.customer_name || "—"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">{c.bank_name || "Lender Bank"}</span>
                          {c.loan_account_number && (
                            <>
                              <span>•</span>
                              <span>A/c: {c.loan_account_number}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatCurrency(c.baseAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.disbursement_type || "Disbursed"}
                        </div>
                      </td>

                      {/* Corporate Inflow */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {c.hasCorporateRate ? (
                          <>
                            <div className="font-bold text-[#B063FF]">
                              {formatCurrency(c.corporateInflowAmount)}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRateCase(c);
                                setRateModalInput(String(c.corporateRate));
                                setStatusModalInput(c.corporatePaymentStatus || "PENDING");
                                setReceivedAtModalInput(c.corporateReceivedAt ? String(c.corporateReceivedAt).slice(0, 10) : "");
                                setRateModalError("");
                              }}
                              className="text-[10px] text-[#B063FF]/90 font-medium hover:underline cursor-pointer"
                              title="Click to edit corporate rate"
                            >
                              @{c.corporateRate}% Rate
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRateCase(c);
                              setRateModalInput("");
                              setStatusModalInput("PENDING");
                              setReceivedAtModalInput("");
                              setRateModalError("");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-[#B063FF] border border-[#B063FF]/30 hover:bg-[#B063FF] hover:text-white transition-all cursor-pointer"
                          >
                            <span>+ Set Rate</span>
                          </button>
                        )}
                      </td>

                      {/* DSA Commission Outflow */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-amber-700">
                          {formatCurrency(c.dsaCommissionAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.isSpot ? "⚡ Spot (0.85%)" : "📅 5-Day (0.90%)"}
                        </div>
                      </td>

                      {/* Net Admin Profit Spread */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {c.hasCorporateRate ? (
                          <>
                            <div className="font-bold text-emerald-700">
                              +{formatCurrency(c.netProfitSpread)}
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-600">
                              +{c.netProfitRate.toFixed(2)}% Spread
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Rate Pending</span>
                        )}
                      </td>

                      {/* Settlement Status (Two-Legged) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {/* DSA Leg */}
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              DSA Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              DSA Pending
                            </span>
                          )}

                          {/* Corporate Leg */}
                          {c.corporatePaymentStatus === "RECEIVED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-[#B063FF] border border-[#B063FF]/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#B063FF]" />
                              Corp Inflow Received
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Corp Awaiting
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRateCase(c);
                              setRateModalInput(c.corporateRate !== null && c.corporateRate !== undefined ? String(c.corporateRate) : "");
                              setStatusModalInput(c.corporatePaymentStatus || "PENDING");
                              setReceivedAtModalInput(c.corporateReceivedAt ? String(c.corporateReceivedAt).slice(0, 10) : "");
                              setRateModalError("");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-[#B063FF]/30 bg-purple-50/50 text-[#B063FF] hover:bg-[#B063FF] hover:text-white transition-all cursor-pointer shadow-2xs"
                            title="Edit Corporate Rate & Settlement"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Rate</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/50 hover:bg-[#B063FF]/5 transition-all cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3 h-3 text-slate-400 group-hover:text-[#B063FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Voucher</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SETTLEMENT VOUCHER MODAL (CLEAN WHITE) */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-sm">
                  LF
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Settlement & Revenue Voucher
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ref: {selectedVoucher.case_number || "VOUCHER-LF"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="text-slate-400 hover:text-slate-600 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
              {/* Summary Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Date</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatDate(selectedVoucher.disbursement_date || selectedVoucher.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Lender</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedVoucher.bank_name || "Partner Bank"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">DSA Partner</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedVoucher.dsa_name || "Partner DSA"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Status</span>
                  <p className={`font-semibold mt-0.5 ${selectedVoucher.isAccepted ? "text-emerald-700" : "text-amber-700"}`}>
                    {selectedVoucher.isAccepted ? "PAID" : "PENDING"}
                  </p>
                </div>
              </div>

              {/* Loan Details Grid */}
              <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Loan Particulars
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Customer Name:</span>
                    <p className="font-semibold text-slate-900">{selectedVoucher.customer_name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Customer Mobile:</span>
                    <p className="font-semibold text-slate-900">{selectedVoucher.mobile_number || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Loan Account #:</span>
                    <p className="font-semibold text-slate-900">{selectedVoucher.loan_account_number || selectedVoucher.application_number || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Disbursed Volume:</span>
                    <p className="font-bold text-slate-900 text-sm">{formatCurrency(selectedVoucher.baseAmount)}</p>
                  </div>
                </div>
              </div>

              {/* 3-Way Reconciled Financial Spread */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    3-Way Revenue Reconciliation
                  </h4>
                  <span className="text-[10px] font-semibold text-[#B063FF] bg-[#B063FF]/10 px-2 py-0.5 rounded">
                    LentFin Accounting
                  </span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">1. Corporate Company Inflow</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedVoucher.hasCorporateRate
                          ? `Corporate Payout (@ ${selectedVoucher.corporateRate}% from ${selectedVoucher.corporateCompanyName || "Corporate DSA"})`
                          : `Corporate Rate Pending for ${selectedVoucher.corporateCompanyName || "Corporate DSA"}`}
                      </p>
                    </div>
                    <span className="font-bold text-[#B063FF] text-sm">
                      +{formatCurrency(selectedVoucher.corporateInflowAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="font-medium text-slate-800">2. DSA Partner Commission Outflow</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedVoucher.isSpot ? "Spot 48h Plan (0.85%)" : "Standard Plan (0.90%)"} to {selectedVoucher.dsa_name || "Partner DSA"}
                      </p>
                    </div>
                    <span className="font-bold text-amber-700 text-sm">
                      -{formatCurrency(selectedVoucher.dsaCommissionAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 bg-emerald-50/50 -mx-4 -mb-4 p-4 mt-2">
                    <div>
                      <span className="font-bold text-emerald-900 text-xs uppercase tracking-wide">
                        LentFin Platform Net Retained Spread
                      </span>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Net Profit Margin: +{selectedVoucher.netProfitRate.toFixed(2)}% on volume
                      </p>
                    </div>
                    <span className="font-bold text-emerald-700 text-base">
                      +{formatCurrency(selectedVoucher.netProfitSpread)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Sign-off Note */}
              <p className="text-[11px] text-slate-400 text-center italic">
                This document serves as an internal corporate audit voucher of LentFin Financial Services.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(selectedVoucher.case_number, "modal-copy")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
              >
                <span>{copiedId === "modal-copy" ? "Copied Ref!" : "Copy Ref #"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE MODEL EXPLAINER MODAL (LATEST METHOD - CLEAN WHITE) */}
      {showModelExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl sm:max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-sm shadow-2xs">
                  LF
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    LentFin Revenue Architecture & How Admin Earns
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Latest Multi-Tier Flow: Lending Bank &rarr; Corporate DSA Partner &rarr; LentFin Admin &rarr; Sub-DSA Partner
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModelExplainer(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto custom-scrollbar">
              {/* Introduction Note */}
              <p className="text-slate-600 leading-relaxed">
                LentFin operates on an <strong className="text-slate-900 font-semibold">arbitrage spread & early payout model</strong> between <strong className="text-slate-900 font-semibold">Corporate DSA Aggregators</strong> (e.g. Urban Money, Endurance, Finwizz) and independent <strong className="text-slate-900 font-semibold">Sub-DSA Partners</strong>. There is <em>no direct payment relationship</em> between lending banks and Admin or Sub-DSAs.
              </p>

              {/* 4-STAGE INTERACTIVE FLOW DIAGRAM */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  1. The 4-Tier Distribution & Payout Flow
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Step 1: Bank */}
                  <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>🏛️</span> 1. Bank
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                          Lender
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Disburses loan volume directly to customer and pays B2B commission to Corporate DSA partner.
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      Zero direct payout to Admin / DSA
                    </div>
                  </div>

                  {/* Step 2: Corporate DSA */}
                  <div className="p-3 rounded-xl border border-[#B063FF]/30 bg-[#B063FF]/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>🏢</span> 2. Corporate
                        </span>
                        <span className="text-[10px] font-semibold text-[#B063FF] bg-[#B063FF]/15 px-1.5 py-0.5 rounded">
                          Urban / Endurance
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Receives bank payout. Reconciles and pays LentFin on agreed dynamic rates (15&ndash;45 day cycle).
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#B063FF]/20 text-[10px] font-medium text-[#B063FF]">
                      Manual Dynamic Rate %
                    </div>
                  </div>

                  {/* Step 3: LentFin Admin */}
                  <div className="p-3 rounded-xl border border-emerald-300/80 bg-emerald-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>⚡</span> 3. LentFin
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          Gateway
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-normal">
                        Funds early Sub-DSA payouts from working capital, captures positive net profit spread upon corporate settlement.
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-200 text-[10px] font-bold text-emerald-700">
                      Retains Net Margin Spread
                    </div>
                  </div>

                  {/* Step 4: Sub-DSA Partner */}
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>👤</span> 4. Sub-DSA
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Connector
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Receives guaranteed early commission: <strong>0.85%</strong> (Spot 48h) or <strong>0.90%</strong> (Standard 5-Days).
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200 text-[10px] font-semibold text-amber-700">
                      Early Payout (No waiting)
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE EARNING FORMULA */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>🧮</span> How Admin Earns (Net Profit Formula)
                  </h4>
                  <span className="text-[10px] font-semibold text-[#B063FF] bg-[#B063FF]/10 px-2 py-0.5 rounded">
                    Case-by-Case Spread
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-emerald-700">Admin Net Profit</span>
                    <span>=</span>
                    <span className="text-[#B063FF] font-semibold">Corporate Inflow (Dynamic Manual Rate)</span>
                    <span>&minus;</span>
                    <span className="text-amber-700 font-semibold">Sub-DSA Early Payout (0.85% or 0.90%)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-sans">
                    Admin Net Margin % = Dynamic Corporate Rate % &minus; Sub-DSA Commission Rate %
                  </div>
                </div>
              </div>

              {/* SIDE-BY-SIDE LIVE CASE EXAMPLES */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  2. Concrete Case Breakdown Examples (₹50 Lakh Disbursed Loan)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Example A: Urban Money (Spot 48h) */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        Case A: Urban Money (Spot 48h Plan)
                      </span>
                      <span className="text-[10px] font-semibold text-[#B063FF] bg-[#B063FF]/10 px-1.5 py-0.5 rounded">
                        Urban Money
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Disbursed Loan Volume:</span>
                        <strong className="text-slate-900">₹50,00,000</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Corporate Inflow (Manual @ 0.95%):</span>
                        <span className="font-semibold text-[#B063FF]">+₹47,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sub-DSA Early Payout (Spot 48h @ 0.85%):</span>
                        <span className="font-semibold text-amber-700">&minus;₹42,500</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-emerald-700">
                        <span>Admin Net Spread:</span>
                        <span>+₹5,000 (+0.10% Margin)</span>
                      </div>
                    </div>
                  </div>

                  {/* Example B: Endurance / High Rate (Standard 5-Days) */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        Case B: Endurance (Standard 5-Days Plan)
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Endurance
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Disbursed Loan Volume:</span>
                        <strong className="text-slate-900">₹50,00,000</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Corporate Inflow (Manual @ 1.15%):</span>
                        <span className="font-semibold text-[#B063FF]">+₹57,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sub-DSA Payout (Standard 5d @ 0.90%):</span>
                        <span className="font-semibold text-amber-700">&minus;₹45,000</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-emerald-700">
                        <span>Admin Net Spread:</span>
                        <span>+₹12,500 (+0.25% Margin)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 CORE PILLARS OF THE LATEST METHOD */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  3. Key Operating Principles of the Latest Method
                </h4>

                {/* Pillar 1 */}
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">
                      100% Dynamic Manual Corporate Rates
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Rates are not fixed for any company (including Urban Money). Corporate payouts vary by lender, product, and volume tier. Admin records the exact agreed corporate rate manually per case in the Customer Application Drawer or Settlements Hub.
                    </p>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">
                      Sub-DSA Early Payout Advantage (LentFin&apos;s Competitive Moat)
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Sub-DSAs do not have to wait 30&ndash;45 days for Corporate reconciliation. LentFin guarantees prompt commission release (within 48 hours for Spot @ 0.85% or 5 days for Standard @ 0.90%) from working capital. This instant liquidity motivates DSAs to route all loan files through LentFin.
                    </p>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">
                      Two-Legged Settlement Reconciliation
                    </span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Each case tracks two distinct financial statuses: <strong className="text-slate-700 font-medium">Leg 1 (Sub-DSA Payout)</strong> is marked <span className="text-emerald-700 font-semibold">PAID</span> once LentFin transfers early funds; <strong className="text-slate-700 font-medium">Leg 2 (Corporate Settlement)</strong> is marked <span className="text-[#B063FF] font-semibold">RECEIVED</span> (with reconciliation date) once the Corporate DSA company settles the batch with LentFin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 italic">
                Corporate rates &amp; net spreads are strictly confidential to Admin and never visible to Sub-DSAs.
              </span>
              <button
                type="button"
                onClick={() => setShowModelExplainer(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white cursor-pointer shadow-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CORPORATE RATE & SETTLEMENT MODAL */}
      {editingRateCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-xs">
                  ₹%
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Set Corporate Rate & Settlement
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingRateCase.case_number} • {editingRateCase.corporateCompanyName || "Corporate DSA"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRateCase(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Case Summary Pill */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Customer:</span>
                  <span className="font-semibold text-slate-900">{editingRateCase.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Disbursed Volume:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(editingRateCase.baseAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">DSA Payout:</span>
                  <span className="font-semibold text-amber-700">
                    {formatCurrency(editingRateCase.dsaCommissionAmount)} ({editingRateCase.dsaCommissionRate}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Corporate Co.:</span>
                  <span className="font-semibold text-[#B063FF]">{editingRateCase.corporateCompanyName}</span>
                </div>
              </div>

              {/* Rate Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corporate Inflow Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={rateModalInput}
                    onChange={(e) => setRateModalInput(e.target.value)}
                    placeholder="e.g. 1.25"
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Manual dynamic rate offered/reconciled by {editingRateCase.corporateCompanyName} for this loan
                </p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corporate Settlement Status
                </label>
                <select
                  value={statusModalInput}
                  onChange={(e) => setStatusModalInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] cursor-pointer"
                >
                  <option value="PENDING">Pending Reconciliation (Awaiting Inflow)</option>
                  <option value="RECEIVED">Received from Corporate (Reconciled)</option>
                </select>
              </div>

              {/* Received Date (if received) */}
              {statusModalInput === "RECEIVED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={receivedAtModalInput}
                    onChange={(e) => setReceivedAtModalInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
                  />
                </div>
              )}

              {/* Live Preview Box */}
              {Number(rateModalInput) > 0 && (
                <div className="bg-purple-50/40 rounded-xl p-3 border border-[#B063FF]/30 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Corporate Inflow ({rateModalInput}%):</span>
                    <span className="font-bold text-[#B063FF]">
                      {formatCurrency((editingRateCase.baseAmount * Number(rateModalInput)) / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>DSA Outflow ({editingRateCase.dsaCommissionRate}%):</span>
                    <span className="font-bold text-amber-700">
                      -{formatCurrency(editingRateCase.dsaCommissionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#B063FF]/20 font-bold text-emerald-800">
                    <span>LentFin Platform Net Margin:</span>
                    <span>
                      +{formatCurrency(Math.max(0, ((editingRateCase.baseAmount * Number(rateModalInput)) / 100) - editingRateCase.dsaCommissionAmount))}
                      {" "}
                      (+{(Number(rateModalInput) - Number(editingRateCase.dsaCommissionRate)).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}

              {rateModalError && (
                <p className="text-xs text-rose-600 font-medium">{rateModalError}</p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingRateCase(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsSavingRate(true);
                  setRateModalError("");
                  try {
                    const res = await customerApiService.updateCorporateRate(editingRateCase.id, {
                      corporate_rate: rateModalInput === "" ? null : Number(rateModalInput),
                      corporate_payment_status: statusModalInput,
                      corporate_received_at: statusModalInput === "RECEIVED" ? (receivedAtModalInput || new Date().toISOString().slice(0, 10)) : null,
                    });

                    if (res && res.status) {
                      setEditingRateCase(null);
                      await fetchData(true);
                    } else {
                      setRateModalError(res?.message || "Failed to update corporate rate.");
                    }
                  } catch (err) {
                    setRateModalError(err.message || "Network error updating rate.");
                  } finally {
                    setIsSavingRate(false);
                  }
                }}
                disabled={isSavingRate}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingRate ? "Saving..." : "Save Rate & Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
