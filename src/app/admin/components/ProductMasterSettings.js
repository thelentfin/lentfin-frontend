"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { productPayoutService } from "@/services/productPayoutService";

export default function ProductMasterSettings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
      {/* Search and Filters Card */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search loan products..."
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
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-purple-600 border-r-transparent"></div>
            <p className="text-xs text-slate-500 font-medium mt-2">Loading loan products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No loan products found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Master Status</th>
                  <th className="py-3 px-4 text-right">Toggle Active/Inactive</th>
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
                              Imported from Slab Book
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`text-[11px] font-medium ${
                              isActive ? "text-purple-700" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
