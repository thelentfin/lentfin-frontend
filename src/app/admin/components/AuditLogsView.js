"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { exportAuditLogsToExcel } from "./auditLogsExcelExport";
import { customerApiService } from "@/services/customerApiService";

// Realistic demonstration logs representing key operations across the platform
const INITIAL_DEMO_LOGS = [
  {
    id: "LOG-10492",
    timestamp: "2026-10-23T15:20:00.000Z",
    actorName: "Rajesh Varma",
    actorRole: "Admin",
    actionType: "BANK_STATUS_UPDATED",
    module: "Bank Master",
    entity: "Axis Bank",
    entityId: "BANK-04",
    summary: "Changed Axis Bank operational status from Active to Inactive.",
    details: "Temporarily disabled for Q3 rate slab reconciliation. No new applications can be routed until re-activated.",
    changes: {
      field: "status",
      previousValue: "ACTIVE",
      newValue: "INACTIVE",
    },
    ipAddress: "192.168.1.14",
  },
  {
    id: "LOG-10491",
    timestamp: "2026-10-23T14:48:00.000Z",
    actorName: "Super Admin",
    actorRole: "Admin",
    actionType: "INFLOW_RECORDED",
    module: "Settlements & Ledger",
    entity: "Case #CASE-000020",
    entityId: "CASE-000020",
    summary: "Recorded corporate recovery inflow tranche of ₹25,000 for Case #CASE-000020 (Lakhan Bhai).",
    details: "Payment Channel: NEFT Bank Transfer • UTR: AXIS982736192 • Remaining balance updated to ₹0 (Fully Cleared).",
    changes: {
      field: "corporate_received_amount",
      previousValue: "₹0.00",
      newValue: "₹25,000.00",
    },
    ipAddress: "192.168.1.8",
  },
  {
    id: "LOG-10490",
    timestamp: "2026-10-23T13:30:00.000Z",
    actorName: "Pooja Mehta",
    actorRole: "Admin",
    actionType: "CASE_STATUS_CHANGED",
    module: "Customer Applications",
    entity: "Case #CASE-000020",
    entityId: "CASE-000020",
    summary: "Approved Car Loan application for Lakhan Bhai and verified disbursement documents.",
    details: "Sanctioned Amount: ₹6,50,000 • Margin: 1.15%.",
    changes: {
      field: "status",
      previousValue: "UNDER_REVIEW",
      newValue: "APPROVED",
    },
    ipAddress: "192.168.1.22",
  },
  {
    id: "LOG-10489",
    timestamp: "2026-10-23T11:15:00.000Z",
    actorName: "Rajesh Varma",
    actorRole: "Admin",
    actionType: "PAYOUT_SLAB_MODIFIED",
    module: "Product Master",
    entity: "HDFC Personal Loan",
    entityId: "PROD-HDFC-PL",
    summary: "Updated DSA Standard commission slab for HDFC Bank Personal Loans from 0.85% to 0.90%.",
    details: "Applied to all future applications submitted under standard payout cycles.",
    changes: {
      field: "payout_percentage",
      previousValue: "0.85%",
      newValue: "0.90%",
    },
    ipAddress: "192.168.1.14",
  },
  {
    id: "LOG-10488",
    timestamp: "2026-10-23T09:40:00.000Z",
    actorName: "Super Admin",
    actorRole: "Admin",
    actionType: "DSA_APPROVED",
    module: "DSA Management",
    entity: "Sharma Financial Services",
    entityId: "DSA-0104",
    summary: "Approved Master DSA partner onboarding request for Sharma Financial Services.",
    details: "Credentials dispatched via SMS and registered email. Allocated code: DSA-SHR-04.",
    changes: {
      field: "dsa_status",
      previousValue: "PENDING_APPROVAL",
      newValue: "ACTIVE",
    },
    ipAddress: "192.168.1.8",
  },
  {
    id: "LOG-10487",
    timestamp: "2026-10-22T17:10:00.000Z",
    actorName: "Vikas Patel",
    actorRole: "DSA Partner",
    actionType: "APPLICATION_SUBMITTED",
    module: "Customer Applications",
    entity: "Case #CASE-000033",
    entityId: "CASE-000033",
    summary: "Submitted new General Loan file for customer Ramesh Soni (Requested: ₹7,50,000).",
    details: "Bank Partner: ICICI Bank • Sub-DSA: Jayesh Shah (0.75% share).",
    changes: {
      field: "application_stage",
      previousValue: "DRAFT",
      newValue: "SUBMITTED",
    },
    ipAddress: "49.36.128.45",
  },
  {
    id: "LOG-10486",
    timestamp: "2026-10-22T14:05:00.000Z",
    actorName: "Rajesh Varma",
    actorRole: "Admin",
    actionType: "COMPANY_LOCATION_ADDED",
    module: "Settings",
    entity: "Tata Motors Corporate Hub",
    entityId: "CORP-018",
    summary: "Added new corporate dealer branch: Tata Motors Corporate Hub, Ahmedabad.",
    details: "Tagged to Western Zone Car Loan disbursement network.",
    changes: {
      field: "company_name",
      previousValue: "—",
      newValue: "Tata Motors Corporate Hub",
    },
    ipAddress: "192.168.1.14",
  },
  {
    id: "LOG-10485",
    timestamp: "2026-10-21T16:20:00.000Z",
    actorName: "Super Admin",
    actorRole: "Admin",
    actionType: "DSA_PAYOUT_RELEASED",
    module: "Settlements & Ledger",
    entity: "DSA Payout #PAY-0081",
    entityId: "PAY-0081",
    summary: "Marked DSA commission payout as PAID for Case #CASE-000028 (₹4,500).",
    details: "Transferred to Bank of Baroda A/c **4910 • Split: Master DSA ₹3,500, Sub-DSA ₹1,000.",
    changes: {
      field: "payout_status",
      previousValue: "PENDING",
      newValue: "PAID",
    },
    ipAddress: "192.168.1.8",
  },
  {
    id: "LOG-10484",
    timestamp: "2026-10-20T11:45:00.000Z",
    actorName: "Pooja Mehta",
    actorRole: "Admin",
    actionType: "TICKET_RESOLVED",
    module: "Support Tickets",
    entity: "Ticket #TCK-1092",
    entityId: "TCK-1092",
    summary: "Resolved query raised by DSA Amit Kumar regarding disbursement document re-upload.",
    details: "Resolution comment: 'Updated PAN card copy verified and unlocked in file vault.'",
    changes: {
      field: "ticket_status",
      previousValue: "OPEN",
      newValue: "RESOLVED",
    },
    ipAddress: "192.168.1.22",
  },
];

export default function AuditLogsView() {
  const [logs, setLogs] = useState(INITIAL_DEMO_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = today, -1 = yesterday, etc.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [excelStage, setExcelStage] = useState("idle");

  // Helper date utilities
  const getTargetDate = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatHumanDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Category Visual Styling (Left border accent, square icon, and tag styling - NO PILLS)
  const getActionVisuals = (module, actionType) => {
    const act = (actionType || "").toUpperCase();
    const mod = (module || "").toUpperCase();

    // 1. Authentication & Session
    if (mod.includes("AUTH") || act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("SESSION")) {
      return {
        borderAccent: "border-l-blue-500",
        iconBg: "bg-blue-50 text-blue-600 border border-blue-200/80",
        tagBg: "bg-blue-50 text-blue-700 border border-blue-200/60",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      };
    }

    // 2. Financial & Settlements & Disbursements
    if (mod.includes("SETTLEMENT") || mod.includes("LEDGER") || act.includes("PAYOUT") || act.includes("DISBURSE")) {
      return {
        borderAccent: "border-l-emerald-500",
        iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
        tagBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    // 3. Approvals / Verification
    if (act.includes("APPROVED") || act.includes("ACCEPTED") || act.includes("VERIFIED")) {
      return {
        borderAccent: "border-l-emerald-500",
        iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
        tagBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    // 4. Rejections / Deletions / Inactive
    if (act.includes("REJECT") || act.includes("DELETE") || act.includes("INACTIVE")) {
      return {
        borderAccent: "border-l-rose-500",
        iconBg: "bg-rose-50 text-rose-600 border border-rose-200/80",
        tagBg: "bg-rose-50 text-rose-700 border border-rose-200/60",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    // 5. Support Tickets
    if (mod.includes("SUPPORT") || mod.includes("TICKET")) {
      return {
        borderAccent: "border-l-amber-500",
        iconBg: "bg-amber-50 text-amber-600 border border-amber-200/80",
        tagBg: "bg-amber-50 text-amber-700 border border-amber-200/60",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        ),
      };
    }

    // 6. Bank / Product / Master / Settings (Brand Purple #B063FF)
    return {
      borderAccent: "border-l-[#B063FF]",
      iconBg: "bg-[#B063FF]/10 text-[#B063FF] border border-[#B063FF]/20",
      tagBg: "bg-[#B063FF]/5 text-[#9138E8] border border-[#B063FF]/25",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    };
  };

  // Dynamic header title for current activity view
  const headerTitle = useMemo(() => {
    if (fromDate && toDate) {
      return `Activity from ${formatHumanDate(new Date(fromDate))} to ${formatHumanDate(new Date(toDate))}`;
    }
    if (fromDate) {
      return `Activity from ${formatHumanDate(new Date(fromDate))}`;
    }
    if (toDate) {
      return `Activity until ${formatHumanDate(new Date(toDate))}`;
    }
    if (selectedDayOffset === 0) {
      return "Today's Activity";
    }
    const targetDate = getTargetDate(selectedDayOffset);
    if (selectedDayOffset === -1) {
      return `Yesterday (${formatHumanDate(targetDate)})`;
    }
    return formatHumanDate(targetDate);
  }, [fromDate, toDate, selectedDayOffset]);

  // Fetch audit logs matching exact AdminSettlementsHub smooth-spin pattern
  const fetchData = useCallback(
    async (isRefresh = false) => {
      const startTime = Date.now();
      if (isRefresh) {
        setIsSyncing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        let params = {
          search: searchQuery,
          module: selectedModule,
          role: selectedRole,
        };

        if (fromDate || toDate) {
          if (fromDate) params.fromDate = fromDate;
          if (toDate) params.toDate = toDate;
        } else if (selectedDayOffset !== null) {
          const targetDay = formatDateForInput(getTargetDate(selectedDayOffset));
          params.fromDate = targetDay;
          params.toDate = targetDay;
        }

        const res = await customerApiService.fetchAuditLogs(params);

        if (res && res.status && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((item) => ({
            id: `LOG-${item.id}`,
            timestamp: item.created_at,
            actorName: item.actor_name,
            actorRole: item.actor_role === "admin" ? "Admin" : item.actor_role?.toUpperCase() === "DSA" ? "DSA Partner" : item.actor_role,
            actionType: item.action_type,
            module: item.module,
            entity: item.entity_name || item.entity_id || "System",
            entityId: item.entity_id,
            summary: item.summary,
            details: item.details,
            changes: {
              field: item.action_type,
              previousValue: item.previous_value || "—",
              newValue: item.new_value || "—",
            },
            ipAddress: item.ip_address || "127.0.0.1",
          }));
          setLogs(mapped);
        }
      } catch (e) {
        console.error("fetchLiveLogs error:", e);
      } finally {
        // Smooth minimum spin duration of 800ms identical to Settlements Hub
        if (isRefresh) {
          const elapsed = Date.now() - startTime;
          if (elapsed < 800) {
            await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
          }
        }
        setIsInitialLoading(false);
        setIsSyncing(false);
      }
    },
    [searchQuery, selectedModule, selectedRole, selectedDayOffset, fromDate, toDate]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Format Date & Time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          log.actorName?.toLowerCase().includes(q) ||
          log.entity?.toLowerCase().includes(q) ||
          log.summary?.toLowerCase().includes(q) ||
          log.details?.toLowerCase().includes(q) ||
          log.actionType?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Module Filter
      if (selectedModule !== "ALL" && log.module !== selectedModule) {
        return false;
      }

      // 3. Role Filter
      if (selectedRole !== "ALL" && log.actorRole !== selectedRole) {
        return false;
      }

      // 4. Date Filtering (Day stepping or custom range)
      if (fromDate || toDate) {
        const logDate = new Date(log.timestamp);
        if (fromDate && logDate < new Date(`${fromDate}T00:00:00`)) return false;
        if (toDate && logDate > new Date(`${toDate}T23:59:59`)) return false;
      } else if (selectedDayOffset !== null) {
        const targetDate = getTargetDate(selectedDayOffset);
        const logDate = new Date(log.timestamp);
        if (logDate.toDateString() !== targetDate.toDateString()) return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedModule, selectedRole, selectedDayOffset, fromDate, toDate]);

  // Handle stepping back day-by-day
  const handlePreviousDay = () => {
    setFromDate("");
    setToDate("");
    setSelectedDayOffset((prev) => (prev === null ? -1 : prev - 1));
  };

  // Handle stepping forward day-by-day
  const handleNextDay = () => {
    if (selectedDayOffset !== null && selectedDayOffset < 0) {
      setFromDate("");
      setToDate("");
      setSelectedDayOffset((prev) => prev + 1);
    }
  };

  // Handle custom date range change
  const handleCustomDateChange = (type, val) => {
    setSelectedDayOffset(null);
    if (type === "from") setFromDate(val);
    if (type === "to") setToDate(val);
  };

  // Clear custom date range and return to Today
  const clearCustomDateRange = () => {
    setFromDate("");
    setToDate("");
    setSelectedDayOffset(0);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setExcelStage("gathering");
    try {
      await exportAuditLogsToExcel({
        logs: filteredLogs,
        filterModule: selectedModule,
        filterRole: selectedRole,
      });

      setExcelStage("ready");
      setTimeout(() => setExcelStage("idle"), 1500);
    } catch (err) {
      console.error("Failed to export audit logs to Excel:", err);
      setExcelStage("idle");
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1 sm:px-1.5 pt-1 pb-3 sm:pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Audit &amp; Activity Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chronological audit trail of administrative, partner, and financial actions across the platform.
          </p>
        </div>

        {/* Action Controls: Export Excel & Sync Button (matching Settlements & Ledger) */}
        <div className="flex items-center gap-2.5">
          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={excelStage !== "idle" || filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 disabled:opacity-75 transition-all shadow-2xs cursor-pointer shrink-0"
            title="Export Audit Logs to Excel"
          >
            {excelStage === "gathering" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Exporting...</span>
              </>
            ) : excelStage === "ready" ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ✓
                </span>
                <span>Downloaded!</span>
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

          {/* Sync Button (Smooth Spin, Stabilized Width matching Settlements Hub) */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 w-[76px] px-2.5 py-2 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs hover:shadow transition-all disabled:opacity-70 cursor-pointer"
            title="Sync Audit Logs"
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

      {/* Top Filter Row: Search & Dropdowns on Left | Date Range on Right (No pills, no card wrappers) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Left Section: Search & Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operator, case, bank, action..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] shadow-2xs"
            />
            <svg
              className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#B063FF] shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            <option value="Authentication">Authentication</option>
            <option value="Bank Master">Bank Master</option>
            <option value="Product Master">Product Master</option>
            <option value="Customer Applications">Customer Applications</option>
            <option value="Settlements & Ledger">Settlements &amp; Ledger</option>
            <option value="DSA Management">DSA Management</option>
            <option value="Support Tickets">Support Tickets</option>
            <option value="Settings">Settings</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#B063FF] shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="DSA Partner">DSA Partner</option>
          </select>
        </div>

        {/* Right Section: Clean Date Range Inputs */}
        <div className="flex items-center gap-1.5 justify-end">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleCustomDateChange("from", e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              title="From Date"
            />
          </div>

          <span className="text-slate-400 text-xs font-medium">to</span>

          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleCustomDateChange("to", e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              title="To Date"
            />
          </div>

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={clearCustomDateRange}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs cursor-pointer font-medium transition-colors"
              title="Clear Date Range"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar: Left = Dynamic Heading & Count | Right (under Date Range) = Reset Filter + Calendar Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600 px-0.5 pt-0.5">
        {/* Left: Dynamic Activity Label + Count */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800">{headerTitle}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Showing {filteredLogs.length} activity {filteredLogs.length === 1 ? "record" : "records"}
          </span>
        </div>

        {/* Right: Reset All Filters (left of previous day button) + Compact Calendar Stepper (under date range) */}
        <div className="flex items-center gap-2.5 justify-end">
          {(searchQuery || selectedModule !== "ALL" || selectedRole !== "ALL" || selectedDayOffset !== 0 || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedModule("ALL");
                setSelectedRole("ALL");
                clearCustomDateRange();
              }}
              className="text-[#B063FF] hover:underline cursor-pointer text-xs font-medium"
            >
              Reset all filters
            </button>
          )}

          {/* Plain Previous Day & Next Day Navigation Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handlePreviousDay}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded transition-colors cursor-pointer font-medium"
              title="Previous Day Activity"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous Day</span>
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDayOffset === null || selectedDayOffset >= 0}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer font-medium"
              title={selectedDayOffset >= 0 ? "Already on Today" : "Next Day Activity"}
            >
              <span>Next Day</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Action Cards List (Enhanced enterprise cards with color accents and clear hierarchy - NO PILLS) */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200/80 rounded-lg text-xs">
            No audit log entries match your filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const visuals = getActionVisuals(log.module, log.actionType);

            return (
              <div
                key={log.id}
                className={`bg-white border border-slate-200/80 ${visuals.borderAccent} border-l-[3.5px] rounded-lg p-3 sm:p-3.5`}
              >
                <div className="flex items-start gap-3">
                  {/* Square Action Icon Badge (rounded-lg, NO PILL) */}
                  <div className={`w-8 h-8 rounded-lg ${visuals.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    {visuals.icon}
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 min-w-0">
                    {/* Top Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Operator Avatar + Name */}
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(log.actorName || "U").charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-900">{log.actorName}</span>
                          <span className="text-slate-400 text-[10px]">({log.actorRole})</span>
                        </div>

                        <span className="text-slate-300">•</span>

                        {/* Module Tag (rounded-md, NO PILL) */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider ${visuals.tagBg}`}>
                          {log.module}
                        </span>

                        {/* Action Type Code Tag */}
                        {log.actionType && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/60 hidden sm:inline-block">
                            {log.actionType}
                          </span>
                        )}
                      </div>

                      {/* Right: Timestamp & Details Toggle Button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-slate-400 text-[11px]">
                          {formatDateTime(log.timestamp)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Summary Headline */}
                    <p className="text-xs text-slate-900 font-semibold mt-1.5 leading-snug">
                      {log.summary}
                    </p>

                    {/* Context / Secondary Details */}
                    {log.details && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {log.details}
                      </p>
                    )}

                    {/* Target Entity Tag */}
                    {log.entity && log.entity !== "System" && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Target:</span>
                        <span className="font-medium text-slate-700 bg-slate-100/70 border border-slate-200/70 px-1.5 py-0.5 rounded-md text-[11px]">
                          {log.entity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Clean Diff Box */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] space-y-2.5 sm:pl-11">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-mono">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                        <span className="text-slate-400 block text-[10px] font-sans font-semibold uppercase tracking-wider mb-1">
                          Previous Value
                        </span>
                        <span className="text-slate-700 font-medium break-all">
                          {log.changes?.previousValue || "—"}
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg p-2.5">
                        <span className="text-emerald-700 block text-[10px] font-sans font-semibold uppercase tracking-wider mb-1">
                          Updated Value
                        </span>
                        <span className="text-emerald-900 font-bold break-all">
                          {log.changes?.newValue || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono px-0.5 pt-0.5">
                      <span>Log ID: {log.id}</span>
                      <span>IP Address: {log.ipAddress || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
