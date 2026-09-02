"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { bankApiService } from "@/services/bankApiService";

export default function BankMasterSettings({ onBack = () => {} }) {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [viewingBank, setViewingBank] = useState(null);
  const [deletingBank, setDeletingBank] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({ bank_name: "", status: "Active" });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show Toast Notification using Sonner
  const showToast = (message, type = "success") => {
    if (type === "error") {
      sonnerToast.error(message);
    } else {
      sonnerToast.success(message);
    }
  };

  // Fetch Bank List from Backend
  const loadBanks = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await bankApiService.getBanks();
    if (res && res.status) {
      setBanks(res.data || []);
    } else {
      setErrorMsg(res?.message || "Failed to load banks from server.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  // Handle Add Bank Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.bank_name || !formData.bank_name.trim()) {
      setFormError("Bank name is required.");
      return;
    }

    setIsSubmitting(true);
    const res = await bankApiService.addBank({ bank_name: formData.bank_name.trim() });
    setIsSubmitting(false);

    if (res && res.status) {
      showToast(res.message || "Bank added successfully!", "success");
      setIsAddModalOpen(false);
      setFormData({ bank_name: "", status: "Active" });
      loadBanks();
    } else {
      setFormError(res?.message || "Failed to add bank.");
    }
  };

  // Handle Edit Bank Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.bank_name || !formData.bank_name.trim()) {
      setFormError("Bank name is required.");
      return;
    }

    setIsSubmitting(true);
    const res = await bankApiService.updateBank(editingBank.id, {
      bank_name: formData.bank_name.trim(),
      status: formData.status,
    });
    setIsSubmitting(false);

    if (res && res.status) {
      showToast(res.message || "Bank updated successfully!", "success");
      setEditingBank(null);
      setFormData({ bank_name: "", status: "Active" });
      loadBanks();
    } else {
      setFormError(res?.message || "Failed to update bank.");
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (bank) => {
    const nextStatus = bank.status === "Active" ? "Inactive" : "Active";

    // Optimistic UI Update
    setBanks((prev) =>
      prev.map((b) => (b.id === bank.id ? { ...b, status: nextStatus } : b))
    );

    const res = await bankApiService.updateBank(bank.id, {
      bank_name: bank.bank_name,
      status: nextStatus,
    });

    if (res && res.status) {
      showToast(`Bank status changed to ${nextStatus}`, "success");
    } else {
      // Rollback on failure
      setBanks((prev) =>
        prev.map((b) => (b.id === bank.id ? { ...b, status: bank.status } : b))
      );
      showToast(res?.message || "Failed to update status", "error");
    }
  };

  // Handle Delete Bank Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingBank) return;
    setIsSubmitting(true);
    const res = await bankApiService.deleteBank(deletingBank.id);
    setIsSubmitting(false);

    if (res && res.status) {
      showToast(res.message || "Bank deleted successfully!", "success");
      setDeletingBank(null);
      loadBanks();
    } else {
      showToast(res?.message || "Failed to delete bank.", "error");
      setDeletingBank(null);
    }
  };

  // Filtered & Searched Banks List
  const filteredBanks = banks.filter((b) => {
    const matchesSearch =
      !searchTerm ||
      (b.bank_name || "").toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesStatus =
      statusFilter === "ALL" ||
      (b.status || "").toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalCount = filteredBanks.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(currentPage * pageSize, totalCount);
  const paginatedBanks = filteredBanks.slice(startIndex, startIndex + pageSize);

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const activeCount = banks.filter((b) => b.status === "Active").length;
  const inactiveCount = banks.filter((b) => b.status === "Inactive").length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 text-xs"
            title="Back to Settings"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                Bank Master
              </h2>
              <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 tabular-nums">
                {banks.length} Total
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              Manage lending banks available for customer loan applications.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({ bank_name: "", status: "Active" });
            setFormError("");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-md btn-primary px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Add Bank</span>
        </button>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Banks</p>
            <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{banks.length}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600 border border-slate-200/80 font-medium text-sm">
            🏦
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Active Banks</p>
            <p className="text-xl font-semibold text-emerald-700 mt-1 tabular-nums">{activeCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium text-sm">
            ✓
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Inactive Banks</p>
            <p className="text-xl font-semibold text-amber-700 mt-1 tabular-nums">{inactiveCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-50 text-amber-700 border border-amber-200/80 font-medium text-sm">
            ⏸
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200/80">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search bank name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md w-full sm:w-auto">
          {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-white text-slate-900 border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {st === "ALL" ? "All Status" : st === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card Surface */}
      <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-normal text-xs space-y-2">
            <div className="inline-block w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-1" />
            <p>Loading Bank Master records...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-10 text-center text-xs text-red-600 font-normal space-y-2 bg-red-50/40">
            <p>⚠️ {errorMsg}</p>
            <button
              type="button"
              onClick={loadBanks}
              className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : paginatedBanks.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-500 text-lg">
              🏦
            </div>
            <h3 className="text-xs font-semibold text-slate-900">No banks found</h3>
            <p className="text-xs text-slate-500 font-normal">
              {searchTerm || statusFilter !== "ALL"
                ? "No bank records match your search or filter criteria."
                : "No lending banks registered yet in the system."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setFormData({ bank_name: "", status: "Active" });
                setIsAddModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md btn-primary px-3.5 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              + Add Bank
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Bank Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBanks.map((bank) => {
                    const isActive = bank.status === "Active";

                    return (
                      <tr key={bank.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Bank Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 border border-slate-200/80 font-medium shrink-0 text-xs">
                              🏦
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-xs">
                                {bank.bank_name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              title={isActive ? "Deactivate Bank" : "Activate Bank"}
                              onClick={() => handleToggleStatus(bank)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-slate-100 ${
                                isActive ? "bg-slate-900" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  isActive ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-normal tabular-nums">
                          {formatDate(bank.created_at)}
                        </td>

                        {/* Last Updated */}
                        <td className="py-3.5 px-4 text-slate-500 font-normal tabular-nums">
                          {formatDate(bank.updated_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Button */}
                            <button
                              type="button"
                              title="View Bank Details"
                              onClick={() => setViewingBank(bank)}
                              className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              title="Edit Bank"
                              onClick={() => {
                                setEditingBank(bank);
                                setFormData({ bank_name: bank.bank_name, status: bank.status || "Active" });
                                setFormError("");
                              }}
                              className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition-colors cursor-pointer text-xs"
                            >
                              ✏️
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              title="Delete Bank"
                              onClick={() => setDeletingBank(bank)}
                              className="p-1 rounded bg-white hover:bg-red-50 border border-slate-200/80 text-red-600 transition-colors cursor-pointer text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden p-3.5 space-y-2.5">
              {paginatedBanks.map((bank) => {
                const isActive = bank.status === "Active";

                return (
                  <div
                    key={bank.id}
                    className="rounded-md border border-slate-200/80 bg-white p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🏦</span>
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {bank.bank_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          title={isActive ? "Deactivate Bank" : "Activate Bank"}
                          onClick={() => handleToggleStatus(bank)}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                              isActive ? "translate-x-3.5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className={`text-[11px] font-medium ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                          {bank.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-normal tabular-nums">
                      <span>Created: {formatDate(bank.created_at)}</span>
                      <span>Updated: {formatDate(bank.updated_at)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingBank(bank)}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBank(bank);
                          setFormData({ bank_name: bank.bank_name, status: bank.status || "Active" });
                          setFormError("");
                        }}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBank(bank)}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-xs font-medium text-red-600 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="pt-3 px-4 pb-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-medium rounded-md px-2 py-1 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="text-slate-500 font-medium text-center">
                Showing <span className="font-semibold text-slate-900 tabular-nums">{totalCount === 0 ? 0 : startIndex + 1}–{endIndex}</span> of <span className="font-semibold text-slate-900 tabular-nums">{totalCount}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="px-2 font-medium text-slate-700 tabular-nums">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── ADD BANK MODAL ────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md rounded-lg bg-white border border-slate-200/80 shadow-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-white">
              <h3 className="text-sm font-semibold text-slate-900">Add New Bank</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs font-normal">
                  ⚠️ {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
                <p className="text-[11px] text-slate-400 font-normal">
                  This bank name will appear in DSA loan application options.
                </p>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? "Saving..." : "Add Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT BANK MODAL ───────────────────────────────────────────────── */}
      {editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md rounded-lg bg-white border border-slate-200/80 shadow-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-white">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Edit Bank Details</h3>
                <p className="text-[10px] text-slate-400 font-normal">Update master bank information</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBank(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs font-normal">
                  ⚠️ {formError}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setEditingBank(null)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? "Updating..." : "Update Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW BANK DETAILS MODAL ───────────────────────────────────────── */}
      {viewingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md rounded-lg bg-white border border-slate-200/80 shadow-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-white">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bank Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingBank(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Bank Name</span>
                <span className="text-sm font-semibold text-slate-900 block mt-0.5">{viewingBank.bank_name}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border mt-1 ${
                      viewingBank.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-amber-50 text-amber-700 border-amber-200/80"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${viewingBank.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {viewingBank.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Category</span>
                  <span className="text-xs font-medium text-slate-900 block mt-1">Master Bank</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Created At</span>
                  <span className="font-normal text-slate-700 block mt-0.5 tabular-nums">{formatDate(viewingBank.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Last Updated</span>
                  <span className="font-normal text-slate-700 block mt-0.5 tabular-nums">{formatDate(viewingBank.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-5 py-3 border-t border-slate-200/80 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewingBank(null)}
                className="px-4 py-1.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {deletingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-lg bg-white border border-slate-200/80 shadow-lg p-5 space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600 text-base font-semibold border border-red-200/80">
              🗑️
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Delete Bank?</h3>
              <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingBank.bank_name}</span>? Existing customer applications referencing this bank may be affected.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setDeletingBank(null)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-md bg-red-600 text-xs font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                {isSubmitting ? "Deleting..." : "Delete Bank"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
