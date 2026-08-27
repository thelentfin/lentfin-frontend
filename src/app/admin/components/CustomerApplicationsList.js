"use client";

import React, { useState, useEffect, useMemo } from "react";
import CustomerApplicationDetailsModal from "./CustomerApplicationDetailsModal";

export default function CustomerApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchApplications = async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    const startTime = Date.now();

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/loan-disbursement/admin/all`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Unauthorized. Insufficient permissions or session expired."
          );
        }
        throw new Error(
          `Failed to fetch customer applications (Status ${response.status})`
        );
      }

      const data = await response.json();

      if (data.status) {
        setApplications(data.data || []);
      } else {
        throw new Error(
          data.message || "Failed to load customer applications."
        );
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      if (isSilent) {
        const elapsed = Date.now() - startTime;
        const minDelay = 1200;
        if (elapsed < minDelay) {
          await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
        }
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredApplications = useMemo(() => {
    return applications.filter((item) => {
      const { dsa = {}, loan_case = {} } = item;
      const customerName = (loan_case.customer_name || "").toLowerCase();
      const caseNumber = (loan_case.case_number || "").toLowerCase();
      const bankName = (loan_case.bank || item.bank_name || "").toLowerCase();
      const dsaName = (dsa.name || "").toLowerCase();
      const dsaCode = (dsa.dsa_code || "").toLowerCase();
      const status = (loan_case.status || item.status || "SUBMITTED").toUpperCase();

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        caseNumber.includes(query) ||
        bankName.includes(query) ||
        dsaName.includes(query) ||
        dsaCode.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  // Reset to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination Calculations
  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, rowsPerPage, totalPages, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalItems);

  const paginatedApplications = useMemo(() => {
    return filteredApplications.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [filteredApplications, currentPage, rowsPerPage]);

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

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "N/A";
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleActionSuccess = (caseId, newStatus) => {
    if (caseId && newStatus) {
      setApplications((prev) =>
        prev.map((item) => {
          const { loan_case = {}, disbursement = {} } = item;
          const itemCaseId =
            loan_case.case_id ||
            loan_case.id ||
            disbursement.case_id ||
            item.case_id ||
            item.id;

          if (String(itemCaseId) === String(caseId)) {
            return {
              ...item,
              status: newStatus,
              loan_case: {
                ...loan_case,
                status: newStatus,
              },
            };
          }
          return item;
        })
      );
    }
    fetchApplications(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏦</span> Customer Loan Applications
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal">
            View customer loan case applications submitted across all registered DSA partners.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => fetchApplications(true)}
          disabled={isLoading || isRefreshing}
          className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors shrink-0 min-w-[124px] ${
            isRefreshing
              ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 cursor-not-allowed"
              : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer disabled:opacity-50"
          }`}
        >
          {isRefreshing ? (
            <>
              <svg
                className="animate-spin w-3.5 h-3.5 text-white shrink-0"
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
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5 text-slate-500 shrink-0"
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
              <span>Refresh List</span>
            </>
          )}
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-3">
          <svg
            className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="font-semibold mb-0.5">
              Error Loading Customer Applications
            </h4>
            <p className="text-red-600 text-xs">{error}</p>
          </div>
          <button
            onClick={fetchApplications}
            className="px-3 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by Customer, Case No, Bank, or DSA Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 font-medium text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset Bar */}
        {(searchTerm || statusFilter !== "ALL") && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-normal">
              Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredApplications.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{applications.length}</strong> applications
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="text-slate-700 hover:text-slate-900 font-medium text-xs cursor-pointer"
            >
              Clear Filters ↺
            </button>
          </div>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Submitted Applications
            </h2>
            {!isLoading && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                {totalItems}
              </span>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <svg
              className="animate-spin w-6 h-6 text-slate-600 mb-2"
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
            <p className="text-xs font-normal text-slate-500">
              Fetching customer applications...
            </p>
          </div>
        ) : applications.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 mb-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mb-0.5">
              No customer applications found.
            </h3>
            <p className="text-xs text-slate-500 max-w-xs font-normal">
              No DSA customer applications have been submitted yet.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                    <th className="py-3 px-3">Case Number</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Sanction Amount</th>
                    <th className="py-3 px-3">Disbursement Amount</th>
                    <th className="py-3 px-3">DSA Partner</th>
                    <th className="py-3 px-3">Submitted Date</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedApplications.map((item, index) => {
                    const { dsa = {}, loan_case = {}, disbursement = {} } = item;
                    const rawStatus = (loan_case.status || item.status || "SUBMITTED").toUpperCase();

                    return (
                      <tr
                        key={item.disbursement?.id || index}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        {/* Case Number */}
                        <td className="py-3.5 px-3 font-mono font-medium text-slate-900 tabular-nums">
                          {loan_case.case_number || "N/A"}
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {loan_case.customer_name || "N/A"}
                        </td>

                        {/* Sanction Amount */}
                        <td className="py-3.5 px-3 font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(loan_case.sanction_amount)}
                        </td>

                        {/* Disbursement Amount */}
                        <td className="py-3.5 px-3 font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(disbursement.disbursement_amount)}
                        </td>

                        {/* DSA */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">
                              {dsa.name || "N/A"}
                            </span>
                            {dsa.dsa_code && (
                              <span className="rounded bg-slate-100 text-slate-600 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono tabular-nums">
                                {dsa.dsa_code}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3.5 px-3 text-slate-500 font-normal tabular-nums">
                          {formatDate(disbursement.created_at || disbursement.disbursement_date)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                              rawStatus === "ACCEPTED" || rawStatus === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : rawStatus === "REJECTED"
                                ? "bg-red-50 text-red-700 border-red-200/80"
                                : "bg-blue-50 text-blue-700 border-blue-200/80"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                rawStatus === "ACCEPTED" || rawStatus === "APPROVED"
                                  ? "bg-emerald-500"
                                  : rawStatus === "REJECTED"
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            {rawStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            title="View Customer Application"
                            aria-label="View Customer Application"
                            onClick={() => setSelectedItem(item)}
                            className="p-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden space-y-3">
              {paginatedApplications.map((item, index) => {
                const { dsa = {}, loan_case = {}, disbursement = {} } = item;
                const rawStatus = (loan_case.status || item.status || "SUBMITTED").toUpperCase();

                return (
                  <div
                    key={item.disbursement?.id || index}
                    className="rounded-md border border-slate-200/80 bg-white p-3.5 space-y-2.5"
                  >
                    {/* Top Row: Case Number & Customer Name */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-slate-900 text-xs block truncate tabular-nums">
                          {loan_case.case_number || "N/A"}
                        </span>
                        <span className="text-xs text-slate-500 font-normal truncate block">
                          {loan_case.customer_name || "N/A"}
                        </span>
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-900 border border-slate-200/80 shrink-0 tabular-nums">
                        {formatCurrency(loan_case.sanction_amount)}
                      </span>
                    </div>

                    {/* Details Info List */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-normal">Disbursed:</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(disbursement.disbursement_amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-normal">DSA Partner:</span>
                        <span className="font-medium text-slate-800">
                          {dsa.name || "N/A"} {dsa.dsa_code ? `(${dsa.dsa_code})` : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-normal">Status:</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            rawStatus === "ACCEPTED" || rawStatus === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : rawStatus === "REJECTED"
                              ? "bg-red-50 text-red-700 border-red-200/80"
                              : "bg-blue-50 text-blue-700 border-blue-200/80"
                          }`}
                        >
                          {rawStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 tabular-nums">
                        <span>Submitted: {formatDate(disbursement.created_at || disbursement.disbursement_date)}</span>
                      </div>
                    </div>

                    {/* Card Footer: Action Button */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Application Case
                      </span>
                      <button
                        type="button"
                        title="View Application"
                        aria-label="View Application"
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">
                  Rows per page:
                </span>
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
                <span className="font-semibold text-slate-900 tabular-nums">{totalItems}</span>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
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
                    disabled={page === "..."}
                    className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                      page === currentPage
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
                  disabled={currentPage === totalPages || totalPages === 0}
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
          </>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedItem && (
        <CustomerApplicationDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onActionSuccess={(caseId, newStatus) => handleActionSuccess(caseId, newStatus)}
        />
      )}
    </div>
  );
}
