"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { exportAdminSettlementsToExcel } from "./adminSettlementsExcelExport";
import { exportAdminSettlementsToPdf } from "./adminSettlementsPdfExport";
import { toast } from "sonner";

export default function AdminEarningsLedgerView({
  cases = [],
  onBackToSettlements,
  onRefresh,
  isSyncing = false,
}) {
  // 1. Date filter states
  const [datePreset, setDatePreset] = useState("ALL"); // ALL, THIS_MONTH, LAST_MONTH, LAST_30_DAYS, CUSTOM
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  // 2. Attribute filter states
  const [selectedDsa, setSelectedDsa] = useState("ALL");
  const [selectedSubDsa, setSelectedSubDsa] = useState("ALL");
  const [selectedBank, setSelectedBank] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [selectedRecovery, setSelectedRecovery] = useState("ALL"); // ALL, RECEIVED, PARTIAL, PENDING
  const [selectedPayout, setSelectedPayout] = useState("ALL"); // ALL, PAID, PENDING
  const [selectedPlan, setSelectedPlan] = useState("ALL"); // ALL, SPOT, STANDARD
  const [selectedTicketSize, setSelectedTicketSize] = useState("ALL"); // ALL, UNDER_5L, 5L_25L, 25L_50L, ABOVE_50L
  const [selectedMarginSpread, setSelectedMarginSpread] = useState("ALL"); // ALL, HIGH, STANDARD, TIGHT
  const [searchQuery, setSearchQuery] = useState("");

  // 3. Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  // Staged export states: "idle" | "gathering" | "formatting" | "ready"
  const [excelStage, setExcelStage] = useState("idle");
  const [pdfStage, setPdfStage] = useState("idle");

  // Currency Formatter
  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
    const num = Number(val);
    const absNum = Math.abs(num);
    if (absNum >= 10000000) {
      const crVal = (absNum / 10000000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
      return `${num < 0 ? "-" : ""}₹${crVal} Cr`;
    }
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

  // Helper: check if a case matches all active filters EXCEPT an optional ignored dimension.
  // This enables dynamic cross-referencing so every dropdown only shows options that co-exist with the other selected filters.
  const matchesFiltersExcept = useCallback(
    (c, ignoreKey = null) => {
      // 1. Date filter
      const caseDate = c.disbursement_date || c.created_at;
      if (caseDate) {
        const d = new Date(caseDate);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          if (datePreset === "THIS_MONTH") {
            if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
          } else if (datePreset === "LAST_MONTH") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (d.getFullYear() !== lastMonth.getFullYear() || d.getMonth() !== lastMonth.getMonth()) return false;
          } else if (datePreset === "LAST_30_DAYS") {
            const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30 || diffDays < 0) return false;
          } else if (datePreset === "CUSTOM") {
            if (customFromDate) {
              const from = new Date(customFromDate);
              from.setHours(0, 0, 0, 0);
              if (d < from) return false;
            }
            if (customToDate) {
              const to = new Date(customToDate);
              to.setHours(23, 59, 59, 999);
              if (d > to) return false;
            }
          }
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCase = String(c.case_number || "").toLowerCase().includes(q);
        const matchesCust = String(c.customer_name || "").toLowerCase().includes(q);
        const matchesDsa = String(c.dsa_name || "").toLowerCase().includes(q);
        const matchesSubDsa = String(c.sub_dsa?.name || c.sub_dsa_name || "").toLowerCase().includes(q);
        const matchesLoanAcc = String(c.loan_account_number || c.application_number || "").toLowerCase().includes(q);
        const matchesBank = String(c.bank_name || "").toLowerCase().includes(q);
        const matchesProduct = String(c.product_name || "").toLowerCase().includes(q);
        if (!matchesCase && !matchesCust && !matchesDsa && !matchesSubDsa && !matchesLoanAcc && !matchesBank && !matchesProduct) {
          return false;
        }
      }

      // 3. DSA Partner
      if (ignoreKey !== "dsa" && selectedDsa !== "ALL") {
        if (c.dsa_name?.trim() !== selectedDsa) return false;
      }

      // 4. Sub-DSA Agent
      if (ignoreKey !== "subDsa" && selectedSubDsa !== "ALL") {
        const subName = c.sub_dsa?.name || c.sub_dsa_name;
        if (subName?.trim() !== selectedSubDsa) return false;
      }

      // 5. Bank Partner
      if (ignoreKey !== "bank" && selectedBank !== "ALL") {
        if (c.bank_name?.trim() !== selectedBank) return false;
      }

      // 6. Loan Product
      if (ignoreKey !== "product" && selectedProduct !== "ALL") {
        if (c.product_name?.trim() !== selectedProduct) return false;
      }

      // 7. Inflow Recovery Status
      if (ignoreKey !== "recovery" && selectedRecovery !== "ALL") {
        const recAmt = Number(c.corporateReceivedAmount || 0);
        const infAmt = Number(c.corporateInflowAmount || 0);
        if (selectedRecovery === "RECEIVED" && !(recAmt >= infAmt && infAmt > 0)) return false;
        if (selectedRecovery === "PARTIAL" && !(recAmt > 0 && recAmt < infAmt)) return false;
        if (selectedRecovery === "PENDING" && !(recAmt === 0 || !c.corporateReceivedAmount)) return false;
      }

      // 8. DSA Payout Status
      if (ignoreKey !== "payout" && selectedPayout !== "ALL") {
        if (selectedPayout === "PAID" && !c.isAccepted) return false;
        if (selectedPayout === "PENDING" && (c.isAccepted || c.isRejected)) return false;
      }

      // 9. Settlement Plan
      if (ignoreKey !== "plan" && selectedPlan !== "ALL") {
        if (selectedPlan === "SPOT" && !c.isSpot) return false;
        if (selectedPlan === "STANDARD" && c.isSpot) return false;
      }

      // 10. Loan Ticket Size
      if (ignoreKey !== "ticketSize" && selectedTicketSize !== "ALL") {
        const amt = Number(c.baseAmount || 0);
        if (selectedTicketSize === "UNDER_5L" && !(amt < 500000)) return false;
        if (selectedTicketSize === "5L_25L" && !(amt >= 500000 && amt <= 2500000)) return false;
        if (selectedTicketSize === "25L_50L" && !(amt > 2500000 && amt <= 5000000)) return false;
        if (selectedTicketSize === "ABOVE_50L" && !(amt > 5000000)) return false;
      }

      // 11. Net Margin Spread
      if (ignoreKey !== "marginSpread" && selectedMarginSpread !== "ALL") {
        const corpRate = c.corporateRate !== null && c.corporateRate !== undefined ? Number(c.corporateRate) : null;
        const dsaRate = Number(c.dsaCommissionRate || 0);
        const marginPct = corpRate !== null ? Math.max(0, corpRate - dsaRate) : 0;
        if (selectedMarginSpread === "HIGH" && !(marginPct >= 0.5)) return false;
        if (selectedMarginSpread === "STANDARD" && !(marginPct >= 0.2 && marginPct < 0.5)) return false;
        if (selectedMarginSpread === "TIGHT" && !(marginPct < 0.2)) return false;
      }

      return true;
    },
    [
      datePreset,
      customFromDate,
      customToDate,
      searchQuery,
      selectedDsa,
      selectedSubDsa,
      selectedBank,
      selectedProduct,
      selectedRecovery,
      selectedPayout,
      selectedPlan,
      selectedTicketSize,
      selectedMarginSpread,
    ]
  );

  // Live Cross-Referenced Options: Each list contains only items that co-exist with the other active filters!
  const liveFilterOptions = useMemo(() => {
    const dsaSet = new Set();
    const subDsaSet = new Set();
    const bankSet = new Set();
    const productSet = new Set();

    cases.forEach((c) => {
      // 1. Available DSAs (ignoring current DSA selection)
      if (matchesFiltersExcept(c, "dsa") && c.dsa_name) {
        dsaSet.add(c.dsa_name.trim());
      }

      // 2. Available Sub-DSAs (ignoring current Sub-DSA selection)
      if (matchesFiltersExcept(c, "subDsa")) {
        const subName = c.sub_dsa?.name || c.sub_dsa_name;
        if (subName) {
          subDsaSet.add(subName.trim());
        }
      }

      // 3. Available Banks (ignoring current Bank selection - when DSA is selected, only shows that DSA's banks!)
      if (matchesFiltersExcept(c, "bank") && c.bank_name) {
        bankSet.add(c.bank_name.trim());
      }

      // 4. Available Products (ignoring current Product selection)
      if (matchesFiltersExcept(c, "product") && c.product_name) {
        productSet.add(c.product_name.trim());
      }
    });

    return {
      dsas: Array.from(dsaSet).sort(),
      subDsas: Array.from(subDsaSet).sort(),
      banks: Array.from(bankSet).sort(),
      products: Array.from(productSet).sort(),
    };
  }, [cases, matchesFiltersExcept]);

  // Automatic cleanup: if a selected option is no longer valid in the newly constrained list, revert it to "ALL"
  useEffect(() => {
    if (selectedDsa !== "ALL" && liveFilterOptions.dsas.length > 0 && !liveFilterOptions.dsas.includes(selectedDsa)) {
      setSelectedDsa("ALL");
    }
  }, [liveFilterOptions.dsas, selectedDsa]);

  useEffect(() => {
    if (selectedBank !== "ALL" && liveFilterOptions.banks.length > 0 && !liveFilterOptions.banks.includes(selectedBank)) {
      setSelectedBank("ALL");
    }
  }, [liveFilterOptions.banks, selectedBank]);

  useEffect(() => {
    if (selectedSubDsa !== "ALL" && liveFilterOptions.subDsas.length > 0 && !liveFilterOptions.subDsas.includes(selectedSubDsa)) {
      setSelectedSubDsa("ALL");
    }
  }, [liveFilterOptions.subDsas, selectedSubDsa]);

  useEffect(() => {
    if (selectedProduct !== "ALL" && liveFilterOptions.products.length > 0 && !liveFilterOptions.products.includes(selectedProduct)) {
      setSelectedProduct("ALL");
    }
  }, [liveFilterOptions.products, selectedProduct]);

  // Filter cases strictly by Date Picker + Dropdown Filters + Search Query
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Partner Filter
      if (selectedDsa !== "ALL" && c.dsa_name?.trim() !== selectedDsa) {
        return false;
      }

      // 2. Sub-DSA Filter
      if (selectedSubDsa !== "ALL") {
        const subName = c.sub_dsa?.name || c.sub_dsa_name;
        if (subName?.trim() !== selectedSubDsa) {
          return false;
        }
      }

      // 3. Bank Filter
      if (selectedBank !== "ALL" && c.bank_name?.trim() !== selectedBank) {
        return false;
      }

      // 4. Product Filter
      if (selectedProduct !== "ALL" && c.product_name?.trim() !== selectedProduct) {
        return false;
      }

      // 5. Inflow Recovery Status
      if (selectedRecovery !== "ALL") {
        const recAmt = Number(c.corporateReceivedAmount || 0);
        const infAmt = Number(c.corporateInflowAmount || 0);
        if (selectedRecovery === "RECEIVED" && !(recAmt >= infAmt && infAmt > 0)) {
          return false;
        }
        if (selectedRecovery === "PARTIAL" && !(recAmt > 0 && recAmt < infAmt)) {
          return false;
        }
        if (selectedRecovery === "PENDING" && !(recAmt === 0 || !c.corporateReceivedAmount)) {
          return false;
        }
      }

      // 6. DSA Payout Status
      if (selectedPayout !== "ALL") {
        if (selectedPayout === "PAID" && !c.isAccepted) {
          return false;
        }
        if (selectedPayout === "PENDING" && (c.isAccepted || c.isRejected)) {
          return false;
        }
      }

      // 7. Settlement Plan / Speed
      if (selectedPlan !== "ALL") {
        if (selectedPlan === "SPOT" && !c.isSpot) {
          return false;
        }
        if (selectedPlan === "STANDARD" && c.isSpot) {
          return false;
        }
      }

      // 8. Loan Ticket Size Bracket
      if (selectedTicketSize !== "ALL") {
        const amt = Number(c.baseAmount || 0);
        if (selectedTicketSize === "UNDER_5L" && !(amt < 500000)) {
          return false;
        }
        if (selectedTicketSize === "5L_25L" && !(amt >= 500000 && amt <= 2500000)) {
          return false;
        }
        if (selectedTicketSize === "25L_50L" && !(amt > 2500000 && amt <= 5000000)) {
          return false;
        }
        if (selectedTicketSize === "ABOVE_50L" && !(amt > 5000000)) {
          return false;
        }
      }

      // 9. Profit Margin Spread Bracket
      if (selectedMarginSpread !== "ALL") {
        const corpRate = c.corporateRate !== null && c.corporateRate !== undefined ? Number(c.corporateRate) : null;
        const dsaRate = Number(c.dsaCommissionRate || 0);
        const marginPct = corpRate !== null ? Math.max(0, corpRate - dsaRate) : 0;
        if (selectedMarginSpread === "HIGH" && !(marginPct >= 0.5)) {
          return false;
        }
        if (selectedMarginSpread === "STANDARD" && !(marginPct >= 0.2 && marginPct < 0.5)) {
          return false;
        }
        if (selectedMarginSpread === "TIGHT" && !(marginPct < 0.2)) {
          return false;
        }
      }

      // 10. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCase = String(c.case_number || "").toLowerCase().includes(q);
        const matchesCust = String(c.customer_name || "").toLowerCase().includes(q);
        const matchesDsa = String(c.dsa_name || "").toLowerCase().includes(q);
        const matchesSubDsa = String(c.sub_dsa?.name || c.sub_dsa_name || "").toLowerCase().includes(q);
        const matchesLoanAcc = String(c.loan_account_number || c.application_number || "").toLowerCase().includes(q);
        const matchesBank = String(c.bank_name || "").toLowerCase().includes(q);
        const matchesProduct = String(c.product_name || "").toLowerCase().includes(q);
        if (!matchesCase && !matchesCust && !matchesDsa && !matchesSubDsa && !matchesLoanAcc && !matchesBank && !matchesProduct) {
          return false;
        }
      }

      // 11. Date Filter
      const caseDate = c.disbursement_date || c.created_at;
      if (!caseDate) return true;
      const d = new Date(caseDate);
      if (isNaN(d.getTime())) return true;

      const now = new Date();

      if (datePreset === "THIS_MONTH") {
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) {
          return false;
        }
      } else if (datePreset === "LAST_MONTH") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (d.getFullYear() !== lastMonth.getFullYear() || d.getMonth() !== lastMonth.getMonth()) {
          return false;
        }
      } else if (datePreset === "LAST_30_DAYS") {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30 || diffDays < 0) return false;
      } else if (datePreset === "CUSTOM") {
        if (customFromDate) {
          const from = new Date(customFromDate);
          from.setHours(0, 0, 0, 0);
          if (d < from) return false;
        }
        if (customToDate) {
          const to = new Date(customToDate);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.disbursement_date || b.created_at || 0) - new Date(a.disbursement_date || a.created_at || 0));
  }, [
    cases,
    selectedDsa,
    selectedSubDsa,
    selectedBank,
    selectedProduct,
    selectedRecovery,
    selectedPayout,
    selectedPlan,
    selectedTicketSize,
    selectedMarginSpread,
    searchQuery,
    datePreset,
    customFromDate,
    customToDate,
  ]);

  // Financial Outcome Summary (Exact calculations of the filtered cases)
  const summary = useMemo(() => {
    let volume = 0;
    let corporateInflow = 0;
    let dsaOutflow = 0;
    let netProfit = 0;

    filteredCases.forEach((c) => {
      volume += Number(c.baseAmount || 0);
      corporateInflow += Number(c.corporateInflowAmount || 0);
      dsaOutflow += Number(c.dsaCommissionAmount || 0);
      netProfit += Number(c.netProfitSpread || 0);
    });

    const avgInflowRate = volume > 0 ? (corporateInflow / volume) * 100 : 0;
    const avgDsaRate = volume > 0 ? (dsaOutflow / volume) * 100 : 0;
    const avgNetSpread = volume > 0 ? (netProfit / volume) * 100 : 0;

    return {
      count: filteredCases.length,
      volume,
      corporateInflow,
      dsaOutflow,
      netProfit,
      avgInflowRate,
      avgDsaRate,
      avgNetSpread,
    };
  }, [filteredCases]);

  // Check if any filter is active and count them
  const hasActiveFilters =
    datePreset !== "ALL" ||
    Boolean(customFromDate) ||
    Boolean(customToDate) ||
    selectedDsa !== "ALL" ||
    selectedSubDsa !== "ALL" ||
    selectedBank !== "ALL" ||
    selectedProduct !== "ALL" ||
    selectedRecovery !== "ALL" ||
    selectedPayout !== "ALL" ||
    selectedPlan !== "ALL" ||
    selectedTicketSize !== "ALL" ||
    selectedMarginSpread !== "ALL" ||
    searchQuery.trim() !== "";

  const activeFilterCount = [
    datePreset !== "ALL" || customFromDate || customToDate,
    selectedDsa !== "ALL",
    selectedSubDsa !== "ALL",
    selectedBank !== "ALL",
    selectedProduct !== "ALL",
    selectedRecovery !== "ALL",
    selectedPayout !== "ALL",
    selectedPlan !== "ALL",
    selectedTicketSize !== "ALL",
    selectedMarginSpread !== "ALL",
    searchQuery.trim() !== "",
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setDatePreset("ALL");
    setCustomFromDate("");
    setCustomToDate("");
    setSelectedDsa("ALL");
    setSelectedSubDsa("ALL");
    setSelectedBank("ALL");
    setSelectedProduct("ALL");
    setSelectedRecovery("ALL");
    setSelectedPayout("ALL");
    setSelectedPlan("ALL");
    setSelectedTicketSize("ALL");
    setSelectedMarginSpread("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Pagination slicing
  const totalPages = Math.ceil(filteredCases.length / rowsPerPage) || 1;
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredCases.slice(start, start + rowsPerPage);
  }, [filteredCases, currentPage, rowsPerPage]);

  // Excel Export Staged SaaS Flow
  const handleExportExcel = async () => {
    if (excelStage !== "idle") return;
    setExcelStage("gathering");
    const toastId = toast.loading("Compiling settlement ledger records...");

    try {
      // Stage 2: Formatting workbook (after 600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      setExcelStage("formatting");
      toast.loading("Formatting Excel workbook & styling columns...", { id: toastId });

      // Stage 3: Ready & Trigger download (after 600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      setExcelStage("ready");

      await exportAdminSettlementsToExcel({
        cases: filteredCases,
        metrics: {
          totalVolume: summary.volume,
          totalBankInflow: summary.corporateInflow,
          totalDsaOutflow: summary.dsaOutflow,
          totalAdminProfit: summary.netProfit,
          averageMargin: summary.avgNetSpread,
          totalCasesCount: summary.count,
        },
      });

      // Morphing toast to success
      toast.success("Excel ledger downloaded successfully!", { id: toastId });

      // Return button to idle after 1.5s
      setTimeout(() => {
        setExcelStage("idle");
      }, 1500);
    } catch (err) {
      console.error("Export error:", err);
      toast.error(err?.message || "Failed to export Excel file.", { id: toastId });
      setExcelStage("idle");
    }
  };

  // PDF Download Staged SaaS Flow
  const handleDownloadPdf = async () => {
    if (pdfStage !== "idle") return;
    setPdfStage("gathering");
    const toastId = toast.loading("Compiling case audit records...");

    try {
      // Stage 2: Formatting PDF (after 600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPdfStage("formatting");
      toast.loading("Generating PDF layout & financial tables...", { id: toastId });

      // Stage 3: Ready & Trigger download (after 600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPdfStage("ready");

      await exportAdminSettlementsToPdf({
        cases: filteredCases,
        metrics: {
          totalVolume: summary.volume,
          totalBankInflow: summary.corporateInflow,
          totalDsaOutflow: summary.dsaOutflow,
          totalAdminProfit: summary.netProfit,
          averageMargin: summary.avgNetSpread,
        },
        reportTitle: "EARNINGS & COMMISSION AUDIT STATEMENT",
        statementType: "Audited Ledger Statement",
      });

      // Morphing toast to success
      toast.success("PDF audit statement downloaded successfully!", { id: toastId });

      // Return button to idle after 1.5s
      setTimeout(() => {
        setPdfStage("idle");
      }, 1500);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error(err?.message || "Failed to generate PDF statement.", { id: toastId });
      setPdfStage("idle");
    }
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-200">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1 sm:px-1.5 pt-1 pb-3 sm:pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Earnings &amp; Commission Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconcile Corporate DSA Inflows, Partner Payouts, and Platform Net Spread with an auditable statement.
          </p>
        </div>

        {/* Action Controls: 1. Settlements, 2. Export Excel, 3. Download PDF, 4. Sync */}
        <div className="flex items-center gap-2.5">
          {/* 1. Settlements Button */}
          <button
            type="button"
            onClick={onBackToSettlements}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 transition-all shadow-2xs cursor-pointer"
            title="Switch back to Settlements Hub"
          >
            <svg className="w-4 h-4 text-[#B063FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Settlements</span>
          </button>

          {/* 2. Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={excelStage !== "idle" || filteredCases.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 disabled:opacity-75 transition-all shadow-2xs cursor-pointer shrink-0"
            title="Export Filtered Ledger to Excel"
          >
            {excelStage === "gathering" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Gathering Records...</span>
              </>
            ) : excelStage === "formatting" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Formatting Excel...</span>
              </>
            ) : excelStage === "ready" ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ✓
                </span>
                <span>Download Ready!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Excel</span>
              </>
            )}
          </button>

          {/* 3. Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfStage !== "idle" || filteredCases.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 disabled:opacity-75 transition-all shadow-2xs cursor-pointer shrink-0"
            title="Download Filtered Ledger as PDF Statement"
          >
            {pdfStage === "gathering" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Gathering Records...</span>
              </>
            ) : pdfStage === "formatting" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Building PDF...</span>
              </>
            ) : pdfStage === "ready" ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ✓
                </span>
                <span>Download Ready!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 4h4" />
                </svg>
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* 4. Sync Button (Exact match to Settlements page) */}
          <button
            type="button"
            onClick={onRefresh}
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

      {/* 2. UNIFIED FILTER & DATE PICKER CONTROL BAR */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3.5">
        {/* Row 1: Date Range Presets + Custom Date Pickers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Date:
            </span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "LAST_30_DAYS", label: "Last 30 Days" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDatePreset(p.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  datePreset === p.id
                    ? "bg-[#B063FF] text-white font-semibold shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (shown when Custom Range is active) */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">From:</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => {
                    setCustomFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF]"
                />
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">To:</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => {
                    setCustomToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#B063FF]"
                />
              </div>
            </div>
          )}

          {/* Active Filter Badge & Reset All Button */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 self-start lg:self-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#B063FF] border border-purple-200/80">
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                title="Reset all filters to default"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset All
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Search Cases + Primary Filter Dropdowns (5 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-0.5">
          {/* 1. Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Search Cases
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Case #, customer, loan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-7 pr-6 py-1.5 text-xs rounded-lg border ${
                  searchQuery.trim()
                    ? "border-[#B063FF] bg-purple-50/20 text-[#B063FF] font-medium"
                    : "border-slate-300 bg-white text-slate-900"
                } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 2. DSA Partner Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              DSA Partner
            </label>
            <select
              value={selectedDsa}
              onChange={(e) => {
                setSelectedDsa(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedDsa !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All DSA Partners</option>
              {liveFilterOptions.dsas.map((dsa) => (
                <option key={dsa} value={dsa}>
                  {dsa}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sub-DSA Agent Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Sub-DSA Agent
            </label>
            <select
              value={selectedSubDsa}
              onChange={(e) => {
                setSelectedSubDsa(e.target.value);
                setCurrentPage(1);
              }}
              disabled={liveFilterOptions.subDsas.length === 0}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedSubDsa !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } disabled:opacity-50 disabled:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">
                {liveFilterOptions.subDsas.length === 0 ? "No Sub-DSAs" : "All Sub-DSAs"}
              </option>
              {liveFilterOptions.subDsas.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Bank Partner Dropdown (Live reference with DSA: only shows banks for matching cases) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Bank Partner
            </label>
            <select
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedBank !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Bank Partners</option>
              {liveFilterOptions.banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Loan Product Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Loan Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedProduct !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Loan Products</option>
              {liveFilterOptions.products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Secondary Settlement & Financial Dropdowns (5 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* 1. Corporate Inflow Recovery */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Inflow Recovery
            </label>
            <select
              value={selectedRecovery}
              onChange={(e) => {
                setSelectedRecovery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedRecovery !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Inflow Statuses</option>
              <option value="RECEIVED">Fully Received</option>
              <option value="PARTIAL">Partially Received</option>
              <option value="PENDING">Pending Bank Inflow</option>
            </select>
          </div>

          {/* 2. DSA Payout Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              DSA Payout Status
            </label>
            <select
              value={selectedPayout}
              onChange={(e) => {
                setSelectedPayout(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedPayout !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Payout Statuses</option>
              <option value="PAID">Paid / Unlocked</option>
              <option value="PENDING">Pending Review</option>
            </select>
          </div>

          {/* 3. Settlement Plan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Settlement Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedPlan !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Settlement Plans</option>
              <option value="SPOT">Spot 48-Hour</option>
              <option value="STANDARD">Standard 5-Day</option>
            </select>
          </div>

          {/* 4. Loan Ticket Size */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Loan Ticket Size
            </label>
            <select
              value={selectedTicketSize}
              onChange={(e) => {
                setSelectedTicketSize(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedTicketSize !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Ticket Sizes</option>
              <option value="UNDER_5L">Under ₹5 Lakhs</option>
              <option value="5L_25L">₹5L – ₹25 Lakhs</option>
              <option value="25L_50L">₹25L – ₹50 Lakhs</option>
              <option value="ABOVE_50L">Above ₹50 Lakhs</option>
            </select>
          </div>

          {/* 5. Net Margin Spread */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Net Margin Spread
            </label>
            <select
              value={selectedMarginSpread}
              onChange={(e) => {
                setSelectedMarginSpread(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                selectedMarginSpread !== "ALL"
                  ? "border-[#B063FF] bg-purple-50/25 text-[#B063FF] font-semibold"
                  : "border-slate-300 bg-white text-slate-900"
              } focus:outline-none focus:ring-1 focus:ring-[#B063FF]`}
            >
              <option value="ALL">All Margin Spreads</option>
              <option value="HIGH">High Spread (≥ 0.50%)</option>
              <option value="STANDARD">Standard (0.20% – 0.50%)</option>
              <option value="TIGHT">Tight Spread (&lt; 0.20%)</option>
            </select>
          </div>
        </div>

        {/* Row 4: Active Filter Badges/Chips */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Active:
            </span>

            {datePreset !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Date: {datePreset === "CUSTOM" ? `${customFromDate} to ${customToDate}` : datePreset}</span>
                <button type="button" onClick={() => { setDatePreset("ALL"); setCustomFromDate(""); setCustomToDate(""); }} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedDsa !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>DSA: {selectedDsa}</span>
                <button type="button" onClick={() => setSelectedDsa("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedSubDsa !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Sub-DSA: {selectedSubDsa}</span>
                <button type="button" onClick={() => setSelectedSubDsa("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedBank !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Bank: {selectedBank}</span>
                <button type="button" onClick={() => setSelectedBank("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedProduct !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Product: {selectedProduct}</span>
                <button type="button" onClick={() => setSelectedProduct("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedRecovery !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Recovery: {selectedRecovery}</span>
                <button type="button" onClick={() => setSelectedRecovery("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedPayout !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Payout: {selectedPayout}</span>
                <button type="button" onClick={() => setSelectedPayout("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedPlan !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Plan: {selectedPlan === "SPOT" ? "Spot 48h" : "Standard 5d"}</span>
                <button type="button" onClick={() => setSelectedPlan("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedTicketSize !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Ticket: {selectedTicketSize}</span>
                <button type="button" onClick={() => setSelectedTicketSize("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            {selectedMarginSpread !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                <span>Margin: {selectedMarginSpread}</span>
                <button type="button" onClick={() => setSelectedMarginSpread("ALL")} className="hover:text-purple-900 cursor-pointer">✕</button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 3. FINANCIAL OUTCOME SUMMARY RIBBON (CLEAN LIGHT THEME - NO DARK CARD) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Output 1: Cases */}
          <div className="flex flex-col justify-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Audited Cases
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {summary.count} <span className="text-xs text-slate-500 font-sans font-normal">case{summary.count !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Matching active filters
            </span>
          </div>

          {/* Output 2: Disbursed Volume */}
          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Loan Volume
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(summary.volume)}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              100% Disbursed
            </span>
          </div>

          {/* Output 3: Corporate Inflow */}
          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
              Corporate Inflow
            </span>
            <div className="text-xl font-bold font-mono text-purple-700 mt-1">
              {formatCurrency(summary.corporateInflow)}
            </div>
            <span className="text-[10px] text-purple-600 mt-0.5 font-medium">
              Avg {summary.avgInflowRate.toFixed(2)}% B2B rate
            </span>
          </div>

          {/* Output 4: DSA Commission */}
          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
              DSA Commission
            </span>
            <div className="text-xl font-bold font-mono text-amber-600 mt-1">
              {formatCurrency(summary.dsaOutflow)}
            </div>
            <span className="text-[10px] text-amber-600 mt-0.5 font-medium">
              Avg {summary.avgDsaRate.toFixed(2)}% payout
            </span>
          </div>

          {/* Output 5: LentFin Net Profit Spread */}
          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              LentFin Net Profit
            </span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              +{formatCurrency(summary.netProfit)}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 font-semibold">
              +{summary.avgNetSpread.toFixed(2)}% Net Spread
            </span>
          </div>
        </div>
      </div>

      {/* 4. CLEAN READ-ONLY CASE LEDGER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3.5">Disbursed Date</th>
                <th className="py-3 px-3">Case ID</th>
                <th className="py-3 px-3.5">Customer Name</th>
                <th className="py-3 px-3.5">Partner (DSA)</th>
                <th className="py-3 px-3.5">Bank &amp; Product</th>
                <th className="py-3 px-3.5 text-right">Loan Amount</th>
                <th className="py-3 px-3.5 text-right text-purple-700">Corporate Inflow</th>
                <th className="py-3 px-3.5 text-right text-amber-700">DSA Commission</th>
                <th className="py-3 px-3.5 text-right text-emerald-700 bg-emerald-50/30">Net Profit (Spread)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No cases match the selected date range and filters.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c, idx) => {
                  const corpRate = c.corporateRate !== null && c.corporateRate !== undefined ? Number(c.corporateRate) : null;
                  const dsaRate = Number(c.dsaCommissionRate || 0);
                  const netMargin = Number(c.netProfitSpread || 0);
                  const marginPct = corpRate !== null ? Math.max(0, corpRate - dsaRate) : 0;

                  return (
                    <tr
                      key={c.id || idx}
                      className="hover:bg-slate-50/80 transition-colors text-slate-700"
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 font-medium whitespace-nowrap text-slate-600">
                        {formatDate(c.disbursement_date || c.created_at)}
                      </td>

                      {/* Case ID */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {c.case_number || `LC-${c.id}`}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[150px] truncate" title={c.customer_name || ""}>
                        {c.customer_name || "—"}
                      </td>

                      {/* Partner DSA */}
                      <td className="py-3 px-3.5 max-w-[150px]">
                        <div className="font-medium text-slate-800 truncate" title={c.dsa_name || "Direct DSA"}>
                          {c.dsa_name || "Direct DSA"}
                        </div>
                        {c.sub_dsa?.name && (
                          <div className="text-[10px] text-slate-400 truncate" title={c.sub_dsa.name}>
                            Sub: {c.sub_dsa.name}
                          </div>
                        )}
                      </td>

                      {/* Bank & Product */}
                      <td className="py-3 px-3.5 min-w-[180px] max-w-[220px]">
                        <div className="font-semibold text-slate-800 break-words whitespace-normal leading-snug">
                          {c.bank_name || "Partner Bank"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.product_name || "Loan"}
                        </div>
                      </td>

                      {/* Loan Volume (Principal) */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(c.baseAmount)}
                      </td>

                      {/* Corporate Inflow */}
                      <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-purple-700">
                          {formatCurrency(c.corporateInflowAmount)}
                        </div>
                        <div className="text-[10px] text-purple-500 font-sans font-medium">
                          {corpRate !== null ? `${corpRate.toFixed(2)}%` : "—"}
                        </div>
                      </td>

                      {/* DSA Commission Outflow */}
                      <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                        <div className="font-semibold text-amber-800">
                          {formatCurrency(c.dsaCommissionAmount)}
                        </div>
                        <div className="text-[10px] text-amber-600 font-sans font-medium">
                          {dsaRate > 0 ? `${dsaRate.toFixed(2)}%` : "—"}
                        </div>
                      </td>

                      {/* LentFin Net Profit Spread */}
                      <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap bg-emerald-50/20">
                        <div className="font-bold text-emerald-700 text-xs">
                          +{formatCurrency(netMargin)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-sans font-semibold">
                          +{marginPct.toFixed(2)}% margin
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* PINNED BOTTOM TOTALS ROW */}
            {filteredCases.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-3 px-3.5 text-slate-900 font-semibold uppercase tracking-wider text-[11px]">
                    Total ({summary.count} cases selected)
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900">
                    {formatCurrency(summary.volume)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-extrabold text-purple-700">
                    {formatCurrency(summary.corporateInflow)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-extrabold text-amber-800">
                    {formatCurrency(summary.dsaOutflow)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/50">
                    +{formatCurrency(summary.netProfit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 5. PAGINATION & ROWS FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 text-xs text-slate-500 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              {[10, 15, 25, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Showing {filteredCases.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{" "}
              {Math.min(currentPage * rowsPerPage, filteredCases.length)} of {filteredCases.length} cases
            </span>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
            >
              ← Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
