"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [pddFilter, setPddFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");

  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const addFilterRef = useRef(null);

  // Close "+ Add Filter" popup when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addFilterRef.current && !addFilterRef.current.contains(event.target)) {
        setIsAddFilterOpen(false);
        setSelectedCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const displayCustomers =
    fetchedCustomers.length > 0 ? fetchedCustomers : customers;

  // Extract unique banks dynamically from customer dataset
  const filterOptions = useMemo(() => {
    const banks = new Set();
    displayCustomers.forEach((cust) => {
      const b = (cust.bank || "").trim();
      if (b && b !== "—" && b !== "N/A" && b !== "Bank Partner") {
        banks.add(b);
      }
    });
    return {
      banks: Array.from(banks).sort(),
    };
  }, [displayCustomers]);

  const filteredCustomers = useMemo(() => {
    return displayCustomers.filter((cust) => {
      const name = (cust.customerName || cust.name || "").toLowerCase();
      const mobile = (cust.mobile || "").toLowerCase();
      const appNo = (cust.applicationNo || cust.caseNumber || "").toLowerCase();
      const bank = (cust.bank || "").toLowerCase();
      const loanAcc = (cust.loanAccountNo || "").toLowerCase();
      const pddStatus = (cust.pddStatus || (cust.pddCleared ? "CLEARED" : "PENDING")).toUpperCase();
      const rawStatus = (cust.status || "SUBMITTED").toUpperCase();

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

      const matchesStatus =
        statusFilter === "ALL" ||
        rawStatus === statusFilter.toUpperCase() ||
        (statusFilter === "ACCEPTED" && (rawStatus === "ACCEPTED" || rawStatus === "APPROVED" || rawStatus === "VERIFIED"));

      const matchesBank =
        bankFilter === "ALL" || (cust.bank || "").toLowerCase() === bankFilter.toLowerCase();

      return matchesSearch && matchesPdd && matchesStatus && matchesBank;
    });
  }, [displayCustomers, searchTerm, pddFilter, statusFilter, bankFilter]);

  // Reset to page 1 whenever search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pddFilter, statusFilter, bankFilter, pageSize]);

  const filterCategories = [
    { id: "pdd", label: "PDD Status", icon: "⚡", isActive: pddFilter !== "ALL" },
    { id: "status", label: "Application Status", icon: "📋", isActive: statusFilter !== "ALL" },
    { id: "bank", label: "Lending Bank", icon: "🏦", isActive: bankFilter !== "ALL" },
  ];

  const getCategoryOptions = (catId) => {
    switch (catId) {
      case "pdd":
        return [
          {
            label: "All PDD Statuses",
            value: "ALL",
            isSelected: pddFilter === "ALL",
            onSelect: () => setPddFilter("ALL"),
          },
          {
            label: "PDD Cleared",
            value: "CLEARED",
            isSelected: pddFilter === "CLEARED",
            onSelect: () => setPddFilter("CLEARED"),
          },
          {
            label: "PDD Pending",
            value: "PENDING",
            isSelected: pddFilter === "PENDING",
            onSelect: () => setPddFilter("PENDING"),
          },
        ];

      case "status":
        return [
          {
            label: "All Statuses",
            value: "ALL",
            isSelected: statusFilter === "ALL",
            onSelect: () => setStatusFilter("ALL"),
          },
          {
            label: "Submitted / Pending",
            value: "SUBMITTED",
            isSelected: statusFilter === "SUBMITTED",
            onSelect: () => setStatusFilter("SUBMITTED"),
          },
          {
            label: "Accepted / Approved",
            value: "ACCEPTED",
            isSelected: statusFilter === "ACCEPTED",
            onSelect: () => setStatusFilter("ACCEPTED"),
          },
          {
            label: "Rejected",
            value: "REJECTED",
            isSelected: statusFilter === "REJECTED",
            onSelect: () => setStatusFilter("REJECTED"),
          },
        ];

      case "bank":
        return [
          {
            label: "All Banks",
            value: "ALL",
            isSelected: bankFilter === "ALL",
            onSelect: () => setBankFilter("ALL"),
          },
          ...filterOptions.banks.map((b) => ({
            label: b,
            value: b,
            isSelected: bankFilter === b,
            onSelect: () => setBankFilter(b),
          })),
        ];

      default:
        return [];
    }
  };

  const activeFiltersCount = [
    pddFilter !== "ALL",
    statusFilter !== "ALL",
    bankFilter !== "ALL",
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  const handleClearAllFilters = () => {
    setPddFilter("ALL");
    setStatusFilter("ALL");
    setBankFilter("ALL");
  };

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
    <div className="space-y-3.5 sm:space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl select-none shrink-0 leading-none">👥</span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              Customer Management
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal hidden sm:block">
              Manage and view registered customers across all active loan cases.
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH AND DYNAMIC FILTERS TOOLBAR */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-2xs">
        {/* Top Controls Row: Search Input + Add Filter Button (Side-by-side on all screens) */}
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="flex-1 relative min-w-0">
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
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-colors h-[38px]"
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

          {/* "+ New Application" Action Button (Brand purple color) */}
          <button
            type="button"
            onClick={handleOpenNewApp}
            title="New Application"
            className="h-[38px] px-2.5 sm:px-3.5 rounded-md bg-[#B063FF] hover:bg-[#9e4def] active:scale-95 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Application</span>
          </button>

          {/* "+ Add Filter" Dynamic Popover Button (On the right) */}
          <div className="relative shrink-0" ref={addFilterRef}>
            <button
              type="button"
              onClick={() => {
                setIsAddFilterOpen(!isAddFilterOpen);
                setSelectedCategory(null);
              }}
              className={`h-[38px] px-2.5 sm:px-3.5 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs shrink-0 select-none ${
                isAddFilterOpen || activeFiltersCount > 0
                  ? "border-purple-300 bg-purple-50/50 text-purple-900"
                  : "border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden xs:inline sm:inline">Add Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Popover Dropdown */}
            {isAddFilterOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-lg border border-slate-200 bg-white shadow-xl z-30 py-1 text-xs animate-fadeIn">
                {selectedCategory === null ? (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Filter Customers By
                    </div>
                    <div className="py-1">
                      {filterCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className="w-full px-3 py-2 text-left hover:bg-purple-50/60 flex items-center justify-between text-slate-700 hover:text-purple-950 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span className="font-medium">{cat.label}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-400">
                            {cat.isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            )}
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/60">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className="p-1 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Back to filter categories"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="font-semibold text-slate-800 text-xs">
                        {filterCategories.find((c) => c.id === selectedCategory)?.label}
                      </span>
                    </div>

                    <div className="py-1 max-h-56 overflow-y-auto custom-scrollbar">
                      {getCategoryOptions(selectedCategory).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            opt.onSelect();
                            setIsAddFilterOpen(false);
                            setSelectedCategory(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                            opt.isSelected
                              ? "bg-purple-50 text-purple-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {opt.isSelected && <span className="text-purple-600 font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Badges Row */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div className="flex sm:hidden items-center justify-between text-xs">
              <span className="text-slate-500 font-normal">
                Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredCustomers.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{displayCustomers.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-purple-700 hover:text-purple-900 font-semibold text-xs hover:underline cursor-pointer"
              >
                Clear all ({activeFiltersCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline mr-1">
                Active filters:
              </span>

              {pddFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>PDD: {pddFilter === "CLEARED" ? "Cleared" : "Pending"}</span>
                  <button
                    type="button"
                    onClick={() => setPddFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                    title="Remove PDD filter"
                  >
                    ✕
                  </button>
                </span>
              )}

              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>Status: {statusFilter}</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                    title="Remove status filter"
                  >
                    ✕
                  </button>
                </span>
              )}

              {bankFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>Bank: {bankFilter}</span>
                  <button
                    type="button"
                    onClick={() => setBankFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                    title="Remove bank filter"
                  >
                    ✕
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="hidden sm:inline-flex text-purple-700 hover:text-purple-900 font-medium text-xs hover:underline cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
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
            <div className="pt-3.5 sm:pt-4 px-4 sm:px-6 pb-4 border-t border-slate-200/80 bg-white">
              {/* MOBILE PAGINATION (block sm:hidden): Touch-Friendly 2-Row Stack */}
              <div className="block sm:hidden space-y-2 text-xs">
                {/* Row 1: Compact Rows Selector + Showing Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Rows:</span>
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

                  <div className="text-slate-500 font-medium text-right tabular-nums">
                    Showing <span className="font-semibold text-slate-900">{totalCustomers === 0 ? 0 : startIndex + 1}–{endIndex}</span> of <span className="font-semibold text-slate-900">{totalCustomers}</span>
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

                {/* Showing X–Y of Z Text */}
                <div className="text-slate-500 font-medium text-center">
                  Showing <span className="font-semibold text-slate-900 tabular-nums">{totalCustomers === 0 ? 0 : startIndex + 1}–{endIndex}</span> of <span className="font-semibold text-slate-900 tabular-nums">{totalCustomers}</span>
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
                          ? "btn-primary text-white shadow-2xs font-semibold"
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
