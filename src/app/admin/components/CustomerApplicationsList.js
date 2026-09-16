"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  const [bankFilter, setBankFilter] = useState("ALL");
  const [dsaFilter, setDsaFilter] = useState("ALL");

  // Dynamic "+ Add Filter" Dropdown State
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

  // Extract Unique Filter Values from dataset
  const filterOptions = useMemo(() => {
    const banks = new Set();
    const dsas = new Set();

    applications.forEach((item) => {
      const { dsa = {}, loan_case = {} } = item;
      const bank = loan_case.bank || item.bank_name;
      if (bank && bank.trim() && bank !== "N/A") {
        banks.add(bank.trim());
      }
      const dsaName = dsa.name;
      if (dsaName && dsaName.trim() && dsaName !== "N/A") {
        dsas.add(dsaName.trim());
      }
    });

    return {
      banks: Array.from(banks).sort(),
      dsas: Array.from(dsas).sort(),
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((item) => {
      const { dsa = {}, loan_case = {} } = item;
      const customerName = (loan_case.customer_name || "").toLowerCase();
      const caseNumber = (loan_case.case_number || "").toLowerCase();
      const bankName = (loan_case.bank || item.bank_name || "").toLowerCase();
      const dsaName = (dsa.name || "").toLowerCase();
      const dsaCode = (dsa.dsa_code || "").toLowerCase();
      const rawStatus = (loan_case.status || item.status || "SUBMITTED").toUpperCase();

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        caseNumber.includes(query) ||
        bankName.includes(query) ||
        dsaName.includes(query) ||
        dsaCode.includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        rawStatus === statusFilter.toUpperCase() ||
        (statusFilter === "ACCEPTED" && (rawStatus === "ACCEPTED" || rawStatus === "APPROVED"));

      const itemBank = (loan_case.bank || item.bank_name || "").trim();
      const matchesBank =
        bankFilter === "ALL" || itemBank.toLowerCase() === bankFilter.toLowerCase();

      const itemDsa = (dsa.name || "").trim();
      const matchesDsa =
        dsaFilter === "ALL" || itemDsa.toLowerCase() === dsaFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesBank && matchesDsa;
    });
  }, [applications, searchTerm, statusFilter, bankFilter, dsaFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bankFilter, dsaFilter, rowsPerPage]);

  const filterCategories = [
    { id: "status", label: "Application Status", icon: "⚡", isActive: statusFilter !== "ALL" },
    { id: "bank", label: "Lending Bank", icon: "🏦", isActive: bankFilter !== "ALL" },
    { id: "dsa", label: "DSA Partner", icon: "🤝", isActive: dsaFilter !== "ALL" },
  ];

  const getCategoryOptions = (categoryId) => {
    switch (categoryId) {
      case "status":
        return [
          {
            label: "All Statuses",
            value: "ALL",
            isSelected: statusFilter === "ALL",
            onSelect: () => setStatusFilter("ALL"),
          },
          {
            label: "Submitted",
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

      case "dsa":
        return [
          {
            label: "All DSA Partners",
            value: "ALL",
            isSelected: dsaFilter === "ALL",
            onSelect: () => setDsaFilter("ALL"),
          },
          ...filterOptions.dsas.map((d) => ({
            label: d,
            value: d,
            isSelected: dsaFilter === d,
            onSelect: () => setDsaFilter(d),
          })),
        ];

      default:
        return [];
    }
  };

  const activeFiltersCount = [
    statusFilter !== "ALL",
    bankFilter !== "ALL",
    dsaFilter !== "ALL",
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  const handleClearAllFilters = () => {
    setStatusFilter("ALL");
    setBankFilter("ALL");
    setDsaFilter("ALL");
  };

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
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl select-none shrink-0 leading-none">🏦</span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              Customer Loan Applications
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal hidden sm:block">
              View customer loan case applications submitted across all registered DSA partners.
            </p>
          </div>
        </div>

        {/* Refresh Button - Compact icon on mobile, full label on desktop */}
        <button
          type="button"
          onClick={() => fetchApplications(true)}
          disabled={isLoading || isRefreshing}
          title="Refresh List"
          className={`inline-flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3.5 rounded-md text-xs font-medium transition-colors shrink-0 sm:min-w-[124px] ${
            isRefreshing
              ? "bg-[#B063FF] hover:bg-[#9e4def] text-white border border-[#B063FF] cursor-not-allowed shadow-2xs"
              : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer shadow-2xs"
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
              <span className="hidden sm:inline">Refreshing...</span>
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
              <span className="hidden sm:inline">Refresh List</span>
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
              placeholder="Search by Customer, Case No, Bank, or DSA Name..."
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

          {/* "+ Add Filter" Dynamic Popover Button */}
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
                      Filter Applications By
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
            {/* Mobile Top Bar: Results Count + Always-Visible Clear All Button */}
            <div className="flex sm:hidden items-center justify-between text-xs">
              <span className="text-slate-500 font-normal">
                Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredApplications.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{applications.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-purple-700 hover:text-purple-900 font-semibold text-xs hover:underline cursor-pointer"
              >
                Clear all ({activeFiltersCount})
              </button>
            </div>

            {/* Badges Container: flex-wrap with clean spacing */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline mr-1">
                Active filters:
              </span>

              {/* Status Badge */}
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

              {/* Bank Badge */}
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

              {/* DSA Badge */}
              {dsaFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>DSA: {dsaFilter}</span>
                  <button
                    type="button"
                    onClick={() => setDsaFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                    title="Remove DSA filter"
                  >
                    ✕
                  </button>
                </span>
              )}

              {/* Desktop Clear All Action */}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="hidden sm:inline-block ml-1 text-xs text-purple-700 hover:text-purple-900 font-semibold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
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
            <div className="hidden sm:block overflow-x-auto">
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
                        key={item.disbursement?.id || item.id || index}
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
            <div className="block sm:hidden space-y-3">
              {paginatedApplications.map((item, index) => {
                const { dsa = {}, loan_case = {}, disbursement = {} } = item;
                const rawStatus = (loan_case.status || item.status || "SUBMITTED").toUpperCase();

                return (
                  <div
                    key={item.disbursement?.id || item.id || index}
                    onClick={() => setSelectedItem(item)}
                    className="rounded-lg border border-slate-200/80 bg-white p-3.5 space-y-3 shadow-2xs hover:border-purple-200 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {/* Top Row: Customer Avatar, Name, Case Number & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center justify-center text-xs shrink-0 border border-purple-200/60">
                          {(loan_case.customer_name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 text-sm truncate block">
                            {loan_case.customer_name || "N/A"}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 truncate block tabular-nums">
                            {loan_case.case_number || "N/A"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border shrink-0 ${
                          rawStatus === "ACCEPTED" || rawStatus === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : rawStatus === "REJECTED"
                            ? "bg-red-50 text-red-700 border-red-200/80"
                            : "bg-blue-50 text-blue-700 border-blue-200/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            rawStatus === "ACCEPTED" || rawStatus === "APPROVED"
                              ? "bg-emerald-500"
                              : rawStatus === "REJECTED"
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                        />
                        {rawStatus}
                      </span>
                    </div>

                    {/* Middle Info Grid: 2-Columns with Clean Icons */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-100">
                      {/* Sanction Amount */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">💰</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Sanction</span>
                          <span className="font-semibold text-slate-900 tabular-nums truncate block">
                            {formatCurrency(loan_case.sanction_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Disbursement Amount */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">💸</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Disbursed</span>
                          <span className="font-semibold text-emerald-700 tabular-nums truncate block">
                            {formatCurrency(disbursement.disbursement_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Lending Bank */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">🏦</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Bank</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {loan_case.bank || item.bank_name || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* DSA Partner */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">🤝</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">DSA</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {dsa.name || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row: Applied Date + Borderless View Button */}
                    <div className="flex items-center justify-between pt-0.5 text-xs">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        Submitted: {formatDate(disbursement.created_at || disbursement.disbursement_date)}
                      </span>
                      <button
                        type="button"
                        title="View Application"
                        aria-label="View Application"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className="px-2 py-1 rounded-md hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
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
            <div className="pt-4 border-t border-slate-200/80">
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
                      className="bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
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
                  Showing <span className="font-semibold text-slate-900 tabular-nums">{startIndex}–{endIndex}</span> of <span className="font-semibold text-slate-900 tabular-nums">{totalItems}</span>
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
