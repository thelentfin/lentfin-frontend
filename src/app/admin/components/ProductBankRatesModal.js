"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { productPayoutService } from "@/services/productPayoutService";

export default function ProductBankRatesModal({ product, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [sortBy, setSortBy] = useState("NAME_ASC"); // NAME_ASC, RATE_DESC, RATE_ASC, NAME_DESC
  const [editingBankId, setEditingBankId] = useState(null);
  const [editRateInput, setEditRateInput] = useState("");
  const [editLabelInput, setEditLabelInput] = useState("Standard");
  const [isSaving, setIsSaving] = useState(false);

  const loadRates = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    const res = await productPayoutService.getProductBankRates(product.id);
    if (res && res.status) {
      setBanks(res.data || []);
    } else {
      toast.error(res?.message || "Failed to load bank rates for product.");
    }
    setLoading(false);
  }, [product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadRates();
      setSearchTerm("");
      setStatusFilter("ALL");
      setEditingBankId(null);
    }
  }, [isOpen, product?.id, loadRates]);

  if (!isOpen || !product) return null;

  // Toggle option status for a bank
  const handleToggleOptionStatus = async (bankObj, option) => {
    const nextStatus = option.status === "Active" ? "Inactive" : "Active";
    const res = await productPayoutService.updatePayoutOption(option.id, {
      status: nextStatus,
    });

    if (res && res.status) {
      toast.success(`${bankObj.bank_name} set to ${nextStatus}`);
      setBanks((prev) =>
        prev.map((b) => {
          if (b.bank_id !== bankObj.bank_id) return b;
          const updatedOptions = b.options.map((opt) =>
            opt.id === option.id ? { ...opt, status: nextStatus } : opt
          );
          return {
            ...b,
            options: updatedOptions,
            has_active_option: updatedOptions.some((o) => o.status === "Active"),
          };
        })
      );
    } else {
      toast.error(res?.message || "Failed to update status.");
    }
  };

  // Start editing rate for a bank
  const handleStartEdit = (bankObj, option) => {
    setEditingBankId(bankObj.bank_id);
    setEditRateInput(option ? String(option.payout_percentage) : "0.00");
    setEditLabelInput(option?.option_label || "Standard");
  };

  // Save edited rate
  const handleSaveRate = async (bankObj, option) => {
    const rateNum = parseFloat(editRateInput);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error("Please enter a valid non-negative payout rate.");
      return;
    }

    setIsSaving(true);
    try {
      if (option && option.id) {
        // Update existing option
        const res = await productPayoutService.updatePayoutOption(option.id, {
          payout_percentage: rateNum,
          option_label: editLabelInput.trim() || "Standard",
        });

        if (res && res.status) {
          toast.success(`Updated ${bankObj.bank_name} rate to ${rateNum}%`);
          setBanks((prev) =>
            prev.map((b) => {
              if (b.bank_id !== bankObj.bank_id) return b;
              return {
                ...b,
                highest_rate: rateNum,
                options: b.options.map((opt) =>
                  opt.id === option.id
                    ? {
                        ...opt,
                        payout_percentage: rateNum,
                        option_label: editLabelInput.trim() || "Standard",
                      }
                    : opt
                ),
              };
            })
          );
          setEditingBankId(null);
        } else {
          toast.error(res?.message || "Failed to update rate.");
        }
      } else {
        // Add new option if none existed
        const res = await productPayoutService.addPayoutOption({
          bank_id: bankObj.bank_id,
          product_id: product.id,
          option_label: editLabelInput.trim() || "Standard",
          payout_percentage: rateNum,
          status: "Active",
        });

        if (res && res.status) {
          toast.success(`Added ${bankObj.bank_name} rate at ${rateNum}%`);
          await loadRates();
          setEditingBankId(null);
        } else {
          toast.error(res?.message || "Failed to add rate.");
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Sort banks
  const filteredBanks = banks
    .filter((b) => {
      const matchesSearch =
        !searchTerm ||
        b.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") return b.has_active_option;
      if (statusFilter === "INACTIVE") return !b.has_active_option;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "RATE_DESC") {
        return (b.highest_rate || 0) - (a.highest_rate || 0);
      }
      if (sortBy === "RATE_ASC") {
        return (a.highest_rate || 0) - (b.highest_rate || 0);
      }
      if (sortBy === "NAME_DESC") {
        return b.bank_name.localeCompare(a.bank_name);
      }
      // Default: NAME_ASC
      return a.bank_name.localeCompare(b.bank_name);
    });

  const activeCount = banks.filter((b) => b.has_active_option).length;
  const maxRate = banks.reduce((max, b) => Math.max(max, b.highest_rate || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center font-bold text-sm shadow-2xs">
              📦
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {product.product_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Bank Payout Slabs
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    product.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  Master: {product.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Compare and update corporate payout rates across all lending partner banks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Banks:</span>
              <strong className="text-slate-900 font-semibold">{banks.length}</strong>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400">Active Payouts:</span>
              <strong className="text-emerald-700 font-bold">{activeCount}</strong>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400">Peak Commission:</span>
              <strong className="text-[#B063FF] font-bold">
                {maxRate > 0 ? `${maxRate.toFixed(2)}%` : "—"}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-white text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-purple-50 text-[#B063FF] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({banks.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "INACTIVE"
                    ? "bg-slate-100 text-slate-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactive ({banks.length - activeCount})
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter By Option */}
        <div className="px-5 py-3 border-b border-slate-200/60 bg-white shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search partner bank (e.g. HDFC, ICICI, SBI)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#B063FF] text-slate-900"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
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
          </div>

          {/* Filter/Sort by option dropdown beside search on right side */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
              Filter by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#B063FF] cursor-pointer shadow-2xs"
            >
              <option value="NAME_ASC">Bank Name (A-Z)</option>
              <option value="RATE_DESC">High Rates (Highest First)</option>
              <option value="RATE_ASC">Low Rates (Lowest First)</option>
              <option value="NAME_DESC">Bank Name (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#B063FF] border-r-transparent"></div>
              <p className="text-xs text-slate-500 font-medium mt-2">Loading bank rates...</p>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No banks found matching your filter criteria.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Lending Partner Bank</th>
                    <th className="py-3 px-4">Slab Tier</th>
                    <th className="py-3 px-4 text-right">Payout %</th>
                    <th className="py-3 px-4 text-center">Slab Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBanks.map((b, idx) => {
                    const primaryOpt = b.options && b.options.length > 0 ? b.options[0] : null;
                    const isEditing = editingBankId === b.bank_id;
                    const optActive = primaryOpt?.status === "Active";

                    return (
                      <tr
                        key={b.bank_id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isEditing ? "bg-purple-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px] align-middle">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏦</span>
                            <div>
                              <span className="font-semibold text-slate-900 block text-xs">
                                {b.bank_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {b.bank_status === "Active" ? "Active Bank" : "Inactive Bank"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Slab Tier Label */}
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap align-middle">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLabelInput}
                              onChange={(e) => setEditLabelInput(e.target.value)}
                              placeholder="e.g. Standard"
                              className="px-2 py-1 text-xs rounded border border-slate-300 w-28 focus:outline-none focus:ring-1 focus:ring-[#B063FF]"
                            />
                          ) : (
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {primaryOpt?.option_label || "Standard"}
                            </span>
                          )}
                        </td>

                        {/* Payout Percentage */}
                        <td className="py-3 px-4 text-right whitespace-nowrap align-middle">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editRateInput}
                                onChange={(e) => setEditRateInput(e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                className="w-20 px-2 py-1 text-xs text-right font-mono font-bold rounded border border-purple-300 focus:outline-none focus:ring-1 focus:ring-[#B063FF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                autoFocus
                              />
                              <span className="text-xs font-bold text-purple-700">%</span>
                            </div>
                          ) : (
                            <span
                              className={`font-mono font-bold text-xs ${
                                primaryOpt && primaryOpt.payout_percentage > 0
                                  ? "text-[#B063FF]"
                                  : "text-slate-400"
                              }`}
                            >
                              {primaryOpt ? `${Number(primaryOpt.payout_percentage).toFixed(2)}%` : "0.00%"}
                            </span>
                          )}
                        </td>

                        {/* Slab Status Toggle */}
                        <td className="py-3 px-4 text-center whitespace-nowrap align-middle">
                          {primaryOpt ? (
                            <button
                              type="button"
                              onClick={() => handleToggleOptionStatus(b, primaryOpt)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors ${
                                optActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  optActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {optActive ? "Active" : "Inactive"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Not set</span>
                          )}
                        </td>

                        {/* Quick Edit Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap align-middle min-w-[130px]">
                          {isEditing ? (
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveRate(b, primaryOpt)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#B063FF] hover:bg-[#9E4BE8] text-white cursor-pointer shadow-2xs whitespace-nowrap"
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBankId(null)}
                                className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(b, primaryOpt)}
                              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors shrink-0"
                            >
                              <span>✏️</span>
                              <span>Edit Rate</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 italic">
            Changes to payout rates take effect immediately for all subsequent loan case calculations.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
