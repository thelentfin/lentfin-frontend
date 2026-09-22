"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supportTicketService } from "@/services/supportTicketService";

export default function MyTicketsView({
  showHeader = true,
  showBackButton = true,
  onBack = () => {},
  onRaiseNewTicket = null,
  refreshTrigger = 0,
}) {
  // Data States
  const [rawTicketsData, setRawTicketsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [issueTypeFilter, setIssueTypeFilter] = useState("ALL");

  // Filter Popover
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const addFilterRef = useRef(null);

  // Expanded Cards (Set of ticket IDs)
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  // Fetch DSA's own tickets from backend
  const fetchMyTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);

    try {
      const res = await supportTicketService.getMyTickets();

      if (res && res.status && Array.isArray(res.data)) {
        setRawTicketsData(res.data);
      } else {
        setError(res?.message || "Unable to fetch your support tickets.");
        setRawTicketsData([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load support tickets. Please try again.");
      setRawTicketsData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  // Re-fetch when header Refresh button triggers
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchMyTickets(true);
    }
  }, [refreshTrigger, fetchMyTickets]);

  // Close filter dropdown on outside click
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

  // Format Ticket Records uniformly
  const tickets = useMemo(() => {
    return rawTicketsData.map((item) => {
      const t = item.ticket || item;
      const dsa = item.dsa || {};
      const attachments = item.attachments || [];

      return {
        id: t.id,
        ticketNumber: t.ticket_number || `TIC-${t.id}`,
        caseId: t.case_id,
        category: t.category || "General Support",
        issueType: t.issue_type || "General Query",
        description: t.description || "No description provided.",
        status: (t.status || "OPEN").toUpperCase(),
        createdBy: t.created_by || dsa.name || "DSA Partner",
        closedBy: t.closed_by || null,
        closedReason: t.closed_reason || null,
        closedAt: t.closed_at || null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        attachments,
      };
    });
  }, [rawTicketsData]);

  // Unique Issue Types for filter dropdown
  const uniqueIssueTypes = useMemo(() => {
    const set = new Set();
    tickets.forEach((t) => {
      if (t.issueType && t.issueType.trim() && t.issueType !== "—") {
        set.add(t.issueType.trim());
      }
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.caseId && String(t.caseId).toLowerCase().includes(q)) ||
        t.issueType.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter.toUpperCase();

      const matchesCategory =
        categoryFilter === "ALL" ||
        t.category.toLowerCase().includes(categoryFilter.toLowerCase());

      const matchesIssue =
        issueTypeFilter === "ALL" ||
        t.issueType.toLowerCase() === issueTypeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory && matchesIssue;
    });
  }, [tickets, searchTerm, statusFilter, categoryFilter, issueTypeFilter]);

  // 5 KPI Metrics
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const customerAppCount = tickets.filter((t) =>
    t.category.toLowerCase().includes("customer")
  ).length;
  const generalSupportCount = tickets.filter((t) =>
    t.category.toLowerCase().includes("general")
  ).length;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (categoryFilter !== "ALL") count++;
    if (issueTypeFilter !== "ALL") count++;
    return count;
  }, [statusFilter, categoryFilter, issueTypeFilter]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleClearAllFilters = () => {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setIssueTypeFilter("ALL");
    setSearchTerm("");
  };

  // Toggle card expansion
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy Ticket Number to clipboard
  const handleCopyTicket = (ticketNumber, e) => {
    e?.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ticketNumber);
      setCopiedId(ticketNumber);
      toast.success(`Copied ticket #${ticketNumber} to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Date Formatting Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatCategory = (cat) => {
    if (!cat) return "General Support";
    if (cat.toLowerCase().includes("customer")) return "Customer Application";
    if (cat.toLowerCase().includes("general")) return "General Support";
    return cat
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatIssueType = (issue) => {
    if (!issue || issue === "—") return "General Query";
    return issue
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filterCategories = [
    { id: "status", label: "Ticket Status", icon: "⚡", isActive: statusFilter !== "ALL" },
    { id: "category", label: "Category", icon: "📁", isActive: categoryFilter !== "ALL" },
    { id: "issueType", label: "Issue Type", icon: "🏷️", isActive: issueTypeFilter !== "ALL" },
  ];

  const getCategoryOptions = (catId) => {
    switch (catId) {
      case "status":
        return [
          {
            label: "All Statuses",
            value: "ALL",
            isSelected: statusFilter === "ALL",
            onSelect: () => setStatusFilter("ALL"),
          },
          {
            label: "Open / In Review",
            value: "OPEN",
            isSelected: statusFilter === "OPEN",
            onSelect: () => setStatusFilter("OPEN"),
          },
          {
            label: "Resolved",
            value: "RESOLVED",
            isSelected: statusFilter === "RESOLVED",
            onSelect: () => setStatusFilter("RESOLVED"),
          },
        ];
      case "category":
        return [
          {
            label: "All Categories",
            value: "ALL",
            isSelected: categoryFilter === "ALL",
            onSelect: () => setCategoryFilter("ALL"),
          },
          {
            label: "Customer Application",
            value: "Customer",
            isSelected: categoryFilter === "Customer",
            onSelect: () => setCategoryFilter("Customer"),
          },
          {
            label: "General Support",
            value: "General",
            isSelected: categoryFilter === "General",
            onSelect: () => setCategoryFilter("General"),
          },
        ];
      case "issueType":
        return [
          {
            label: "All Issue Types",
            value: "ALL",
            isSelected: issueTypeFilter === "ALL",
            onSelect: () => setIssueTypeFilter("ALL"),
          },
          ...uniqueIssueTypes.map((issue) => ({
            label: issue,
            value: issue,
            isSelected: issueTypeFilter.toLowerCase() === issue.toLowerCase(),
            onSelect: () => setIssueTypeFilter(issue),
          })),
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
      {/* Optional Standalone Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 sm:p-5 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-8.5 items-center gap-1.5 px-3 rounded-md border border-slate-200/80 bg-white text-slate-700 hover:bg-purple-50 hover:text-[#B063FF] hover:border-purple-300 transition-colors cursor-pointer shrink-0 text-xs font-medium"
                title="Back to Support Center"
              >
                <span>←</span>
                <span>Back</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                  My Tickets
                </h1>
                <span className="rounded bg-purple-50 text-[#B063FF] border border-purple-200/80 px-2 py-0.5 text-[10px] font-medium">
                  Live Status
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                View status and horizontal lifecycle progress for all your submitted tickets.
              </p>
            </div>
          </div>

          {onRaiseNewTicket && (
            <button
              type="button"
              onClick={onRaiseNewTicket}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#B063FF] hover:bg-[#9e4def] text-white text-xs font-medium cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
            >
              <span>+</span>
              <span>Raise Ticket</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Top 5 Compact KPI Summary Cards (No Icons) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Tickets */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block truncate">
            Total Tickets
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums block mt-1">
            {isLoading ? "—" : totalCount}
          </span>
          <span className="text-[11px] font-normal text-slate-400 block mt-1 truncate">
            All submitted requests
          </span>
        </div>

        {/* Open / In Review */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-blue-600 block truncate">
            Open Requests
          </span>
          <span className="text-lg font-bold text-blue-700 tabular-nums block mt-1">
            {isLoading ? "—" : openCount}
          </span>
          <span className="text-[11px] font-normal text-slate-400 block mt-1 truncate">
            Awaiting response
          </span>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-emerald-600 block truncate">
            Resolved
          </span>
          <span className="text-lg font-bold text-emerald-700 tabular-nums block mt-1">
            {isLoading ? "—" : resolvedCount}
          </span>
          <span className="text-[11px] font-normal text-slate-400 block mt-1 truncate">
            Closed & solved
          </span>
        </div>

        {/* Customer App Tickets */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#B063FF] block truncate">
            Customer App Tickets
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums block mt-1">
            {isLoading ? "—" : customerAppCount}
          </span>
          <span className="text-[11px] font-normal text-slate-400 block mt-1 truncate">
            Loan case queries
          </span>
        </div>

        {/* General Support Tickets */}
        <div className="col-span-2 sm:col-span-1 bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-amber-600 block truncate">
            General Support Tickets
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums block mt-1">
            {isLoading ? "—" : generalSupportCount}
          </span>
          <span className="text-[11px] font-normal text-slate-400 block mt-1 truncate">
            Platform & partner queries
          </span>
        </div>
      </div>

      {/* 2. Search and Dynamic Filter Toolbar (No Expand All, No Sync button) */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-2xs">
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="flex-1 relative min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by Ticket ID, Case No, or Issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#B063FF] focus:ring-1 focus:ring-purple-400/20 transition-colors h-[38px]"
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
              <svg
                className="w-3.5 h-3.5 text-[#B063FF] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="hidden xs:inline sm:inline">Add Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#B063FF] text-white text-[10px] font-bold flex items-center justify-center">
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
                      Filter Tickets By
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
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B063FF]" />
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
                          {opt.isSelected && <span className="text-[#B063FF] font-bold">✓</span>}
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
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Active filters:</span>

              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>Status: {statusFilter === "OPEN" ? "Open" : "Resolved"}</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}

              {categoryFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>Category: {categoryFilter === "Customer" ? "Customer Application" : "General Support"}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}

              {issueTypeFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80 shadow-2xs">
                  <span>Issue: {issueTypeFilter}</span>
                  <button
                    type="button"
                    onClick={() => setIssueTypeFilter("ALL")}
                    className="hover:text-purple-950 ml-0.5 rounded-full p-0.5 text-purple-400 hover:bg-purple-100/60 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-purple-700 hover:text-purple-900 font-semibold text-xs hover:underline ml-1 cursor-pointer"
              >
                Clear all ({activeFiltersCount})
              </button>
            </div>

            <span className="text-xs text-slate-500 font-normal">
              Showing <strong className="text-slate-900 font-semibold tabular-nums">{filteredTickets.length}</strong> of <strong className="text-slate-900 font-semibold tabular-nums">{tickets.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* 3. Loading State Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-2xs space-y-2.5 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-slate-100 rounded" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchMyTickets(false)}
            className="font-semibold underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Empty State */}
      {!isLoading && !error && filteredTickets.length === 0 && (
        <div className="rounded-lg border border-slate-200/80 bg-white p-8 sm:p-14 text-center shadow-2xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-[#B063FF] mb-4 border border-purple-200/80">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>

          <h2 className="text-base font-semibold text-slate-900">
            {searchTerm || hasActiveFilters ? "No matching tickets found" : "No support tickets yet"}
          </h2>

          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search keywords or clearing active filters."
              : "Whenever you encounter an issue or have a query regarding a customer case or general assistance, raise a ticket to track it live here."}
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            {searchTerm || hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Clear Filters</span>
              </button>
            ) : (
              onRaiseNewTicket && (
                <button
                  type="button"
                  onClick={onRaiseNewTicket}
                  className="inline-flex items-center gap-2 rounded-md bg-[#B063FF] hover:bg-[#9e4def] px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <span>+</span>
                  <span>Raise Your First Ticket</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 6. EXPANDABLE CARDS WITH COMPACT HORIZONTAL PROCESS STEPPER */}
      {!isLoading && !error && filteredTickets.length > 0 && (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedIds.has(ticket.id);
            const isResolved = ticket.status === "RESOLVED";

            return (
              <div
                key={ticket.id}
                className={`rounded-lg border bg-white shadow-2xs transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "border-purple-300 ring-1 ring-purple-100"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* ── CARD HEADER (COLLAPSED STATE: CLEAN & COMPACT ON MOBILE & DESKTOP) ── */}
                <div
                  onClick={() => toggleExpand(ticket.id)}
                  className="p-3 sm:p-4 cursor-pointer select-none transition-colors hover:bg-slate-50/50"
                >
                  {/* Top Line: Ticket # with Copy (Left) & Status Badge + Chevron (Right) */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Ticket # (plus Category & Issue on desktop) */}
                    <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                      {/* Ticket Number Badge with Copy Button */}
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 shrink-0">
                        <span>#{ticket.ticketNumber}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyTicket(ticket.ticketNumber, e)}
                          title="Copy ticket number"
                          className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-colors cursor-pointer"
                        >
                          {copiedId === ticket.ticketNumber ? (
                            <span className="text-[#B063FF] text-[10px] font-bold">✓</span>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </span>

                      {/* Desktop Only: Category & Issue Type inline with Ticket # */}
                      <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                            ticket.category.toLowerCase().includes("customer")
                              ? "bg-purple-50 text-purple-800 border-purple-200/70"
                              : "bg-slate-50 text-slate-700 border-slate-200/80"
                          }`}
                        >
                          <span>{formatCategory(ticket.category)}</span>
                          {ticket.caseId && (
                            <span className="font-semibold text-purple-900 font-mono">
                              • Case #{ticket.caseId}
                            </span>
                          )}
                        </span>

                        <span className="inline-flex items-center text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 shrink-0 truncate max-w-[180px]">
                          {formatIssueType(ticket.issueType)}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Date (desktop), Status Badge, Expand Toggle Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-[11px] text-slate-400 font-normal tabular-nums">
                        {formatDate(ticket.createdAt)}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-tight shrink-0 ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-amber-50 text-amber-800 border border-amber-200/80"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isResolved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span>{isResolved ? "Resolved" : "In Progress"}</span>
                      </span>

                      {/* Expand / Collapse Chevron */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(ticket.id);
                        }}
                        className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-transform duration-200 cursor-pointer ${
                          isExpanded ? "rotate-180 text-purple-600 bg-purple-50" : ""
                        }`}
                        title={isExpanded ? "Collapse Status Process" : "View Status Process"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Row 2: Category, Issue Type & Date (Mobile only in 1 tight row) */}
                  <div className="flex sm:hidden items-center justify-between gap-1.5 mt-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                          ticket.category.toLowerCase().includes("customer")
                            ? "bg-purple-50 text-purple-800 border-purple-200/70"
                            : "bg-slate-50 text-slate-700 border-slate-200/80"
                        }`}
                      >
                        <span>{formatCategory(ticket.category)}</span>
                        {ticket.caseId && (
                          <span className="font-semibold text-purple-900 font-mono">
                            • #{ticket.caseId}
                          </span>
                        )}
                      </span>

                      <span className="inline-flex items-center text-[10px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 shrink-0 truncate max-w-[140px]">
                        {formatIssueType(ticket.issueType)}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-normal tabular-nums shrink-0 ml-auto">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-slate-600 mt-2 font-normal leading-relaxed line-clamp-2">
                    {ticket.description}
                  </p>

                  {/* Attached Files (Clean, compact chips) */}
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
                      {ticket.attachments.map((file, idx) => (
                        <a
                          key={file.id || idx}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 text-[10px] sm:text-[11px] border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          <span>📎</span>
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">
                            {file.file_name || `File ${idx + 1}`}
                          </span>
                          <span className="text-purple-600 text-[10px]">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── EXPANDED: COMPACT HORIZONTAL PROCESS STEPPER ONLY ── */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 bg-slate-50/60 px-3 py-3 sm:px-6 sm:py-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between max-w-lg sm:max-w-xl mx-auto py-1">
                      {/* Step 1: Ticket Created */}
                      <div className="flex flex-col items-center text-center shrink-0 min-w-[72px] sm:min-w-[100px]">
                        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs mb-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-900 leading-tight">
                          Ticket Created
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal tabular-nums mt-0.5">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </div>

                      {/* Connector Line 1 */}
                      <div
                        className={`h-0.5 flex-1 mx-1.5 sm:mx-4 mb-3.5 transition-colors ${
                          isResolved ? "bg-emerald-400" : "bg-amber-300"
                        }`}
                      />

                      {/* Step 2: Admin Resolve / In Progress */}
                      <div className="flex flex-col items-center text-center shrink-0 min-w-[72px] sm:min-w-[100px]">
                        <div
                          className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-white shadow-2xs mb-1 ${
                            isResolved
                              ? "bg-emerald-500"
                              : "bg-amber-500 ring-3 ring-amber-100 animate-pulse"
                          }`}
                        >
                          {isResolved ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-900 leading-tight">
                          {isResolved ? "Admin Resolved" : "In Progress"}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal tabular-nums mt-0.5">
                          {isResolved ? formatDate(ticket.closedAt || ticket.updatedAt) : "Under Review"}
                        </span>
                      </div>

                      {/* Connector Line 2 */}
                      <div
                        className={`h-0.5 flex-1 mx-1.5 sm:mx-4 mb-3.5 transition-colors ${
                          isResolved ? "bg-emerald-400" : "bg-slate-200"
                        }`}
                      />

                      {/* Step 3: Ticket Closed */}
                      <div className="flex flex-col items-center text-center shrink-0 min-w-[72px] sm:min-w-[100px]">
                        <div
                          className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-white shadow-2xs mb-1 ${
                            isResolved ? "bg-emerald-500" : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {isResolved ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                          )}
                        </div>
                        <span className={`text-[11px] sm:text-xs font-semibold leading-tight ${isResolved ? "text-slate-900" : "text-slate-400"}`}>
                          Ticket Closed
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal tabular-nums mt-0.5">
                          {isResolved ? "Closed" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
