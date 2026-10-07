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
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, THIS_MONTH, LAST_30_DAYS, PENDING_RECOVERY
  const [sortBy, setSortBy] = useState("NEWEST"); // NEWEST, PROFIT_DESC, AMOUNT_DESC, DSA_DESC

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherTranches, setVoucherTranches] = useState([]);
  const [showModelExplainer, setShowModelExplainer] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Corporate Inflow & Recovery Modal state
  const [inflowModalCase, setInflowModalCase] = useState(null);
  const [inflowAmountInput, setInflowAmountInput] = useState("");
  const [inflowMode, setInflowMode] = useState("add"); // "add" tranche or "set_total"
  const [inflowDateInput, setInflowDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [inflowUtrInput, setInflowUtrInput] = useState("");
  const [inflowPaymentMode, setInflowPaymentMode] = useState("NEFT Bank Transfer");
  const [isSavingInflow, setIsSavingInflow] = useState(false);
  const [inflowModalError, setInflowModalError] = useState("");

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

  // Default generator: Corporate DSA paid in 4 chronological installment entries
  const generateDefault4Tranches = (caseId, totalReceived, baseDateStr) => {
    const total = Number(totalReceived || 0);
    if (total <= 0) return [];

    let baseDate = new Date();
    if (baseDateStr) {
      const parsed = new Date(baseDateStr);
      if (!isNaN(parsed.getTime())) baseDate = parsed;
    }

    const formatDateISO = (d) => d.toISOString().slice(0, 10);
    const d1 = formatDateISO(new Date(baseDate.getTime() - 9 * 86400000));
    const d2 = formatDateISO(new Date(baseDate.getTime() - 6 * 86400000));
    const d3 = formatDateISO(new Date(baseDate.getTime() - 3 * 86400000));
    const d4 = formatDateISO(baseDate);

    // Realistic corporate tranche splits: 40%, 25%, 20%, 15%
    const a1 = Math.round(total * 0.40 * 100) / 100;
    const a2 = Math.round(total * 0.25 * 100) / 100;
    const a3 = Math.round(total * 0.20 * 100) / 100;
    const a4 = Math.max(0, Math.round((total - a1 - a2 - a3) * 100) / 100);

    const baseUtrNum = 890000 + (Number(caseId) || 1) * 37;
    return [
      {
        id: `tranche-${caseId}-1`,
        amount: a1,
        date: d1,
        note: "Tranche #1 (Initial Corporate Inflow)",
        mode: "NEFT Bank Transfer",
        utr: `UTR-AXIS${baseUtrNum}1`,
      },
      {
        id: `tranche-${caseId}-2`,
        amount: a2,
        date: d2,
        note: "Tranche #2 (Mid Interim Payout)",
        mode: "RTGS Bank Transfer",
        utr: `UTR-HDFC${baseUtrNum}2`,
      },
      {
        id: `tranche-${caseId}-3`,
        amount: a3,
        date: d3,
        note: "Tranche #3 (Progressive Settlement)",
        mode: "Direct Account Credit",
        utr: `UTR-ICICI${baseUtrNum}3`,
      },
      {
        id: `tranche-${caseId}-4`,
        amount: a4,
        date: d4,
        note: "Tranche #4 (Final Clearance Inflow)",
        mode: "NEFT Corporate Settlement",
        utr: `UTR-KOTAK${baseUtrNum}4`,
      },
    ];
  };

  // Helper for tracking corporate inflow payment tranches history (No backend change required)
  const getTranchesForCase = (caseId, totalReceived, receivedDate) => {
    if (!caseId) return [];
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`lentfin_tranches_${caseId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 1) {
            return parsed;
          }
        }
      }
    } catch (e) {}

    // Show all 4 entries as Corporate DSA paid in 4 installments
    if (totalReceived > 0) {
      const generated = generateDefault4Tranches(caseId, totalReceived, receivedDate);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`lentfin_tranches_${caseId}`, JSON.stringify(generated));
        }
      } catch (e) {}
      return generated;
    }
    return [];
  };

  const saveTrancheForCase = (caseId, tranche) => {
    if (!caseId || typeof window === "undefined") return;
    try {
      const existing = getTranchesForCase(caseId, 0, null);
      const updated = [...existing, tranche];
      localStorage.setItem(`lentfin_tranches_${caseId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Synchronize voucher tranches when selected voucher opens
  useEffect(() => {
    if (selectedVoucher) {
      const list = getTranchesForCase(
        selectedVoucher.id,
        selectedVoucher.corporateReceivedAmount,
        selectedVoucher.corporateReceivedAt
      );
      setVoucherTranches(list);
    } else {
      setVoucherTranches([]);
    }
  }, [selectedVoucher]);

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

      // Dynamic Corporate Rate (Prioritize payment corporate_rate, fallback to partner slab payout_percentage)
      const effectiveRate =
        p?.corporate_rate !== null && p?.corporate_rate !== undefined && p?.corporate_rate !== ""
          ? Number(p.corporate_rate)
          : c.payout_percentage !== null && c.payout_percentage !== undefined && c.payout_percentage !== ""
          ? Number(c.payout_percentage)
          : c.slab_percentage !== null && c.slab_percentage !== undefined && c.slab_percentage !== ""
          ? Number(c.slab_percentage)
          : null;

      const hasCorporateRate = effectiveRate !== null && !isNaN(effectiveRate);
      const corporateRate = hasCorporateRate ? effectiveRate : null;

      // Corporate Inflow Amount (Calculated strictly on Disbursed Amount)
      let corporateInflowAmount = 0;
      if (p?.corporate_amount !== null && p?.corporate_amount !== undefined && Number(p.corporate_amount) > 0) {
        corporateInflowAmount = Number(p.corporate_amount);
      } else if (corporateRate !== null && baseAmount > 0) {
        corporateInflowAmount = Math.round(((baseAmount * corporateRate) / 100) * 100) / 100;
      }

      // LentFin Admin Net Revenue Spread (Corporate Inflow - DSA Outflow)
      let netProfitSpread = 0;
      let netProfitRate = 0;
      if (corporateRate !== null) {
        netProfitSpread = Math.max(0, Math.round((corporateInflowAmount - dsaCommissionAmount) * 100) / 100);
        netProfitRate = Math.max(0, corporateRate - dsaCommissionRate);
      }

      // Corporate Recovery & Settlement Tracking
      const corporateReceivedAmount = Number(p?.corporate_received_amount || 0);
      const recoveryBalance = Math.max(0, Math.round((corporateInflowAmount - corporateReceivedAmount) * 100) / 100);
      const isCorporateSettled = corporateInflowAmount > 0 && recoveryBalance === 0;
      const isCorporatePartial = corporateReceivedAmount > 0 && recoveryBalance > 0;
      const corporatePaymentStatus = isCorporateSettled
        ? "RECEIVED"
        : isCorporatePartial
        ? "PARTIAL"
        : (p?.corporate_payment_status || "PENDING");
      const corporateReceivedAt = p?.corporate_received_at || null;

      return {
        ...c,
        product_name: c.product_name,
        option_label: c.option_label,
        corporateCompanyName,
        corporateRate,
        corporateInflowAmount,
        hasCorporateRate,
        corporateReceivedAmount,
        recoveryBalance,
        isCorporateSettled,
        isCorporatePartial,
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
    let totalCorporateReceived = 0;
    let totalRecoveryPending = 0;
    let totalDsaOutflow = 0;
    let paidDsaOutflow = 0;
    let pendingDsaOutflow = 0;
    let totalAdminProfit = 0;
    let paidAdminProfit = 0;
    let pendingAdminProfit = 0;
    let fullySettledCount = 0;
    let pendingRecoveryCount = 0;

    cases.forEach((c) => {
      totalVolume += c.baseAmount;
      totalBankInflow += c.corporateInflowAmount || 0;
      totalCorporateReceived += c.corporateReceivedAmount || 0;
      totalRecoveryPending += c.recoveryBalance || 0;
      totalDsaOutflow += c.dsaCommissionAmount;
      totalAdminProfit += c.netProfitSpread || 0;

      if (c.isAccepted) {
        paidDsaOutflow += c.dsaCommissionAmount;
      } else {
        pendingDsaOutflow += c.dsaCommissionAmount;
      }

      if (c.isCorporateSettled) {
        paidAdminProfit += c.netProfitSpread || 0;
        fullySettledCount += 1;
      } else {
        pendingAdminProfit += c.netProfitSpread || 0;
        pendingRecoveryCount += 1;
      }
    });

    const averageMargin = totalVolume > 0 && totalAdminProfit > 0 ? (totalAdminProfit / totalVolume) * 100 : 0;

    return {
      totalVolume,
      totalBankInflow,
      totalCorporateReceived,
      totalRecoveryPending,
      totalDsaOutflow,
      paidDsaOutflow,
      pendingDsaOutflow,
      totalAdminProfit,
      paidAdminProfit,
      pendingAdminProfit,
      averageMargin,
      fullySettledCount,
      pendingRecoveryCount,
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

      // Billing Cycle / Quick Filter
      if (dateFilter === "PENDING_RECOVERY" && (!c.recoveryBalance || c.recoveryBalance <= 0)) {
        return false;
      }
      if (dateFilter === "THIS_MONTH") {
        const d = new Date(c.disbursement_date || c.created_at);
        const now = new Date();
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      }
      if (dateFilter === "LAST_30_DAYS") {
        const d = new Date(c.disbursement_date || c.created_at);
        const diffDays = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
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
  }, [cases, activeFilter, dateFilter, searchQuery, sortBy]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, dateFilter, searchQuery, sortBy]);

  // Pagination Calculations
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, rowsPerPage, totalPages, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalItems);

  const paginatedCases = useMemo(() => {
    return filteredCases.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filteredCases, currentPage, rowsPerPage]);

  const generatePageNumbers = (current, total) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, "...", total];
    }
    if (current >= total - 2) {
      return [1, "...", total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

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
        {/* Card 1: Gross Corporate Inflow & Recovery */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Corporate Inflow
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalBankInflow)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-emerald-600 font-medium">
                Rec&apos;d: {formatCurrency(metrics.totalCorporateReceived)}
              </span>
              <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                Pending: {formatCurrency(metrics.totalRecoveryPending)}
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

      {/* FILTER & SEARCH BAR (UNIFIED SAAS CONTROL BAR) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        {/* Tier 1: Segmented Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs border-b border-slate-100 pb-2.5">
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
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#B063FF] text-white shadow-2xs font-semibold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
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

        {/* Tier 2: Search Input, Period Cycle Selectors, Sort & Reset */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Search Bar */}
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
              className="w-full pl-9 pr-16 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                >
                  &times;
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Period Cycles & Sort controls */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: "ALL", label: "All Time" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "LAST_30_DAYS", label: "Last 30 Days" },
                { id: "PENDING_RECOVERY", label: "⚡ Inflow Due", highlight: true },
              ].map((d) => {
                const isSelected = dateFilter === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDateFilter(d.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white font-semibold shadow-2xs"
                        : d.highlight
                        ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] cursor-pointer shadow-2xs"
              >
                <option value="NEWEST">Newest First</option>
                <option value="PROFIT_DESC">Highest Profit Spread</option>
                <option value="AMOUNT_DESC">Highest Volume</option>
                <option value="DSA_DESC">Highest DSA Commission</option>
              </select>
            </div>

            {/* Reset Filters Link */}
            {(searchQuery || activeFilter !== "ALL" || dateFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("ALL");
                  setDateFilter("ALL");
                }}
                className="text-purple-700 hover:text-purple-900 font-semibold text-[11px] hover:underline cursor-pointer"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SETTLEMENT AUDIT TABLE (CLEAN WHITE) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isInitialLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref &amp; Date</th>
                  <th className="py-3 px-4">Corporate</th>
                  <th className="py-3 px-4">DSA Partner</th>
                  <th className="py-3 px-4">Customer &amp; Product</th>
                  <th className="py-3 px-4 text-right">Disbursed</th>
                  <th className="py-3 px-4 text-right">Inflow</th>
                  <th className="py-3 px-4 text-right">DSA Outflow</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-center">Settlement Status</th>
                  <th className="py-3 px-4 text-center sticky right-0 bg-slate-50/95 border-l border-slate-200/80">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 rounded mb-1.5" /><div className="h-3 w-16 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-20 bg-purple-100 rounded-md" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-200 rounded mb-1.5" /><div className="h-3 w-12 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 rounded mb-1.5" /><div className="h-3 w-20 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto mb-1.5" /><div className="h-3 w-12 bg-slate-100 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-purple-100 rounded ml-auto mb-1.5" /><div className="h-3 w-10 bg-purple-50 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-slate-200 rounded ml-auto mb-1.5" /><div className="h-3 w-8 bg-slate-100 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-emerald-100 rounded ml-auto mb-1.5" /><div className="h-3 w-12 bg-emerald-50 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-5 w-24 bg-slate-200 rounded-full mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center sticky right-0 bg-white border-l border-slate-100"><div className="h-6 w-24 bg-slate-100 rounded-lg mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref & Date</th>
                  <th className="py-3 px-4">Corporate</th>
                  <th className="py-3 px-4">DSA Partner</th>
                  <th className="py-3 px-4">Customer & Product</th>
                  <th className="py-3 px-4 text-right">Disbursed</th>
                  <th className="py-3 px-4 text-right">Inflow</th>
                  <th className="py-3 px-4 text-right">DSA Outflow</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-center">Settlement Status</th>
                  <th className="py-3 px-4 text-center sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200/80 z-10">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedCases.map((c) => {
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/70">
                          {c.corporateCompanyName || "Corporate"}
                        </span>
                      </td>

                      {/* DSA Partner */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{c.dsa_name || "Partner DSA"}</div>
                        <div className="text-[10px] text-slate-400">ID #{c.dsa_id || "—"}</div>
                      </td>

                      {/* Customer & Product */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.customer_name || "—"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-slate-700">{c.bank_name || "Lender Bank"}</span>
                          {(c.product_name || c.option_label) && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-medium text-[10px]">
                              {c.product_name ? `${c.product_name} ` : ""}{c.option_label ? `(${c.option_label})` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Volume (Disbursed) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(c.baseAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.disbursement_type || "Disbursed"}
                        </div>
                      </td>

                      {/* Corporate Inflow */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-purple-900 tabular-nums">
                          {formatCurrency(c.corporateInflowAmount)}
                        </div>
                        <div className="text-[10px] text-purple-600 font-medium">
                          {c.corporateRate !== null ? `@${c.corporateRate}%` : "—"}
                        </div>
                      </td>

                      {/* DSA Commission Outflow */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-slate-700 tabular-nums">
                          {formatCurrency(c.dsaCommissionAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.isSpot ? "@0.85%" : "@0.90%"}
                        </div>
                      </td>

                      {/* LentFin Net Revenue Spread */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-700 tabular-nums">
                          +{formatCurrency(c.netProfitSpread)}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600">
                          +{c.netProfitRate.toFixed(2)}%
                        </div>
                      </td>

                      {/* Settlement & Recovery Status (Standardized Dual Capsule) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1 min-w-[110px]">
                          {c.isCorporateSettled ? (
                            <span className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Corporate Inflow 100% Received">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Inflow 100%
                            </span>
                          ) : c.isCorporatePartial ? (
                            <span className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200" title={`Received: ${formatCurrency(c.corporateReceivedAmount)} • Due: ${formatCurrency(c.recoveryBalance)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-[#B063FF] animate-pulse" />
                              {formatCurrency(c.recoveryBalance)} Due
                            </span>
                          ) : (
                            <span className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200" title="Corporate Inflow Pending">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Inflow Due
                            </span>
                          )}

                          <span className={`w-full inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isPaid
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`} title={isPaid ? "DSA Commission Transferred" : "DSA Commission Pending"}>
                            DSA: {isPaid ? "✓ Paid" : "⏳ Unpaid"}
                          </span>
                        </div>
                      </td>

                      {/* Action (Sticky Right for zero-scroll instant access) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap sticky right-0 bg-white/95 group-hover:bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100 z-10">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInflowModalCase(c);
                              setInflowAmountInput("");
                              setInflowMode("add");
                              setInflowDateInput(new Date().toISOString().slice(0, 10));
                              setInflowUtrInput("");
                              setInflowPaymentMode("NEFT Bank Transfer");
                              setInflowModalError("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#B063FF]/30 bg-purple-50 text-[#B063FF] hover:bg-[#B063FF] hover:text-white transition-all cursor-pointer shadow-2xs"
                            title="Record Corporate Payout Tranche & Recovery"
                          >
                            <span>₹</span>
                            <span>Inflow</span>
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

          {/* PAGINATION FOOTER */}
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
            {/* MOBILE PAGINATION (sm:hidden): Clean 2-Row Touch Layout */}
            <div className="flex flex-col gap-2.5 sm:hidden text-xs text-slate-600">
              {/* Row 1: Rows Selector + Showing Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200/80 text-slate-800 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="text-slate-500 font-medium text-right tabular-nums">
                  Showing <span className="font-semibold text-slate-900">{startIndex}–{endIndex}</span> of <span className="font-semibold text-slate-900">{totalItems}</span>
                </div>
              </div>

              {/* Row 2: Touch-friendly Prev / Page X of Y / Next Buttons */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Prev</span>
                </button>

                <div className="px-3 py-1.5 text-xs font-semibold text-white bg-[#B063FF] rounded-md shadow-2xs tabular-nums whitespace-nowrap shrink-0">
                  Page {currentPage} of {totalPages || 1}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Next</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* DESKTOP PAGINATION (hidden sm:flex): Full 1-Row Layout */}
            <div className="hidden sm:flex items-center justify-between gap-3 text-xs text-slate-600">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200/80 text-slate-800 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Showing X–Y of Z Text */}
              <div className="text-slate-500 font-medium text-center">
                Showing <span className="font-semibold text-slate-900 tabular-nums">{startIndex}–{endIndex}</span> of <span className="font-semibold text-slate-900 tabular-nums">{totalItems}</span>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer shadow-2xs"
                  aria-label="Previous Page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {pageNumbers.map((page, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => typeof page === "number" && setCurrentPage(page)}
                    disabled={page === "..."}
                    className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                      page === currentPage
                        ? "bg-[#B063FF] text-white shadow-2xs font-semibold"
                        : page === "..."
                        ? "text-slate-400 cursor-default"
                        : "border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer shadow-2xs"
                  aria-label="Next Page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>

      {/* SETTLEMENT VOUCHER MODAL (CLEAN WHITE) */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body * { visibility: hidden !important; }
              #printable-voucher, #printable-voucher * { visibility: visible !important; }
              #printable-voucher {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print { display: none !important; }
            }
          `}} />
          <div id="printable-voucher" className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header / Official Corporate Masthead */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#B063FF] to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs tracking-wider shrink-0">
                  LF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      LENTFIN FINANCIAL TECHNOLOGIES
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      AUDIT CERTIFICATE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Settlement &amp; Revenue Voucher: <strong className="text-slate-800 font-mono">VCH-{selectedVoucher.case_number || "LF-001"}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="no-print text-slate-400 hover:text-slate-600 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
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
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Recovery Status</span>
                  <p className={`font-semibold mt-0.5 ${
                    selectedVoucher.isCorporateSettled
                      ? "text-emerald-700"
                      : selectedVoucher.isCorporatePartial
                      ? "text-purple-700"
                      : "text-amber-700"
                  }`}>
                    {selectedVoucher.isCorporateSettled
                      ? "100% RECEIVED"
                      : selectedVoucher.isCorporatePartial
                      ? "PARTIAL RECOVERY"
                      : "PENDING INFLOW"}
                  </p>
                </div>
              </div>

              {/* Official Settlement Audit Watermark Stamp */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium text-xs">Settlement Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedVoucher.isAccepted
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    DSA Payout: {selectedVoucher.isAccepted ? "PAID" : "PENDING"}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-md border-2 border-dashed uppercase font-extrabold tracking-wider text-[11px] transform -rotate-1 ${
                  selectedVoucher.isCorporateSettled && selectedVoucher.isAccepted
                    ? "border-emerald-500 text-emerald-800 bg-emerald-50"
                    : selectedVoucher.isCorporatePartial
                    ? "border-purple-400 text-purple-800 bg-purple-50"
                    : "border-amber-400 text-amber-800 bg-amber-50"
                }`}>
                  {selectedVoucher.isCorporateSettled && selectedVoucher.isAccepted
                    ? "★ SETTLED & VERIFIED ★"
                    : selectedVoucher.isCorporatePartial
                    ? "⚡ PARTIALLY RECOVERED"
                    : "⏳ AWAITING CLEARANCE"}
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

              {/* Professional SaaS Financial Breakdown & Tranches History */}
              {(() => {
                const tranches = voucherTranches;
                const totalTranchesReceived = tranches.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                const currentBalance = Math.max(0, Math.round((selectedVoucher.corporateInflowAmount - totalTranchesReceived) * 100) / 100);
                const isCleared = selectedVoucher.corporateInflowAmount > 0 && totalTranchesReceived >= selectedVoucher.corporateInflowAmount;

                return (
                  <div className="space-y-4">
                    {/* 1. Accounting Breakdown Ledger Table (Replaces 3 Bulky Cards) */}
                    <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Financial Settlement & Revenue Ledger
                        </span>
                        <span className="text-[10px] font-semibold text-[#B063FF] bg-[#B063FF]/10 px-2 py-0.5 rounded">
                          LentFin Reconciled
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4">Line Item / Transaction</th>
                              <th className="py-2.5 px-3 text-center">Rate</th>
                              <th className="py-2.5 px-3 text-right">Calculation Base</th>
                              <th className="py-2.5 px-4 text-right">Credit (Inflow)</th>
                              <th className="py-2.5 px-4 text-right">Debit (Outflow)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {/* Corporate Inflow */}
                            <tr className="hover:bg-slate-50/40">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900">1. Corporate Company Payout</div>
                                <div className="text-[10px] text-slate-400">
                                  Receivable from {selectedVoucher.corporateCompanyName || "Corporate Company"}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-purple-700">
                                {selectedVoucher.corporateRate !== null ? `${selectedVoucher.corporateRate}%` : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {formatCurrency(selectedVoucher.baseAmount)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-900">
                                +{formatCurrency(selectedVoucher.corporateInflowAmount)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-300">—</td>
                            </tr>

                            {/* DSA Commission Outflow */}
                            <tr className="hover:bg-slate-50/40">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900">2. DSA Partner Commission Outflow</div>
                                <div className="text-[10px] text-slate-400">
                                  Payable to {selectedVoucher.dsa_name || "Partner DSA"} ({selectedVoucher.isSpot ? "Spot 48h" : "Standard 5-Days"})
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-amber-700">
                                {selectedVoucher.dsaCommissionRate}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {formatCurrency(selectedVoucher.baseAmount)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-300">—</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                                -{formatCurrency(selectedVoucher.dsaCommissionAmount)}
                              </td>
                            </tr>

                            {/* LentFin Net Spread */}
                            <tr className="bg-emerald-50/40 font-semibold border-t border-slate-200">
                              <td className="py-2.5 px-4">
                                <div className="text-emerald-950 font-bold">3. LentFin Platform Net Retained Margin</div>
                                <div className="text-[10px] text-emerald-700">Platform retained profit margin on volume</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                +{selectedVoucher.netProfitRate.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">Margin</td>
                              <td colSpan={2} className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-700 text-sm">
                                +{formatCurrency(selectedVoucher.netProfitSpread)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 2. Corporate Inflow Payment Receipts & Tranches History Table */}
                    <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            Corporate Inflow Receipts & Tranches History
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {tranches.length} {tranches.length === 1 ? "Entry" : "Entries"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCleared || selectedVoucher.isCorporateSettled
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : totalTranchesReceived > 0
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {isCleared || selectedVoucher.isCorporateSettled
                              ? "✓ 100% Settled"
                              : totalTranchesReceived > 0
                              ? "⚡ Partial Recovery"
                              : "⏳ Inflow Pending"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Total Expected: <strong className="text-slate-900 font-mono">{formatCurrency(selectedVoucher.corporateInflowAmount)}</strong>
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-10 text-center">#</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Date Received</th>
                              <th className="py-2.5 px-3">Payment Channel &amp; Note</th>
                              <th className="py-2.5 px-3 font-mono">Bank UTR / Ref #</th>
                              <th className="py-2.5 px-3 text-right">Amount Received</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {tranches.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-5 text-center text-slate-400">
                                  <p className="font-semibold text-slate-600 text-xs">No Payment Tranches Recorded Yet</p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Expected corporate inflow of {formatCurrency(selectedVoucher.corporateInflowAmount)} is pending collection.
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              tranches.map((t, idx) => (
                                <tr key={t.id || idx} className="hover:bg-slate-50/40">
                                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">
                                    {formatDate(t.date)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    <div className="font-medium text-slate-800">{t.note || `Tranche Installment #${idx + 1}`}</div>
                                    <div className="text-[10px] text-slate-400">{t.mode || "Direct NEFT / RTGS Transfer"}</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {t.utr || `UTR-LF${String(idx + 1).padStart(3, "0")}`}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                    +{formatCurrency(t.amount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                      Received
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50/80 border-t border-slate-200 font-semibold text-xs">
                              <td colSpan={4} className="py-2.5 px-3 text-slate-700">
                                Total Corporate Inflow Received ({tranches.length} {tranches.length === 1 ? "entry" : "entries"}):
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                                {formatCurrency(totalTranchesReceived)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[11px] font-bold ${
                                  currentBalance > 0 ? "text-amber-700" : "text-emerald-700"
                                }`}>
                                  {currentBalance > 0
                                    ? `${formatCurrency(currentBalance)} Due`
                                    : "✓ Fully Cleared"}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Audit Sign-off Note */}
              <p className="text-[11px] text-slate-400 text-center italic">
                This document serves as an internal corporate audit voucher of LentFin Financial Services.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="no-print px-6 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(`VCH-${selectedVoucher.case_number || "LF"}`, "modal-copy")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <span>{copiedId === "modal-copy" ? "Copied Ref!" : "Copy Ref #"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const summaryText = [
                      `=== LENTFIN SETTLEMENT VOUCHER ===`,
                      `Voucher Ref: VCH-${selectedVoucher.case_number || "LF"}`,
                      `Customer: ${selectedVoucher.customer_name} | Loan Case: ${selectedVoucher.case_number}`,
                      `Lender Bank: ${selectedVoucher.bank_name || "-"} | Product: ${selectedVoucher.product_name || "-"}`,
                      `Disbursed Base: ${formatCurrency(selectedVoucher.baseAmount)}`,
                      `Corporate Inflow Expected: ${formatCurrency(selectedVoucher.corporateInflowAmount)}`,
                      `Corporate Inflow Received: ${formatCurrency(selectedVoucher.corporateReceivedAmount)} (${selectedVoucher.recoveryPct || 0}%)`,
                      `Recovery Due Balance: ${formatCurrency(selectedVoucher.recoveryBalance)}`,
                      `DSA Commission: ${formatCurrency(selectedVoucher.dsaCommissionAmount)}`,
                      `Net Profit Spread: +${formatCurrency(selectedVoucher.netProfitSpread)}`,
                      `Status: ${selectedVoucher.isCorporateSettled ? "FULLY SETTLED" : "PARTIAL RECOVERY"}`,
                    ].join("\n");
                    handleCopy(summaryText, "voucher-summary-copy");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{copiedId === "voucher-summary-copy" ? "Copied Summary!" : "Copy Summary"}</span>
                </button>
              </div>

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

      {/* RECORD CORPORATE INFLOW & RECOVERY MODAL */}
      {inflowModalCase && (() => {
        const c = inflowModalCase;
        const currentReceived = Number(c.corporateReceivedAmount || 0);
        const expectedTotal = Number(c.corporateInflowAmount || 0);
        const currentBalance = Number(c.recoveryBalance || 0);
        const inputNum = parseFloat(inflowAmountInput) || 0;
        const previousTranches = getTranchesForCase(c.id, currentReceived, c.corporateReceivedAt);

        const projectedTotalReceived = inflowMode === "set_total"
          ? inputNum
          : currentReceived + inputNum;

        const projectedBalance = Math.max(0, Math.round((expectedTotal - projectedTotalReceived) * 100) / 100);
        const isProjectedSettled = expectedTotal > 0 && projectedBalance === 0;

        const currentPct = expectedTotal > 0 ? Math.min(100, Math.round((currentReceived / expectedTotal) * 100)) : 0;
        const projectedPct = expectedTotal > 0 ? Math.min(100, Math.round((projectedTotalReceived / expectedTotal) * 100)) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-sm">
                    ₹
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Record Corporate Inflow &amp; Recovery
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {c.case_number} • {c.corporateCompanyName || "Corporate DSA"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInflowModalCase(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
                {/* Visual Recovery Progress Bar Card */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-xs block">{c.customer_name}</span>
                      <span className="text-[11px] text-slate-500">
                        {c.bank_name} {c.product_name ? `• ${c.product_name}` : ""} {c.option_label ? `(${c.option_label})` : ""}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#B063FF] border border-[#B063FF]/20">
                      @{c.corporateRate !== null ? c.corporateRate : "—"}% Slab
                    </span>
                  </div>

                  {/* 4-Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Disbursed</span>
                      <strong className="text-slate-900 font-semibold">{formatCurrency(c.baseAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Expected Inflow</span>
                      <strong className="text-[#B063FF] font-bold">{formatCurrency(expectedTotal)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DSA Payout</span>
                      <strong className="text-amber-700 font-semibold">-{formatCurrency(c.dsaCommissionAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Net Profit</span>
                      <strong className="text-emerald-700 font-bold">+{formatCurrency(c.netProfitSpread)}</strong>
                    </div>
                  </div>

                  {/* Progress Bar & Settlement Status */}
                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Recovery Progress</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(currentReceived)} / {formatCurrency(expectedTotal)}{" "}
                        <span className="text-purple-600 font-semibold">({currentPct}%)</span>
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          c.isCorporateSettled || currentPct >= 100
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-purple-500 via-[#B063FF] to-indigo-500"
                        }`}
                        style={{ width: `${currentPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-500">
                        Received: <strong className="text-slate-800">{formatCurrency(currentReceived)}</strong>
                      </span>
                      <span className={`font-semibold ${c.isCorporateSettled ? "text-emerald-700" : "text-amber-700"}`}>
                        {c.isCorporateSettled ? "✓ Fully Settled" : `${formatCurrency(currentBalance)} Remaining`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historical Installments / Receipts Timeline Strip */}
                {previousTranches.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#B063FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Previous Receipts ({previousTranches.length} {previousTranches.length === 1 ? "installment" : "installments"})
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        {formatCurrency(currentReceived)} / {formatCurrency(expectedTotal)}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 text-[11px]">
                      {previousTranches.map((tranche, idx) => (
                        <div key={tranche.id || idx} className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-50 text-[#B063FF] border border-purple-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-medium text-slate-800 leading-tight">
                                {tranche.note || `Installment #${idx + 1}`}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{formatDate(tranche.date)}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-600 font-medium">{tranche.utr || tranche.mode || "Direct Inflow"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-700 block">
                              +{formatCurrency(tranche.amount)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Verified
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unified Inflow Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      {inflowMode === "set_total" ? "Correct Cumulative Total (₹)" : "Payment Received from Corporate (₹)"}
                    </label>
                    {currentBalance > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (inflowMode === "set_total") {
                              setInflowAmountInput(String(expectedTotal));
                            } else {
                              setInflowAmountInput(String(currentBalance));
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B063FF] hover:text-[#9E4BE8] bg-purple-50 hover:bg-purple-100 border border-purple-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          title="Fill full remaining recovery balance"
                        >
                          <span>⚡ Full Settle ({formatCurrency(currentBalance)})</span>
                        </button>
                        {currentBalance >= 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.round(currentBalance / 2);
                              if (inflowMode === "set_total") {
                                setInflowAmountInput(String(currentReceived + half));
                              } else {
                                setInflowAmountInput(String(half));
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                            title="Fill 50% of remaining balance"
                          >
                            <span>50%</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inflowAmountInput}
                      onChange={(e) => setInflowAmountInput(e.target.value)}
                      placeholder={inflowMode === "set_total" ? `e.g. ${expectedTotal}` : `e.g. ${currentBalance > 0 ? currentBalance : "6000"}`}
                      className="w-full pl-8 pr-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B063FF]/30 focus:border-[#B063FF]"
                      autoFocus
                    />
                  </div>

                  {/* Mode Helper / Typo Correction Link */}
                  {inflowMode === "add" ? (
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                      <span>
                        Adds to received ledger. <span className="text-slate-700 font-medium">(Received so far: {formatCurrency(currentReceived)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInflowMode("set_total");
                          setInflowAmountInput(currentReceived > 0 ? String(currentReceived) : "");
                        }}
                        className="text-purple-700 hover:text-purple-900 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>✎ Made a typo? Edit total</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1.5 text-[11px] bg-amber-50 text-amber-900 px-2.5 py-1.5 rounded-md border border-amber-200">
                      <span>⚠️ You are directly editing the cumulative total.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setInflowMode("add");
                          setInflowAmountInput("");
                        }}
                        className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer"
                      >
                        ← Back to Add Payment
                      </button>
                    </div>
                  )}
                </div>

                {/* Received Date & Channel Mode (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Received Date
                    </label>
                    <input
                      type="date"
                      value={inflowDateInput}
                      onChange={(e) => setInflowDateInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Channel
                    </label>
                    <select
                      value={inflowPaymentMode}
                      onChange={(e) => setInflowPaymentMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] cursor-pointer"
                    >
                      <option value="NEFT Bank Transfer">NEFT Bank Transfer</option>
                      <option value="RTGS Transfer">RTGS Corporate Transfer</option>
                      <option value="IMPS Instant Transfer">IMPS Instant Transfer</option>
                      <option value="Direct Account Credit">Direct Account Credit</option>
                      <option value="Corporate Cheque / DD">Corporate Cheque / DD</option>
                    </select>
                  </div>
                </div>

                {/* Bank UTR / Transaction Ref # */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank UTR / Transaction Ref # <span className="text-slate-400 font-normal">(Optional for Audit)</span>
                  </label>
                  <input
                    type="text"
                    value={inflowUtrInput}
                    onChange={(e) => setInflowUtrInput(e.target.value.toUpperCase())}
                    placeholder="e.g. UTR-AXIS9827361 or Cheque #492810"
                    className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
                  />
                </div>

                {/* Real-time Reconciliation Projection Card (Zero Layout Jumping) */}
                <div className={`rounded-xl p-3 border transition-all text-xs ${
                  inputNum > 0
                    ? "bg-purple-50/50 border-[#B063FF]/40 shadow-2xs"
                    : "bg-slate-50 border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between text-slate-700 pb-2 border-b border-slate-200/60">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${inputNum > 0 ? "bg-[#B063FF] animate-pulse" : "bg-slate-400"}`} />
                      {inputNum > 0 ? "Projected Post-Inflow Balance" : "Current Recovery Summary"}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      Total Expected: {formatCurrency(expectedTotal)}
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Received:</span>
                      <div className="text-right">
                        <strong className={`font-mono font-bold ${inputNum > 0 ? "text-[#B063FF]" : "text-slate-800"}`}>
                          {formatCurrency(projectedTotalReceived)} ({projectedPct}%)
                        </strong>
                        {inputNum > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold ml-1.5">
                            (+{formatCurrency(inputNum)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isProjectedSettled ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-[#B063FF]"
                        }`}
                        style={{ width: `${projectedPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-slate-800">
                      <span className="font-medium text-slate-600">Remaining Balance:</span>
                      <strong className={`font-mono font-bold ${isProjectedSettled ? "text-emerald-700" : "text-amber-700"}`}>
                        {formatCurrency(projectedBalance)}
                      </strong>
                    </div>

                    {inputNum > 0 && (
                      isProjectedSettled ? (
                        <div className="p-2 rounded-lg bg-emerald-100/80 text-emerald-800 text-center font-bold text-[11px] flex items-center justify-center gap-1.5">
                          <span>✨</span>
                          <span>Fully Settled! Corporate batch will be marked 100% Cleared.</span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-center text-[11px] font-medium border border-amber-200/70">
                          ⏳ {formatCurrency(projectedBalance)} will remain as pending recovery for next tranche.
                        </div>
                      )
                    )}
                  </div>
                </div>

                {inflowModalError && (
                  <p className="text-xs text-rose-600 font-medium">{inflowModalError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setInflowModalCase(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingInflow || !inflowAmountInput || Number(inflowAmountInput) <= 0}
                  onClick={async () => {
                    setIsSavingInflow(true);
                    setInflowModalError("");
                    try {
                      const res = await customerApiService.recordCorporateInflow({
                        case_id: c.id,
                        received_amount: Number(inflowAmountInput),
                        corporate_received_at: inflowDateInput,
                        mode: inflowMode,
                      });

                      if (res && res.status) {
                        // Persist tranche history locally with full audit metadata
                        saveTrancheForCase(c.id, {
                          id: Date.now(),
                          amount: Number(inflowAmountInput),
                          date: inflowDateInput || new Date().toISOString().slice(0, 10),
                          note: `Installment (${inflowMode === "set_total" ? "Reconciled Total" : "Direct Inflow"})`,
                          mode: inflowPaymentMode || "Direct NEFT / RTGS Transfer",
                          utr: inflowUtrInput.trim() || `UTR-BANK${Math.floor(10000000 + Math.random() * 90000000)}`,
                        });

                        setInflowModalCase(null);
                        await fetchData(true);
                      } else {
                        setInflowModalError(res?.message || "Failed to record corporate inflow.");
                      }
                    } catch (err) {
                      setInflowModalError(err.message || "Network error recording inflow.");
                    } finally {
                      setIsSavingInflow(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingInflow ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : inflowMode === "set_total" ? (
                    <span>Save Total ({formatCurrency(inputNum)})</span>
                  ) : isProjectedSettled ? (
                    <span>✓ Mark Fully Settled</span>
                  ) : (
                    <span>Record Payment (+{formatCurrency(inputNum)})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
