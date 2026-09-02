"use client";

import React, { useState, useEffect } from "react";
import CustomerRegistrationModal from "./customer/CustomerRegistrationModal";
import { customerApiService } from "@/services/customerApiService";

export default function CustomerManagement({
  customers = [],
  onNewApplication,
  onRefresh,
}) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [fetchedCustomers, setFetchedCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBackendCustomers = async () => {
    setIsLoading(true);
    const data = await customerApiService.fetchCustomerCases();
    setFetchedCustomers(data || []);
    setIsLoading(false);
    if (typeof onRefresh === "function") {
      onRefresh(data);
    }
  };

  useEffect(() => {
    loadBackendCustomers();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [pddFilter, setPddFilter] = useState("ALL");

  const displayCustomers =
    fetchedCustomers.length > 0 ? fetchedCustomers : customers;

  const filteredCustomers = React.useMemo(() => {
    return displayCustomers.filter((cust) => {
      const name = (cust.customerName || cust.name || "").toLowerCase();
      const mobile = (cust.mobile || "").toLowerCase();
      const appNo = (cust.applicationNo || "").toLowerCase();
      const bank = (cust.bank || "").toLowerCase();
      const loanAcc = (cust.loanAccountNo || "").toLowerCase();
      const pddStatus = (cust.pddStatus || (cust.pddCleared ? "CLEARED" : "PENDING")).toUpperCase();

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        name.includes(query) ||
        mobile.includes(query) ||
        appNo.includes(query) ||
        bank.includes(query) ||
        loanAcc.includes(query);

      const matchesPdd =
        pddFilter === "ALL" || pddStatus.includes(pddFilter.toUpperCase());

      return matchesSearch && matchesPdd;
    });
  }, [displayCustomers, searchTerm, pddFilter]);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pddFilter]);

  const totalCustomers = filteredCustomers.length;
  const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(currentPage * pageSize, totalCustomers);
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

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

  const handleOpenNewApp = () => {
    if (typeof onNewApplication === "function") {
      onNewApplication();
    } else {
      setShowNewAppModal(true);
    }
  };

  const handleRegistrationSuccess = () => {
    loadBackendCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200/80">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
            Customer Management
          </h2>
          <p className="text-xs sm:text-sm font-normal text-slate-500 mt-0.5">
            Manage and view registered customers
          </p>
        </div>

        <button
          onClick={handleOpenNewApp}
          className="inline-flex items-center justify-center gap-2 rounded-md btn-primary px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </button>
      </div>

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
              placeholder="Search by Customer Name, Mobile, App No, Bank..."
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

          {/* PDD Filter */}
          <div>
            <select
              value={pddFilter}
              onChange={(e) => setPddFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="ALL">All PDD Statuses</option>
              <option value="CLEARED">PDD Cleared</option>
              <option value="PENDING">PDD Pending</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset Bar */}
        {(searchTerm || pddFilter !== "ALL") && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-normal">
              Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredCustomers.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{displayCustomers.length}</strong> customers
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPddFilter("ALL");
              }}
              className="text-slate-700 hover:text-slate-900 font-medium text-xs cursor-pointer"
            >
              Clear Filters ↺
            </button>
          </div>
        )}
      </div>

      {/* Main Table / Content Card */}
      <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-normal text-xs sm:text-sm space-y-2">
            <svg className="animate-spin h-5 w-5 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Loading registered customers...</p>
          </div>
        ) : displayCustomers.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500 border border-slate-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No customers registered yet
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Start adding customer applications to track sanction, disbursement, and commission details here.
            </p>
            <button
              onClick={handleOpenNewApp}
              className="mt-4 inline-flex items-center gap-2 rounded-md btn-primary px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
              </svg>
              New Application
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-medium tracking-wider uppercase">
                    <th className="py-3 px-4 sm:px-6">Customer Name</th>
                    <th className="py-3 px-4 sm:px-6">Mobile</th>
                    <th className="py-3 px-4 sm:px-6">Application No.</th>
                    <th className="py-3 px-4 sm:px-6">Loan Account No.</th>
                    <th className="py-3 px-4 sm:px-6">Bank</th>
                    <th className="py-3 px-4 sm:px-6">Sanction Amount</th>
                    <th className="py-3 px-4 sm:px-6">Disbursement</th>
                    <th className="py-3 px-4 sm:px-6">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentCustomers.map((cust, idx) => {
                    const rawStatus = (cust.status || "Submitted").trim();
                    const statusLower = rawStatus.toLowerCase();
                    const isAccepted = statusLower === "accepted" || statusLower === "approved" || statusLower === "verified";
                    const isRejected = statusLower === "rejected";
                    const displayStatus = isAccepted ? "Accepted" : isRejected ? "Rejected" : "Submitted";

                    return (
                      <tr key={cust.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">{cust.customerName || cust.name}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono tabular-nums">{cust.mobile}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-900 font-mono font-medium tabular-nums">{cust.applicationNo}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono tabular-nums">{cust.loanAccountNo}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-800 font-medium">{cust.bank}</td>
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 tabular-nums">{cust.sanctionAmount}</td>
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-700 tabular-nums">{cust.disbursementAmount || "—"}</td>
                        <td className="py-3.5 px-4 sm:px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-medium border ${
                              isAccepted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : isRejected
                                ? "bg-red-50 text-red-700 border-red-200/80"
                                : "bg-amber-50 text-amber-700 border-amber-200/80"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAccepted
                                  ? "bg-emerald-500"
                                  : isRejected
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {displayStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            title="View Details"
                            aria-label="View Details"
                            onClick={() => setSelectedCustomer(cust)}
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
            <div className="block md:hidden p-4 space-y-3">
              {currentCustomers.map((cust, idx) => {
                const rawStatus = (cust.status || "Submitted").trim();
                const statusLower = rawStatus.toLowerCase();
                const isAccepted = statusLower === "accepted" || statusLower === "approved" || statusLower === "verified";
                const isRejected = statusLower === "rejected";
                const displayStatus = isAccepted ? "Accepted" : isRejected ? "Rejected" : "Submitted";

                return (
                  <div
                    key={cust.id || idx}
                    className="rounded-md border border-slate-200/80 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <span className="font-mono font-medium text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px] tabular-nums">
                        {cust.applicationNo || "N/A"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                          isAccepted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : isRejected
                            ? "bg-red-50 text-red-700 border-red-200/80"
                            : "bg-amber-50 text-amber-700 border-amber-200/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAccepted
                              ? "bg-emerald-500"
                              : isRejected
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {displayStatus}
                      </span>
                    </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-xs truncate">
                      {cust.customerName || cust.name || "N/A"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-normal shrink-0">Mobile:</span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">{cust.mobile || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-normal shrink-0">Bank:</span>
                      <span className="font-medium text-slate-800 truncate">{cust.bank || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-normal shrink-0">Loan Account:</span>
                      <span className="font-mono font-medium text-slate-700 truncate tabular-nums">{cust.loanAccountNo || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                      <span className="text-slate-500 font-normal shrink-0">Sanction Amount:</span>
                      <span className="font-semibold text-slate-900 text-xs tabular-nums">{cust.sanctionAmount || "—"}</span>
                    </div>

                    {cust.disbursementAmount && cust.disbursementAmount !== "—" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-normal shrink-0">Disbursement:</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">{cust.disbursementAmount}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end">
                    <button
                      type="button"
                      title="View Details"
                      aria-label="View Details"
                      onClick={() => setSelectedCustomer(cust)}
                      className="p-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>View Details</span>
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
            <div className="pt-4 px-4 sm:px-6 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
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

              <div className="text-slate-500 font-medium text-center">
                Showing <span className="font-semibold text-slate-900 tabular-nums">{totalCustomers === 0 ? 0 : startIndex + 1}–{endIndex}</span> of <span className="font-semibold text-slate-900 tabular-nums">{totalCustomers}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer"
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
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors cursor-pointer"
                  aria-label="Next Page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Customer Registration Modal */}
      <CustomerRegistrationModal
        isOpen={showNewAppModal}
        onClose={() => setShowNewAppModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Customer Read-Only Details Slide-Over Drawer */}
      {selectedCustomer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden">
            {/* Drawer Header (Sticky Top) */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-3.5 bg-white shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Customer Details
                </h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5 tabular-nums">
                  Application No: {selectedCustomer.applicationNo}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Body (Independent Scroll Area) */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
              {/* REJECTION REASON CARD (shown only for REJECTED applications) */}
              {String(selectedCustomer.status || "").toUpperCase() === "REJECTED" && (
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-xs border-b border-red-200/80 pb-2">
                    <span className="text-sm">⚠️</span>
                    <h4 className="uppercase tracking-wider">Rejection Reason</h4>
                  </div>
                  <p className="text-xs text-red-900 font-medium leading-relaxed">
                    {selectedCustomer.rejectReason ||
                      selectedCustomer.reject_reason ||
                      "No specific reason provided."}
                  </p>
                </div>
              )}

              {/* Overview Grid */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <span className="text-sm">👤</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Customer Overview
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Customer Name</span>
                    <span className="font-semibold text-slate-900 text-xs block truncate">{selectedCustomer.customerName || selectedCustomer.name}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile</span>
                    <span className="font-medium text-slate-900 font-mono text-xs block tabular-nums">{selectedCustomer.mobile}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Lending Bank</span>
                    <span className="font-semibold text-slate-900 text-xs block truncate">{selectedCustomer.bank}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Loan Account No</span>
                    <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">{selectedCustomer.loanAccountNo}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Sanction Amount</span>
                    <span className="font-semibold text-slate-900 text-xs block tabular-nums">{selectedCustomer.sanctionAmount}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Disbursement</span>
                    <span className="font-semibold text-emerald-700 text-xs block tabular-nums">{selectedCustomer.disbursementAmount}</span>
                  </div>
                </div>
              </div>

              {/* Additional Application Details */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <span className="text-sm">📋</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Extended Application Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block text-xs border-b border-slate-200/80 pb-1">Sales Manager (SM)</span>
                    <p className="text-slate-600"><span className="text-slate-500 font-normal">Name:</span> {selectedCustomer.smName}</p>
                    <p className="text-slate-600 tabular-nums"><span className="text-slate-500 font-normal">Mobile:</span> {selectedCustomer.smNumber}</p>
                    <p className="text-slate-600 truncate"><span className="text-slate-500 font-normal">Email:</span> {selectedCustomer.smEmail}</p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block text-xs border-b border-slate-200/80 pb-1">Area Sales Manager (ASM)</span>
                    <p className="text-slate-600"><span className="text-slate-500 font-normal">Name:</span> {selectedCustomer.asmName}</p>
                    <p className="text-slate-600 tabular-nums"><span className="text-slate-500 font-normal">Mobile:</span> {selectedCustomer.asmNumber}</p>
                    <p className="text-slate-600 truncate"><span className="text-slate-500 font-normal">Email:</span> {selectedCustomer.asmEmail}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs pt-1 border-t border-slate-200/80">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">PDD Cleared Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${selectedCustomer.pddCleared ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-amber-50 text-amber-700 border-amber-200/80"}`}>
                      {selectedCustomer.pddCleared ? "✓ YES (Cleared)" : "NO (Pending)"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Option</span>
                    <span className="font-medium text-slate-900 text-xs block">{selectedCustomer.paymentType}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <span className="text-sm">📁</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Uploaded Documents
                  </h4>
                </div>
                <div className="space-y-2">
                  {/* Sanction Letter Document Card */}
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">📄</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 truncate">Sanction Letter</span>
                        <span className="text-[10px] font-normal text-slate-500 truncate">
                          {selectedCustomer.sanctionLetterName || "sanction_letter.pdf"}
                        </span>
                      </div>
                    </div>

                    {selectedCustomer.sanctionLetterUrl ? (
                      <a
                        href={selectedCustomer.sanctionLetterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer text-[11px] font-medium shrink-0"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        Uploaded
                      </span>
                    )}
                  </div>

                  {/* PDD Document Card */}
                  <div className={`flex items-center justify-between p-2.5 rounded-md border text-xs ${
                    selectedCustomer.pddCleared
                      ? "bg-slate-50 border-slate-200/80"
                      : "bg-slate-50/50 border-slate-200/80 text-slate-400"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">📜</span>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-semibold truncate ${selectedCustomer.pddCleared ? "text-slate-900" : "text-slate-500"}`}>
                          PDD Document
                        </span>
                        <span className="text-[10px] font-normal text-slate-500 truncate">
                          {selectedCustomer.pddCleared
                            ? selectedCustomer.pddDocumentName || "pdd_document.pdf"
                            : "Not Cleared"}
                        </span>
                      </div>
                    </div>

                    {selectedCustomer.pddCleared && selectedCustomer.pddDocumentUrl ? (
                      <a
                        href={selectedCustomer.pddDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer text-[11px] font-medium shrink-0"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {selectedCustomer.pddCleared ? "Uploaded" : "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer (Sticky Bottom) */}
            <div className="flex justify-end px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 shrink-0 sticky bottom-0 z-10">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
