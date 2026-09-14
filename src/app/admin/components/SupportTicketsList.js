"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import SupportTicketDrawer from "./SupportTicketDrawer";
import { supportTicketService } from "@/services/supportTicketService";
import { customerApiService } from "@/services/customerApiService";

// Issue Type enum mapping to human-readable labels
const ISSUE_TYPE_MAP = {
  CUSTOMER_DETAILS: "Customer Details / Information",
  DOCUMENT_ERROR: "Document Issue / Error",
  BANK_DETAILS: "Bank / Financial Details",
  DISBURSEMENT: "Disbursement Issue",
  OTHER: "Other Issue",
  // Backward compatibility mappings
  "Incorrect Customer Information": "Customer Details / Information",
  "Document Issue": "Document Issue / Error",
  "Application Status Issue": "Application Status Issue",
  "Technical Issue": "Technical Issue",
  "Profile Information": "Profile Information",
};

/**
 * Format ISO datetime string to date label and display string
 */
const formatTicketDate = (dateStr) => {
  if (!dateStr) return { dateLabel: "—", fullCreatedAt: "—" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { dateLabel: "—", fullCreatedAt: "—" };

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return {
      dateLabel: `${day} ${month} ${year}`,
      fullCreatedAt: `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`,
    };
  } catch {
    return { dateLabel: "—", fullCreatedAt: "—" };
  }
};

/**
 * Normalize status string
 */
/**
 * Normalize status string
 */
const normalizeStatus = (status) => {
  if (!status) return "Open";
  const s = String(status).toUpperCase();
  if (s === "RESOLVED") return "Resolved";
  return "Open";
};

/**
 * Normalize backend category to UI display label
 */
const normalizeCategory = (category) => {
  if (!category) return "General Support";
  const cat = String(category).trim().toUpperCase();
  if (cat === "CUSTOMER_APPLICATION" || cat === "CUSTOMER APPLICATION") {
    return "Customer Application";
  }
  if (cat === "GENERAL_SUPPORT" || cat === "GENERAL SUPPORT") {
    return "General Support";
  }
  return category;
};

/**
 * Map API response item into the shape expected by SupportTicketsList and SupportTicketDrawer
 */
const mapApiTicketToRow = (item, casesMap = {}) => {
  const t = item.ticket || item;
  const d = item.dsa || {};
  const atts = Array.isArray(item.attachments) ? item.attachments : [];
  const { dateLabel, fullCreatedAt } = formatTicketDate(t.created_at);

  const category = normalizeCategory(t.category);
  const issueLabel =
    ISSUE_TYPE_MAP[t.issue_type] || t.issue_type || "General Query";
  const statusNormalized = normalizeStatus(t.status);

  const matchedCase = t.case_id ? casesMap[String(t.case_id)] : null;

  return {
    id: String(t.id),
    ticketNumber: t.ticket_number || `SUP-${t.id}`,
    case_id: t.case_id || null,
    caseId: t.case_id || null,
    category,
    issueType: issueLabel,
    description: t.description || "",
    status: statusNormalized,
    createdAt: fullCreatedAt,
    dateLabel,
    dsa: {
      id: d.id || null,
      name: d.name || "DSA Partner",
      dsaCode: d.dsa_code || (d.id ? `DSA-${d.id}` : "DSA"),
      email: d.email || "—",
      mobile: d.mobile || "—",
      companyName: d.company_name || null,
    },
    // Loan case fields: directly map backend-provided bank_name and customer_name
    customerApp: t.case_id
      ? {
        id: String(t.case_id),
        caseId: t.case_id,
        name: t.customer_name || null,
        customerName: t.customer_name || null,
        applicationNo:
          matchedCase?.application_number ||
          matchedCase?.case_number ||
          `APP-#${t.case_id}`,
        caseNumber: matchedCase?.case_number || null,
        bank: t.bank_name || null,
        sanctionAmount: matchedCase?.sanction_amount
          ? `₹${Number(matchedCase.sanction_amount).toLocaleString("en-IN")}`
          : null,
        status: matchedCase?.status || null,
        rejectReason: matchedCase?.reject_reason || null,
      }
      : null,
    attachments: atts.map((att) => ({
      id: att.id,
      name: att.file_name || "Attachment",
      url: att.file_url || "#",
      file_url: att.file_url || "#",
      size: "Document",
      type: att.file_type || "application/octet-stream",
    })),
  };
};

export default function SupportTicketsList() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch tickets from real backend API and enrich with real loan case status
  const fetchTickets = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [res, loanCases] = await Promise.all([
        supportTicketService.getAllTickets(),
        customerApiService.fetchAllLoanCasesAdmin().catch(() => []),
      ]);

      if (!res || !res.status) {
        const errorMsg =
          res?.message || "Failed to load support tickets from server.";
        setError(errorMsg);
        toast.error(errorMsg);
        setTickets([]);
        return;
      }

      const casesMap = {};
      if (Array.isArray(loanCases)) {
        loanCases.forEach((c) => {
          const cid = c.id || c.loan_case?.id;
          if (cid) casesMap[String(cid)] = c.loan_case || c;
        });
      }

      const rawTickets = Array.isArray(res.data) ? res.data : [];
      const mapped = rawTickets.map((item) =>
        mapApiTicketToRow(item, casesMap),
      );
      setTickets(mapped);
    } catch (err) {
      console.error("Support Tickets Fetch Error:", err);
      const msg =
        err.message || "An error occurred while fetching support tickets.";
      setError(msg);
      toast.error(msg);
      setTickets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchTickets(false);
  }, [fetchTickets]);

  const handleRefresh = () => {
    fetchTickets(true);
  };

  // Reject Application action handler
  const handleRejectApplication = (
    ticketIdOrNumber,
    caseId,
    reason,
    flags = { appRejected: true, ticketResolved: true },
  ) => {
    const matchesTicket = (t) =>
      t &&
      (t.id === ticketIdOrNumber ||
        String(t.id) === String(ticketIdOrNumber) ||
        t.ticketNumber === ticketIdOrNumber);

    setTickets((prev) =>
      prev.map((t) => {
        if (matchesTicket(t)) {
          return {
            ...t,
            status: flags.ticketResolved ? "Resolved" : t.status,
            customerApp: t.customerApp
              ? {
                ...t.customerApp,
                status: flags.appRejected ? "REJECTED" : t.customerApp.status,
                rejectReason: reason || t.customerApp.rejectReason,
              }
              : null,
          };
        }
        return t;
      }),
    );

    if (selectedTicket) {
      setSelectedTicket((prev) =>
        matchesTicket(prev)
          ? {
            ...prev,
            status: flags.ticketResolved ? "Resolved" : prev.status,
            customerApp: prev.customerApp
              ? {
                ...prev.customerApp,
                status: flags.appRejected
                  ? "REJECTED"
                  : prev.customerApp.status,
                rejectReason: reason || prev.customerApp.rejectReason,
              }
              : null,
          }
          : prev,
      );
    }
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.dsa?.name || "").toLowerCase().includes(q) ||
        (t.dsa?.dsaCode || "").toLowerCase().includes(q) ||
        (t.customerApp?.name || "").toLowerCase().includes(q) ||
        (t.customerApp?.applicationNo || "").toLowerCase().includes(q) ||
        (t.customerApp?.id && `case #${t.customerApp.id}`.includes(q)) ||
        (t.issueType || "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "ALL" ||
        t.category.toLowerCase().includes(categoryFilter.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        t.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [tickets, searchTerm, categoryFilter, statusFilter]);

  // Metrics
  const totalCount = tickets.length;
  const openCount = tickets.filter(
    (t) => (t.status || "").toLowerCase() === "open",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => (t.status || "").toLowerCase() === "resolved",
  ).length;
  const customerAppCount = tickets.filter((t) =>
    t.category.toLowerCase().includes("customer"),
  ).length;

  // Reset to page 1 whenever filters, search term, or rowsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, rowsPerPage]);

  // Pagination Calculations
  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, rowsPerPage, totalPages, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalItems);

  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage,
    );
  }, [filteredTickets, currentPage, rowsPerPage]);

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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-lg shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🎫</span> Support Tickets
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal">
            Manage support requests raised by DSA partners.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors shrink-0 ${isRefreshing
              ? "bg-slate-900 text-white cursor-not-allowed"
              : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer"
            }`}
        >
          <svg
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-white" : "text-slate-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{isRefreshing ? "Refreshing..." : "Refresh List"}</span>
        </button>
      </div>

      {/* Error Banner if API call failed */}
      {error && !isLoading && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchTickets(false)}
            className="font-medium underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">
            Total Tickets
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {isLoading ? "—" : totalCount}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-blue-600 block">
            Open Requests
          </span>
          <span className="text-lg font-bold text-blue-700 tabular-nums">
            {isLoading ? "—" : openCount}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-emerald-600 block">
            Resolved
          </span>
          <span className="text-lg font-bold text-emerald-700 tabular-nums">
            {isLoading ? "—" : resolvedCount}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#B063FF] block">
            Customer App Tickets
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {isLoading ? "—" : customerAppCount}
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        {/* Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center gap-2.5 bg-white">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ticket, DSA, app #..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#B063FF]"
          >
            <option value="ALL">All Categories</option>
            <option value="Customer">Customer Application</option>
            <option value="General">General Support</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#B063FF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                <th className="py-3 px-4 font-semibold">Ticket ID</th>
                <th className="py-3 px-4 font-semibold">DSA</th>
                <th className="py-3 px-4 font-semibold">Customer / Application</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Created Date</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="animate-spin w-5 h-5 text-[#B063FF]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span className="font-medium text-slate-600">
                        Loading support tickets...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span className="font-medium">{error}</span>
                      <button
                        type="button"
                        onClick={() => fetchTickets(false)}
                        className="mt-1 px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs border border-red-200 cursor-pointer"
                      >
                        Retry Loading
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedTickets.length > 0 ? (
                paginatedTickets.map((t) => {
                  const isResolved = (t.status || "").toUpperCase() === "RESOLVED";
                  const isCustApp = (t.category || "").includes("Customer");

                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                        {t.ticketNumber}
                      </td>

                      {/* DSA */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {t.dsa?.name}
                          </span>
                          {t.dsa?.dsaCode && (
                            <span className="rounded bg-slate-100 text-slate-600 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono tabular-nums">
                              {t.dsa.dsaCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer / Application */}
                      <td className="py-3.5 px-4">
                        {isCustApp && t.customerApp ? (
                          t.customerApp.name || t.customerApp.applicationNo || t.customerApp.caseNumber ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-900 block truncate max-w-[240px]">
                                {t.customerApp.name || "—"}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono block tabular-nums truncate max-w-[240px]">
                                {t.customerApp.applicationNo || t.customerApp.caseNumber || "—"}
                                {t.customerApp.bank && (
                                  <>
                                    {" · "}
                                    <span className="font-sans text-slate-600 font-medium">
                                      {t.customerApp.bank}
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-700 block truncate max-w-[240px]">
                                Loan Case #{t.customerApp.id}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal block">
                                Case details pending
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${isResolved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : "bg-blue-50 text-blue-700 border-blue-200/80"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isResolved ? "bg-emerald-500" : "bg-blue-500"
                              }`}
                          />
                          {t.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-normal tabular-nums">
                        {t.dateLabel || t.createdAt}
                      </td>

                      {/* Action Button (Eye Icon) */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          title="View Ticket Details"
                          aria-label="View Ticket Details"
                          onClick={() => setSelectedTicket(t)}
                          className="p-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
                        >
                          <svg
                            className="w-4 h-4 text-slate-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-slate-400"
                  >
                    No support tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List View */}
        <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <svg
                className="animate-spin w-5 h-5 text-[#B063FF]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Loading support tickets...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-red-500 space-y-2">
              <p>⚠️ {error}</p>
              <button
                type="button"
                onClick={() => fetchTickets(false)}
                className="px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200"
              >
                Retry
              </button>
            </div>
          ) : paginatedTickets.length > 0 ? (
            paginatedTickets.map((t) => {
              const isResolved = (t.status || "").toUpperCase() === "RESOLVED";
              const isCustApp = (t.category || "").includes("Customer");

              return (
                <div
                  key={t.id}
                  className="rounded-md border border-slate-200/80 bg-white p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-slate-900 text-xs block tabular-nums">
                        {t.ticketNumber}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${isResolved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          : "bg-blue-50 text-blue-700 border-blue-200/80"
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isResolved ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                      />
                      {t.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">DSA Partner:</span>
                      <span className="font-medium text-slate-900">
                        {t.dsa?.name} ({t.dsa?.dsaCode})
                      </span>
                    </div>

                    {isCustApp && t.customerApp && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Customer / App:</span>
                        <span className="font-medium text-slate-900 text-right truncate max-w-[180px]">
                          {t.customerApp.name
                            ? `${t.customerApp.name} (${t.customerApp.bank || "—"})`
                            : `Loan Case #${t.customerApp.id}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Created Date:</span>
                      <span className="text-slate-700 tabular-nums">
                        {t.dateLabel || t.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>View Ticket Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="p-4 text-center text-xs text-slate-400">
              No support tickets found.
            </p>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Rows Per Page Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Showing X–Y of Z Text */}
          <div className="text-slate-500 font-medium text-center">
            Showing{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {startIndex}–{endIndex}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {totalItems}
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer"
              aria-label="Previous Page"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {pageNumbers.map((page, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  typeof page === "number" && setCurrentPage(page)
                }
                disabled={page === "..." || isLoading}
                className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors ${page === currentPage
                    ? "bg-slate-900 text-white"
                    : page === "..."
                      ? "text-slate-400 cursor-default"
                      : "border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                  }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0 || isLoading}
              className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right-side Support Ticket Drawer */}
      {selectedTicket && (
        <SupportTicketDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRejectApplication={handleRejectApplication}
        />
      )}
    </div>
  );
}
