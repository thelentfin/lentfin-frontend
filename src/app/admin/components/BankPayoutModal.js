"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { productPayoutService } from "@/services/productPayoutService";

export default function BankPayoutModal({ bank, isOpen, onClose, onBankUpdated }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Add new option modal state inside product
  const [addingToProductId, setAddingToProductId] = useState(null);
  const [newOptionData, setNewOptionData] = useState({
    option_label: "",
    payout_percentage: "",
    status: "Active",
  });

  const loadPayouts = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    const res = await productPayoutService.getBankPayouts(bank.id);
    if (res && res.status) {
      setProducts(res.products || []);
    } else {
      toast.error(res?.message || "Failed to load payout configurations.");
    }
    setLoading(false);
  }, [bank?.id]);

  useEffect(() => {
    if (isOpen && bank?.id) {
      loadPayouts();
      setSearchTerm("");
      setStatusFilter("ALL");
      setEditingOptionId(null);
      setAddingToProductId(null);
    }
  }, [isOpen, bank?.id, loadPayouts]);

  // Toggle option status Active <-> Inactive
  const handleToggleOptionStatus = async (option) => {
    const nextStatus = option.status === "Active" ? "Inactive" : "Active";
    const res = await productPayoutService.updatePayoutOption(option.id, {
      status: nextStatus,
    });

    if (res && res.status) {
      toast.success(
        `Option '${option.option_label}' set to ${nextStatus}`
      );
      // Local state optimistic update
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          options: p.options.map((opt) =>
            opt.id === option.id ? { ...opt, status: nextStatus } : opt
          ),
        }))
      );
      if (onBankUpdated) onBankUpdated();
    } else {
      toast.error(res?.message || "Failed to update status.");
    }
  };

  // Start editing option percentage
  const handleStartEdit = (option) => {
    setEditingOptionId(option.id);
    setEditValues({
      option_label: option.option_label,
      payout_percentage: option.payout_percentage,
    });
  };

  // Save edited option
  const handleSaveOption = async (optionId) => {
    setIsSaving(true);
    const numRate = parseFloat(editValues.payout_percentage);
    if (isNaN(numRate) || numRate < 0) {
      toast.error("Please enter a valid payout percentage.");
      setIsSaving(false);
      return;
    }

    const res = await productPayoutService.updatePayoutOption(optionId, {
      option_label: editValues.option_label?.trim() || "Standard",
      payout_percentage: numRate,
    });

    setIsSaving(false);

    if (res && res.status) {
      toast.success("Payout option updated successfully!");
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          options: p.options.map((opt) =>
            opt.id === optionId
              ? {
                  ...opt,
                  option_label: editValues.option_label?.trim() || "Standard",
                  payout_percentage: numRate,
                }
              : opt
          ),
        }))
      );
      setEditingOptionId(null);
      if (onBankUpdated) onBankUpdated();
    } else {
      toast.error(res?.message || "Failed to save payout option.");
    }
  };

  // Add new sub-option
  const handleAddOptionSubmit = async (productId) => {
    if (!newOptionData.option_label.trim()) {
      toast.error("Please enter an option label (e.g. STSL, Standard).");
      return;
    }
    const rate = parseFloat(newOptionData.payout_percentage);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid percentage rate.");
      return;
    }

    setIsSaving(true);
    const res = await productPayoutService.addPayoutOption({
      bank_id: bank.id,
      product_id: productId,
      option_label: newOptionData.option_label.trim(),
      payout_percentage: rate,
      status: newOptionData.status || "Active",
    });
    setIsSaving(false);

    if (res && res.status) {
      toast.success("New product option added!");
      setAddingToProductId(null);
      setNewOptionData({ option_label: "", payout_percentage: "", status: "Active" });
      loadPayouts();
      if (onBankUpdated) onBankUpdated();
    } else {
      toast.error(res?.message || "Failed to add option.");
    }
  };

  if (!isOpen || !bank) return null;

  // Filter products based on search and status
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      !searchTerm ||
      prod.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.options.some((o) =>
        o.option_label.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") {
      return prod.options.some((o) => o.status === "Active");
    }
    if (statusFilter === "INACTIVE") {
      return prod.options.every((o) => o.status !== "Active");
    }
    return true;
  });

  const totalActiveOptions = products.reduce(
    (acc, p) => acc + p.options.filter((o) => o.status === "Active").length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-semibold text-base border border-purple-200/80">
              🏦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  {bank.bank_name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                    bank.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {bank.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Manage product commission slabs, variants, and active/inactive toggles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar: Search, Filters, Stats */}
        <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products or options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900"
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
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-purple-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Products ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active Slabs ({totalActiveOptions})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  statusFilter === "INACTIVE"
                    ? "bg-white text-slate-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Products & Options List */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3.5 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-purple-600 border-r-transparent"></div>
              <p className="text-xs text-slate-500 font-medium mt-2">Loading product slabs...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-800">No products match your filter.</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the search or filter options.</p>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const hasActiveOptions = prod.options.some((o) => o.status === "Active");

              return (
                <div
                  key={prod.product_id}
                  className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs transition-shadow hover:shadow-xs"
                >
                  {/* Product Header */}
                  <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {prod.product_name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          hasActiveOptions
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {hasActiveOptions
                          ? `${prod.options.filter((o) => o.status === "Active").length} Active Option(s)`
                          : "Inactive for Bank"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingToProductId(
                          addingToProductId === prod.product_id ? null : prod.product_id
                        );
                        setNewOptionData({
                          option_label: "",
                          payout_percentage: "",
                          status: "Active",
                        });
                      }}
                      className="text-[11px] font-medium text-purple-700 hover:text-purple-900 cursor-pointer inline-flex items-center gap-1"
                    >
                      + Add Option
                    </button>
                  </div>

                  {/* Add Option Sub-Form (if toggled) */}
                  {addingToProductId === prod.product_id && (
                    <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex flex-wrap items-center gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Option Label (e.g. STSL, Standard, >2 Cr)"
                        value={newOptionData.option_label}
                        onChange={(e) =>
                          setNewOptionData({ ...newOptionData, option_label: e.target.value })
                        }
                        className="px-2.5 py-1 text-xs rounded border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 flex-1 min-w-[140px]"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={newOptionData.payout_percentage}
                          onChange={(e) =>
                            setNewOptionData({
                              ...newOptionData,
                              payout_percentage: e.target.value,
                            })
                          }
                          className="w-24 px-2.5 py-1 text-xs rounded border border-purple-200 bg-white pr-6 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="absolute right-2 top-1 text-slate-400 font-semibold text-xs">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleAddOptionSubmit(prod.product_id)}
                        className="px-3 py-1 rounded bg-[#B063FF] hover:bg-[#9b4eed] text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save Option"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingToProductId(null)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="divide-y divide-slate-100">
                    {prod.options.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 italic text-center">
                        No payout options configured. Click &quot;+ Add Option&quot; above to set a rate.
                      </div>
                    ) : (
                      prod.options.map((opt) => {
                        const isOptActive = opt.status === "Active";
                        const isEditing = editingOptionId === opt.id;

                        return (
                          <div
                            key={opt.id}
                            className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                              isOptActive ? "bg-white" : "bg-slate-50/40 opacity-75"
                            }`}
                          >
                            {/* Left: Option Label & Remarks */}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValues.option_label}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      option_label: e.target.value,
                                    })
                                  }
                                  className="w-full max-w-[200px] px-2 py-0.5 text-xs border border-purple-300 rounded focus:outline-none"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">
                                    {opt.option_label}
                                  </span>
                                  {opt.remarks && (
                                    <span
                                      title={opt.remarks}
                                      className="text-[11px] text-slate-400 truncate max-w-[240px]"
                                    >
                                      ({opt.remarks})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Middle: Percentage Rate */}
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValues.payout_percentage}
                                    onChange={(e) =>
                                      setEditValues({
                                        ...editValues,
                                        payout_percentage: e.target.value,
                                      })
                                    }
                                    className="w-20 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-300 rounded text-right pr-6 focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-0.5 font-bold text-xs text-purple-500">
                                    %
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`font-semibold font-mono text-xs px-2 py-0.5 rounded ${
                                    isOptActive
                                      ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                                      : "bg-slate-100 text-slate-400 border border-slate-200"
                                  }`}
                                >
                                  {Number(opt.payout_percentage).toFixed(2)}%
                                </span>
                              )}

                              {/* Edit / Save Action Button */}
                              {isEditing ? (
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveOption(opt.id)}
                                  className="px-2 py-0.5 text-[11px] rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 cursor-pointer"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Edit Rate / Label"
                                  onClick={() => handleStartEdit(opt)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.8}
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Right: Active / Inactive Toggle Switch */}
                            <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-100">
                              <span
                                className={`text-[10px] font-semibold w-12 text-right ${
                                  isOptActive ? "text-purple-700" : "text-slate-400"
                                }`}
                              >
                                {isOptActive ? "Active" : "Inactive"}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOptActive}
                                title={isOptActive ? "Deactivate option" : "Activate option"}
                                onClick={() => handleToggleOptionStatus(opt)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isOptActive ? "bg-[#B063FF]" : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                    isOptActive ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500">
            Total configured products: <strong>{products.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
