"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { productPayoutService } from "@/services/productPayoutService";
import ProductBankRatesModal from "./ProductBankRatesModal";

export default function ProductMasterSettings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingBankRatesProduct, setViewingBankRatesProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    product_name: "",
    status: "Active",
    auto_link_banks: true,
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const res = await productPayoutService.getMasterProducts();
    if (res && res.status) {
      setProducts(res.data || []);
    } else {
      toast.error(res?.message || "Failed to load master products.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle Add Product Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.product_name || !formData.product_name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    setIsSubmitting(true);
    const res = await productPayoutService.createMasterProduct({
      product_name: formData.product_name.trim(),
      status: formData.status,
      auto_link_banks: formData.auto_link_banks,
    });
    setIsSubmitting(false);

    if (res && res.status) {
      toast.success(res.message || "Loan product added successfully!");
      setIsAddModalOpen(false);
      setFormData({ product_name: "", status: "Active", auto_link_banks: true });
      loadProducts();
    } else {
      setFormError(res?.message || "Failed to create product.");
    }
  };

  // Handle Edit Product Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.product_name || !formData.product_name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    setIsSubmitting(true);
    const res = await productPayoutService.updateMasterProduct(editingProduct.id, {
      product_name: formData.product_name.trim(),
      status: formData.status,
    });
    setIsSubmitting(false);

    if (res && res.status) {
      toast.success(res.message || "Loan product updated successfully!");
      setEditingProduct(null);
      setFormData({ product_name: "", status: "Active", auto_link_banks: true });
      loadProducts();
    } else {
      setFormError(res?.message || "Failed to update product.");
    }
  };

  // Handle Delete Product
  const handleDeleteProductSubmit = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    const res = await productPayoutService.deleteMasterProduct(deletingProduct.id);
    setIsDeleting(false);

    if (res && res.status) {
      toast.success(res.message || "Loan product deleted successfully!");
      setDeletingProduct(null);
      loadProducts();
    } else {
      toast.error(res?.message || "Failed to delete product.");
    }
  };

  // Quick Toggle Active/Inactive
  const handleToggleProductStatus = async (product) => {
    const nextStatus = product.status === "Active" ? "Inactive" : "Active";
    const res = await productPayoutService.toggleMasterProductStatus(product.id, nextStatus);

    if (res && res.status) {
      toast.success(`Product '${product.product_name}' set to ${nextStatus}`);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
      );
    } else {
      toast.error(res?.message || "Failed to update product status.");
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      !searchTerm ||
      prod.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") return prod.status === "Active";
    if (statusFilter === "INACTIVE") return prod.status === "Inactive";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Card with Add Product Button */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search loan products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#B063FF] text-slate-900"
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

          <div className="flex items-center gap-2 flex-wrap">
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
                All ({products.length})
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
                Active ({products.filter((p) => p.status === "Active").length})
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
                Inactive ({products.filter((p) => p.status !== "Active").length})
              </button>
            </div>

            {/* + Add Loan Product Button */}
            <button
              type="button"
              onClick={() => {
                setFormData({ product_name: "", status: "Active", auto_link_banks: true });
                setFormError("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs cursor-pointer transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Loan Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#B063FF] border-r-transparent"></div>
            <p className="text-xs text-slate-500 font-medium mt-2">Loading loan products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No loan products found matching your search.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Lending Bank Rates</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod, idx) => {
                    const isActive = prod.status === "Active";

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold">
                              📦
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block text-xs">
                                {prod.product_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Active Master Loan Category
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Toggle Switch (Switch only, no active text) */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            title={isActive ? "Deactivate Product" : "Activate Product"}
                            onClick={() => handleToggleProductStatus(prod)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActive ? "bg-[#B063FF]" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Bank Rates Comparison Button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingBankRatesProduct(prod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-50 hover:bg-purple-100 text-[#B063FF] border border-purple-200/80 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>🏦</span>
                            <span>View Bank Rates</span>
                          </button>
                        </td>

                        {/* Actions: Edit & Delete (Icon only) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit Details */}
                            <button
                              type="button"
                              title="Edit Product Details"
                              onClick={() => {
                                setEditingProduct(prod);
                                setFormData({
                                  product_name: prod.product_name,
                                  status: prod.status || "Active",
                                  auto_link_banks: false,
                                });
                                setFormError("");
                              }}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            {/* Delete Product (Icon only) */}
                            <button
                              type="button"
                              title="Delete Loan Product"
                              onClick={() => setDeletingProduct(prod)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
              {filteredProducts.map((prod, idx) => {
                const isActive = prod.status === "Active";

                return (
                  <div
                    key={prod.id}
                    className="rounded-md border border-slate-200/80 bg-white p-3 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold shrink-0">
                          📦
                        </div>
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {prod.product_name}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          title={isActive ? "Deactivate Product" : "Activate Product"}
                          onClick={() => handleToggleProductStatus(prod)}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isActive ? "bg-[#B063FF]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                              isActive ? "translate-x-3.5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      {/* View Bank Rates Button */}
                      <button
                        type="button"
                        onClick={() => setViewingBankRatesProduct(prod)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded-md bg-purple-50 hover:bg-purple-100 text-[#B063FF] border border-purple-200/80 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>🏦</span>
                        <span>View Bank Rates</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          title="Edit Product Details"
                          aria-label="Edit Product Details"
                          onClick={() => {
                            setEditingProduct(prod);
                            setFormData({
                              product_name: prod.product_name,
                              status: prod.status || "Active",
                              auto_link_banks: false,
                            });
                            setFormError("");
                          }}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          title="Delete Product"
                          aria-label="Delete Product"
                          onClick={() => setDeletingProduct(prod)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── ADD PRODUCT MODAL ──────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-xs">
                  📦
                </div>
                <h3 className="text-sm font-bold text-slate-900">Add New Loan Product</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium">
                  ⚠️ {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machinery Loan, Education Loan, Doctor Loan"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF]"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  This product will appear in DSA loan application categories.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Master Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF]"
                >
                  <option value="Active">Active (Immediately Available)</option>
                  <option value="Inactive">Inactive (Draft / Hidden)</option>
                </select>
              </div>

              {/* Auto-link Banks Checkbox */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_link_banks}
                    onChange={(e) => setFormData({ ...formData, auto_link_banks: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-[#B063FF] focus:ring-[#B063FF]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Auto-link to active partner banks
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Initializes a Standard slab (0.00%) across all active banks so you can immediately configure rates.
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-xs font-semibold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? "Creating..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT PRODUCT MODAL ─────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#B063FF]/10 text-[#B063FF] flex items-center justify-center font-bold text-xs">
                  ✏️
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Loan Product</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium">
                  ⚠️ {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Loan"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF]"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Master Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#B063FF] hover:bg-[#9E4BE8] text-xs font-semibold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200/80 shadow-2xl p-5 space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 text-base font-semibold border border-red-200/80">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Loan Product?</h3>
              <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingProduct.product_name}</span>? Existing bank rate mappings linked to this product will be removed.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProductSubmit}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRODUCT BANK RATES MATRIX MODAL ─────────────────────────────────── */}
      <ProductBankRatesModal
        product={viewingBankRatesProduct}
        isOpen={!!viewingBankRatesProduct}
        onClose={() => setViewingBankRatesProduct(null)}
      />
    </div>
  );
}
