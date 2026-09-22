"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import DSAApplicationModal from "./DSAApplicationModal";

export default function DSAApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

      const response = await fetch(`${API_BASE_URL}/corporate/requests`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized. Insufficient permissions or session expired.");
        }
        throw new Error(`Failed to fetch applications (Status ${response.status})`);
      }

      const data = await response.json();

      if (data.status) {
        setApplications(data.data || []);
      } else {
        throw new Error(data.message || "Failed to load DSA applications.");
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
  const [constitutionFilter, setConstitutionFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

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
    const companies = new Set();
    const locations = new Set();
    const constitutions = new Set([
      "Individual",
      "Sole Proprietorship",
      "Partnership",
    ]);

    applications.forEach((app) => {
      const company = app.request_company_name || app.company_name || app.master_company_name;
      if (company && company.trim() && company !== "N/A") {
        companies.add(company.trim());
      }
      const loc = app.request_location || app.location_name || app.location;
      if (loc && loc.trim() && loc !== "N/A") {
        locations.add(loc.trim());
      }
      if (app.constitution_type && app.constitution_type.trim()) {
        const ct = app.constitution_type.trim();
        if (ct === "Proprietorship") {
          constitutions.add("Sole Proprietorship");
        } else {
          constitutions.add(ct);
        }
      }
    });

    return {
      companies: Array.from(companies).sort(),
      locations: Array.from(locations).sort(),
      constitutions: Array.from(constitutions).sort(),
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const applicantName = (app.name || "").toLowerCase();
      const email = (app.email || "").toLowerCase();
      const mobile = (app.mobile_number || app.mobile || "").toLowerCase();
      const company = (app.request_company_name || app.company_name || app.master_company_name || "").toLowerCase();
      const location = (app.request_location || app.location_name || app.location || "").toLowerCase();
      const status = (app.status || "PENDING").toUpperCase();

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        applicantName.includes(query) ||
        email.includes(query) ||
        mobile.includes(query) ||
        company.includes(query) ||
        location.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const appCompanyName = app.request_company_name || app.company_name || app.master_company_name || "";
      const matchesCompany =
        companyFilter === "ALL" || appCompanyName === companyFilter;

      const appLocationName = app.request_location || app.location_name || app.location || "";
      const matchesLocation =
        locationFilter === "ALL" || appLocationName === locationFilter;

      const matchesConstitution =
        constitutionFilter === "ALL" ||
        app.constitution_type === constitutionFilter ||
        (constitutionFilter === "Sole Proprietorship" &&
          (app.constitution_type === "Proprietorship" || app.constitution_type === "Sole Proprietorship"));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCompany &&
        matchesLocation &&
        matchesConstitution
      );
    });
  }, [applications, searchTerm, statusFilter, companyFilter, locationFilter, constitutionFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, companyFilter, locationFilter, constitutionFilter, rowsPerPage]);

  const filterCategories = [
    { id: "status", label: "Application Status", icon: "⚡", isActive: statusFilter !== "ALL" },
    { id: "constitution", label: "Registration Type", icon: "📑", isActive: constitutionFilter !== "ALL" },
    { id: "company", label: "Company", icon: "🏢", isActive: companyFilter !== "ALL" },
    { id: "location", label: "Location", icon: "📍", isActive: locationFilter !== "ALL" },
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
            label: "Pending",
            value: "PENDING",
            isSelected: statusFilter === "PENDING",
            onSelect: () => setStatusFilter("PENDING"),
          },
          {
            label: "Verified / Approved",
            value: "VERIFIED",
            isSelected: statusFilter === "VERIFIED",
            onSelect: () => setStatusFilter("VERIFIED"),
          },
          {
            label: "Rejected",
            value: "REJECTED",
            isSelected: statusFilter === "REJECTED",
            onSelect: () => setStatusFilter("REJECTED"),
          },
        ];
      case "constitution":
        return [
          {
            label: "All Registration Types",
            value: "ALL",
            isSelected: constitutionFilter === "ALL",
            onSelect: () => setConstitutionFilter("ALL"),
          },
          ...filterOptions.constitutions.map((c) => ({
            label: c,
            value: c,
            isSelected: constitutionFilter === c,
            onSelect: () => setConstitutionFilter(c),
          })),
        ];
      case "company":
        return [
          {
            label: "All Companies",
            value: "ALL",
            isSelected: companyFilter === "ALL",
            onSelect: () => setCompanyFilter("ALL"),
          },
          ...filterOptions.companies.map((c) => ({
            label: c,
            value: c,
            isSelected: companyFilter === c,
            onSelect: () => setCompanyFilter(c),
          })),
        ];
      case "location":
        return [
          {
            label: "All Locations",
            value: "ALL",
            isSelected: locationFilter === "ALL",
            onSelect: () => setLocationFilter("ALL"),
          },
          ...filterOptions.locations.map((loc) => ({
            label: loc,
            value: loc,
            isSelected: locationFilter === loc,
            onSelect: () => setLocationFilter(loc),
          })),
        ];
      default:
        return [];
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCompanyFilter("ALL");
    setLocationFilter("ALL");
    setConstitutionFilter("ALL");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "ALL" ||
    companyFilter !== "ALL" ||
    locationFilter !== "ALL" ||
    constitutionFilter !== "ALL";

  const activeFiltersCount = [
    statusFilter !== "ALL",
    companyFilter !== "ALL",
    locationFilter !== "ALL",
    constitutionFilter !== "ALL",
  ].filter(Boolean).length;

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
    return filteredApplications.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
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

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl select-none shrink-0 leading-none">📋</span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              DSA Registration Applications
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal hidden sm:block">
              Review and verify pending DSA partner registration requests and constitution documents.
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
            <h4 className="font-semibold mb-0.5">Error Loading Applications</h4>
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
              placeholder="Search applications..."
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
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              {/* Active Status Badge */}
              {statusFilter !== "ALL" && (
                <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/90 text-purple-950 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                  <span className="text-purple-600">⚡</span>
                  <span className="text-slate-500 font-normal">Status:</span>
                  <span className="font-semibold text-purple-900 capitalize">
                    {statusFilter.toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className="text-purple-400 hover:text-purple-700 ml-0.5 p-0.5 rounded hover:bg-purple-100 cursor-pointer"
                    title="Remove status filter"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Registration Type Badge */}
              {constitutionFilter !== "ALL" && (
                <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/90 text-purple-950 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                  <span className="text-purple-600">📑</span>
                  <span className="text-slate-500 font-normal">Registration:</span>
                  <span className="font-semibold text-purple-900 max-w-[150px] truncate">
                    {constitutionFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConstitutionFilter("ALL")}
                    className="text-purple-400 hover:text-purple-700 ml-0.5 p-0.5 rounded hover:bg-purple-100 cursor-pointer"
                    title="Remove registration type filter"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Company Badge */}
              {companyFilter !== "ALL" && (
                <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/90 text-purple-950 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                  <span className="text-purple-600">🏢</span>
                  <span className="text-slate-500 font-normal">Company:</span>
                  <span className="font-semibold text-purple-900 max-w-[150px] truncate">
                    {companyFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCompanyFilter("ALL")}
                    className="text-purple-400 hover:text-purple-700 ml-0.5 p-0.5 rounded hover:bg-purple-100 cursor-pointer"
                    title="Remove company filter"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Location Badge */}
              {locationFilter !== "ALL" && (
                <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/90 text-purple-950 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                  <span className="text-purple-600">📍</span>
                  <span className="text-slate-500 font-normal">Location:</span>
                  <span className="font-semibold text-purple-900 max-w-[140px] truncate">
                    {locationFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocationFilter("ALL")}
                    className="text-purple-400 hover:text-purple-700 ml-0.5 p-0.5 rounded hover:bg-purple-100 cursor-pointer"
                    title="Remove location filter"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Desktop Results Count & Clear All Button */}
              <div className="hidden sm:flex items-center gap-2.5 ml-auto text-xs shrink-0 pl-2">
                <span className="text-slate-500 font-normal">
                  Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredApplications.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{applications.length}</strong> applications
                </span>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-purple-700 hover:text-purple-900 font-medium text-xs hover:underline cursor-pointer whitespace-nowrap"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-5 overflow-hidden space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Pending Applications
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
              Fetching pending DSA applications...
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mb-0.5">
              No Pending Applications
            </h3>
            <p className="text-xs text-slate-500 max-w-xs font-normal">
              There are currently no pending DSA verification requests waiting for review.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider font-medium bg-slate-50/80">
                    <th className="py-3 px-3">Applicant Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Mobile</th>
                    <th className="py-3 px-3">Company</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Applied On</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedApplications.map((app) => {
                    const companyName =
                      app.request_company_name || app.company_name || "N/A";
                    const locationName =
                      app.request_location || app.location_name || "N/A";

                    return (
                      <tr
                        key={app.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        {/* Applicant Name */}
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-700 shrink-0 border border-slate-200/80">
                              {app.name ? app.name.charAt(0).toUpperCase() : "D"}
                            </div>
                            <div className="min-w-0">
                              <span className="truncate max-w-[160px] block font-semibold text-slate-900">
                                {app.name || "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-3 text-slate-600 font-normal">
                          {app.email || "N/A"}
                        </td>

                        {/* Mobile */}
                        <td className="py-3.5 px-3 text-slate-700 font-mono tabular-nums">
                          {app.mobile || "N/A"}
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-3 text-slate-800 font-medium">
                          {companyName}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-3 text-slate-600 font-normal">
                          {locationName}
                        </td>

                        {/* Applied On */}
                        <td className="py-3.5 px-3 text-slate-500 font-normal tabular-nums">
                          {formatDate(app.created_at)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {app.status || "PENDING"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            title="View Application"
                            aria-label="View Application"
                            onClick={() => setSelectedRequestId(app.id)}
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
              {paginatedApplications.map((app) => {
                const companyName =
                  app.request_company_name || app.company_name || "N/A";
                const locationName =
                  app.request_location || app.location_name || "N/A";
                const status = (app.status || "PENDING").toUpperCase();
                const isPending = status === "PENDING";
                const isVerified = status === "VERIFIED";

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedRequestId(app.id)}
                    className="rounded-lg border border-slate-200/80 bg-white p-3.5 space-y-3 shadow-2xs hover:border-purple-200 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {/* Top Row: Avatar + Name & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center justify-center text-xs shrink-0 border border-purple-200/60">
                          {app.name ? app.name.charAt(0).toUpperCase() : "D"}
                        </div>
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {app.name || "N/A"}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border shrink-0 ${
                          isPending
                            ? "bg-amber-50 text-amber-700 border-amber-200/80"
                            : isVerified
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : "bg-red-50 text-red-700 border-red-200/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPending
                              ? "bg-amber-500"
                              : isVerified
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />
                        {app.status || "PENDING"}
                      </span>
                    </div>

                    {/* Middle Info Grid: 2-Columns with Clean Icons */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-100">
                      {/* Company */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">🏢</span>
                        <span className="text-slate-800 font-medium truncate">{companyName}</span>
                      </div>
                      {/* Location */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">📍</span>
                        <span className="text-slate-600 truncate">{locationName}</span>
                      </div>
                      {/* Mobile */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">📞</span>
                        <span className="text-slate-700 font-mono text-[11px] tabular-nums truncate">
                          {app.mobile || "N/A"}
                        </span>
                      </div>
                      {/* Email */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 shrink-0 text-xs">✉️</span>
                        <span className="text-slate-600 text-[11px] truncate" title={app.email || ""}>
                          {app.email || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Footer Row: Applied Date + Action Button */}
                    <div className="flex items-center justify-between pt-0.5 text-xs">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        Applied: {formatDate(app.created_at)}
                      </span>
                      <button
                        type="button"
                        title="View Application"
                        aria-label="View Application"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequestId(app.id);
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

      {/* VIEW MODAL (PHASE 2 & 3) */}
      {selectedRequestId && (
        <DSAApplicationModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onRejectSuccess={() => {
            setSelectedRequestId(null);
            fetchApplications(true);
          }}
          onVerifySuccess={() => {
            setSelectedRequestId(null);
            fetchApplications(true);
          }}
        />
      )}
    </div>
  );
}
