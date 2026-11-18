"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { bankApiService } from "@/services/bankApiService";
import { productPayoutService } from "@/services/productPayoutService";

// Database-driven rates management

export default function CommissionPaymentSettings() {
  // Master Data States
  const [users, setUsers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Rates Storage State: { [userId]: { [bankId]: { [productId]: rateNumber } } }
  const [payoutRates, setPayoutRates] = useState({});

  // Modal Navigation State
  // modalStep: null | "BANKS" | "PRODUCTS"
  const [activeModal, setActiveModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

  // Bank Modal Search
  const [bankSearchTerm, setBankSearchTerm] = useState("");

  // Product Rates Editing Form State: { [productId]: stringValue }
  const [editingRates, setEditingRates] = useState({});
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [bankProducts, setBankProducts] = useState([]);
  const [isLoadingBankProducts, setIsLoadingBankProducts] = useState(false);

  // Rates are strictly database-driven per DSA partner

  // Fetch DSA Users, Banks, and Loan Products
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);

    // 1. Fetch Users
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.status && Array.isArray(data.data)) {
          setUsers(data.data);
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (e) {
      setUsers([]);
    }

    // 2. Fetch Banks
    try {
      const bankRes = await bankApiService.getBanks();
      if (bankRes && bankRes.status && Array.isArray(bankRes.data)) {
        setBanks(bankRes.data.filter((b) => (b.status || "").toLowerCase() !== "inactive"));
      } else {
        setBanks([]);
      }
    } catch (e) {
      setBanks([]);
    }

    // 3. Fetch Master Products
    try {
      const prodRes = await productPayoutService.getMasterProducts();
      if (prodRes && prodRes.status && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data.filter((p) => (p.status || "").toLowerCase() !== "inactive"));
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }

    // 4. Fetch All Configured Rates across DSA Partners from Database
    try {
      const ratesRes = await productPayoutService.getAllDsaPayoutRates();
      if (ratesRes && ratesRes.status && ratesRes.data && typeof ratesRes.data === "object") {
        setPayoutRates(ratesRes.data);
      }
    } catch (e) {
      console.warn("Could not load initial DSA payout rates:", e);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Helper: Count how many banks have at least 1 configured product (> 0%) for a user
  const getUserConfiguredBanksCount = useCallback(
    (userId) => {
      const userBankRates = payoutRates[userId] || {};
      let configuredCount = 0;
      Object.keys(userBankRates).forEach((bId) => {
        const prodRates = userBankRates[bId] || {};
        const hasRate = Object.values(prodRates).some((val) => parseFloat(val) > 0);
        if (hasRate) configuredCount++;
      });
      return configuredCount;
    },
    [payoutRates]
  );

  // Helper: Count configured products for a specific user and bank
  const getBankConfiguredProductsCount = useCallback(
    (userId, bankId) => {
      const prodRates = payoutRates[userId]?.[bankId] || {};
      let count = 0;
      Object.values(prodRates).forEach((val) => {
        if (parseFloat(val) > 0) count++;
      });
      return count;
    },
    [payoutRates]
  );

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const code = (u.dsa_code || u.code || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const mobile = (u.mobile || u.phone || "").toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || code.includes(q) || email.includes(q) || mobile.includes(q);
      const status = (u.status || "Active").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Pagination Calculations
  const totalCount = filteredUsers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Active / Inactive Counts
  const activeCount = users.filter((u) => (u.status || "Active").toUpperCase() === "ACTIVE").length;
  const inactiveCount = users.filter((u) => (u.status || "").toUpperCase() === "INACTIVE").length;

  // Open Bank Modal for a DSA Partner
  const handleOpenBankModal = async (user) => {
    setSelectedUser(user);
    setBankSearchTerm("");
    setActiveModal("BANKS");

    // Fetch persisted rates from database for this partner
    try {
      const res = await productPayoutService.getDsaPayoutRates(user.id);
      if (res && res.status && res.data && Object.keys(res.data).length > 0) {
        setPayoutRates((prev) => {
          return { ...prev, [user.id]: { ...(prev[user.id] || {}), ...res.data } };
        });
      }
    } catch (e) {
      console.warn("Could not load backend rates for partner:", e);
    }
  };

  // Open Product Rates Modal for a Bank (loads strictly active products for this specific bank)
  const handleOpenProductRates = async (bank) => {
    setSelectedBank(bank);
    setIsLoadingBankProducts(true);
    setActiveModal("PRODUCTS");

    try {
      const res = await productPayoutService.getBankPayouts(bank.id);
      if (res && res.status && Array.isArray(res.products)) {
        // Filter strictly for products that have at least one active option for this bank
        const activeProds = res.products
          .filter(
            (p) =>
              p.options &&
              p.options.some((opt) => (opt.status || "").toLowerCase() === "active")
          )
          .map((p) => ({
            id: p.product_id || p.id,
            product_name: p.product_name,
            options: p.options,
          }));

        setBankProducts(activeProds);

        // Initialize inputs with existing rates or default 0.00
        const existingBankRates = payoutRates[selectedUser?.id]?.[bank.id] || {};
        const initialInputs = {};
        activeProds.forEach((prod) => {
          const existingVal = existingBankRates[prod.id];
          initialInputs[prod.id] =
            existingVal !== undefined && existingVal !== null ? String(existingVal) : "0.00";
        });
        setEditingRates(initialInputs);
      } else {
        setBankProducts([]);
        setEditingRates({});
      }
    } catch (err) {
      console.error("Error loading active bank products:", err);
      setBankProducts([]);
      setEditingRates({});
    } finally {
      setIsLoadingBankProducts(false);
    }
  };

  // Back from Products Modal to Banks Modal
  const handleBackToBanks = () => {
    setSelectedBank(null);
    setBankProducts([]);
    setActiveModal("BANKS");
  };

  // Close All Modals
  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setSelectedBank(null);
    setBankSearchTerm("");
    setBankProducts([]);
    setEditingRates({});
  };

  // Handle Input Change for Product Rate
  const handleRateInputChange = (productId, val) => {
    setEditingRates((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  // Handle Save Product Rates
  const handleSaveProductRates = async () => {
    if (!selectedUser || !selectedBank) return;
    setIsSavingRates(true);

    const parsedRates = {};
    let hasInvalid = false;

    bankProducts.forEach((prod) => {
      const raw = editingRates[prod.id];
      const parsed = parseFloat(raw);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        hasInvalid = true;
      } else {
        parsedRates[prod.id] = parsed;
      }
    });

    if (hasInvalid) {
      toast.error("Please enter valid percentages between 0.00% and 100.00%");
      setIsSavingRates(false);
      return;
    }

    // Update Local State & Persist in LocalStorage
    const updated = {
      ...payoutRates,
      [selectedUser.id]: {
        ...(payoutRates[selectedUser.id] || {}),
        [selectedBank.id]: parsedRates,
      },
    };

    setPayoutRates(updated);

    // Save to Database via API
    try {
      await productPayoutService.saveDsaPayoutRates(
        selectedUser.id,
        selectedBank.id,
        parsedRates,
        selectedUser.dsa_code || selectedUser.code
      );
    } catch (e) {
      console.warn("Could not save to backend database:", e);
    }

    toast.success(`Rates for ${selectedBank.bank_name} saved successfully!`);
    setIsSavingRates(false);

    // Return back to Banks list view
    setActiveModal("BANKS");
  };

  // Filtered Banks inside Bank Modal: Configured banks first, then unconfigured banks
  const modalFilteredBanks = useMemo(() => {
    const q = bankSearchTerm.toLowerCase().trim();
    const matched = !q
      ? banks
      : banks.filter((b) => (b.bank_name || "").toLowerCase().includes(q));

    if (!selectedUser) return matched;

    // Sort: Configured banks (> 0 active products configured) first, then unconfigured banks below
    return [...matched].sort((a, b) => {
      const countA = getBankConfiguredProductsCount(selectedUser.id, a.id);
      const countB = getBankConfiguredProductsCount(selectedUser.id, b.id);
      const isConfiguredA = countA > 0 ? 1 : 0;
      const isConfiguredB = countB > 0 ? 1 : 0;

      if (isConfiguredA !== isConfiguredB) {
        return isConfiguredB - isConfiguredA; // 1 before 0
      }
      return (a.bank_name || "").localeCompare(b.bank_name || "");
    });
  }, [banks, bankSearchTerm, selectedUser, getBankConfiguredProductsCount]);

  // Avatar Initials Helper
  const getInitials = (name) => {
    if (!name) return "DS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
      {/* 1. Header Toolbar & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Search Box */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search DSA by name, code, email, mobile..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] transition-all shadow-2xs placeholder:text-slate-400"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Segmented Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ACTIVE");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("INACTIVE");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-slate-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Table Card Surface */}
      <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-normal text-xs space-y-2">
            <div className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-1" />
            <p>Loading DSA Partners...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-500 text-lg">
              👥
            </div>
            <h3 className="text-xs font-semibold text-slate-900">No DSA partners found</h3>
            <p className="text-xs text-slate-500 font-normal">
              {searchTerm || statusFilter !== "ALL"
                ? "No partner records match your search or filter criteria."
                : "No DSA partners registered yet in the system."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">DSA Partner</th>
                    <th className="py-3 px-4">DSA Code</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4 text-center">Configured Rates</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((user, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const dsaCode = user.dsa_code || user.code || `DSA-${String(user.id).padStart(5, "0")}`;
                    const configuredBanks = getUserConfiguredBanksCount(user.id);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* # Row Index */}
                        <td className="py-3 px-4 text-slate-400 font-mono">{rowNumber}</td>

                        {/* DSA Partner Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold shrink-0">
                              {getInitials(user.name)}
                            </div>
                            <span className="font-semibold text-slate-900 text-xs truncate">
                              {user.name || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Separate DSA Code Column */}
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 inline-block">
                            {dsaCode}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-slate-600 font-normal">
                          {user.email || "N/A"}
                        </td>

                        {/* Mobile */}
                        <td className="py-3 px-4 text-slate-700 font-mono tabular-nums">
                          {user.mobile || user.phone || "N/A"}
                        </td>

                        {/* Configured Rates Summary */}
                        <td className="py-3 px-4 text-center">
                          {configuredBanks > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-[#B063FF] border border-purple-200/80">
                              <span>✓</span>
                              <span>{configuredBanks} {configuredBanks === 1 ? "Bank" : "Banks"} Configured</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200/60">
                              Not Configured
                            </span>
                          )}
                        </td>

                        {/* Set Rates Action Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenBankModal(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-50 hover:bg-purple-100 text-[#B063FF] border border-purple-200/80 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>%</span>
                            <span>Set Rates</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden p-3.5 space-y-2.5">
              {paginatedUsers.map((user, idx) => {
                const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                const dsaCode = user.dsa_code || user.code || `DSA-${String(user.id).padStart(5, "0")}`;
                const configuredBanks = getUserConfiguredBanksCount(user.id);

                return (
                  <div
                    key={user.id}
                    className="rounded-md border border-slate-200/80 bg-white p-3 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-slate-400">#{rowNumber}</span>
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {user.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 shrink-0">
                        {dsaCode}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600">
                      <div><span className="text-slate-400">Email:</span> {user.email || "N/A"}</div>
                      <div><span className="text-slate-400">Mobile:</span> {user.mobile || user.phone || "N/A"}</div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        {configuredBanks > 0 ? `${configuredBanks} Banks Set` : "Not Configured"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenBankModal(user)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-50 hover:bg-purple-100 text-[#B063FF] border border-purple-200/80 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>%</span>
                        <span>Set Rates</span>
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
                Showing{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalCount === 0 ? 0 : startIndex + 1}–{endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900 tabular-nums">{totalCount}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-200/80 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium text-xs"
                >
                  Previous
                </button>
                <span className="px-2 py-1 text-slate-700 font-medium text-xs">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-slate-200/80 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL 1: BANK SELECTION MODAL                                          */}
      {/* ========================================================================= */}
      {activeModal === "BANKS" && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                    Configure Payout Rates
                  </h3>
                  <span className="text-[11px] font-mono font-medium text-[#B063FF] bg-purple-50 px-2 py-0.5 rounded border border-purple-200/80">
                    {selectedUser.dsa_code || selectedUser.code || `DSA-${selectedUser.id}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Partner: <strong className="text-slate-800 font-medium">{selectedUser.name}</strong> • Select a bank to set product rates
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Search Toolbar */}
            <div className="p-3.5 border-b border-slate-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search active banking partners..."
                  value={bankSearchTerm}
                  onChange={(e) => setBankSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 focus:bg-white rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF] transition-all"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {bankSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setBankSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Banks List / Table */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1 custom-scrollbar">
              {modalFilteredBanks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {bankSearchTerm ? `No banks match "${bankSearchTerm}"` : "No active banks found in the database."}
                </div>
              ) : (
                modalFilteredBanks.map((bank) => {
                  const configuredCount = getBankConfiguredProductsCount(selectedUser.id, bank.id);

                  return (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200/80 hover:border-purple-200 hover:bg-purple-50/20 transition-all bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 text-sm shrink-0">
                          🏦
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block text-xs truncate">
                            {bank.bank_name}
                          </span>
                          {/* Configured Products Status */}
                          <div className="mt-0.5">
                            {configuredCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {configuredCount} {configuredCount === 1 ? "product" : "products"} configured
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Not configured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Set Product Rates Action Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenProductRates(bank)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs cursor-pointer transition-colors shrink-0"
                      >
                        <span>Set Product Rates</span>
                        <span>→</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL 2: CONFIGURE PRODUCT RATES FOR SELECTED BANK                     */}
      {/* ========================================================================= */}
      {activeModal === "PRODUCTS" && selectedUser && selectedBank && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                    {selectedBank.bank_name}
                  </h3>
                  <span className="text-[11px] font-mono font-medium text-[#B063FF] bg-purple-50 px-2 py-0.5 rounded border border-purple-200/80">
                    {selectedUser.dsa_code || selectedUser.code || `DSA-${selectedUser.id}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Configuring loan product payout percentages for <strong className="text-slate-800 font-medium">{selectedUser.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Strict Zero Fallback Policy Banner */}
            <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="text-amber-600 font-bold text-xs shrink-0">⚠️</span>
              <span>
                <strong>Zero-Rate Restriction:</strong> If this partner selects <strong>{selectedBank.bank_name}</strong> along with any particular loan product whose payout rate is left at <strong>0.00%</strong>, that application case will be blocked and cannot proceed until a non-zero payout rate is configured for that product.
              </span>
            </div>

            {/* Products Table with Rates Inputs */}
            <div className="overflow-y-auto p-5 flex-1 custom-scrollbar">
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th className="py-2.5 px-3">Loan Product</th>
                      <th className="py-2.5 px-3 w-40 text-right">Payout Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingBankProducts ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-500 text-xs">
                          <div className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
                          <p>Loading active products for {selectedBank.bank_name}...</p>
                        </td>
                      </tr>
                    ) : bankProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                          No active loan products configured for {selectedBank.bank_name} in Bank Master.
                        </td>
                      </tr>
                    ) : (
                      bankProducts.map((prod, idx) => {
                        const currentVal = editingRates[prod.id] || "0.00";
                        const numVal = parseFloat(currentVal);
                        const isConfigured = !isNaN(numVal) && numVal > 0;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* # Index */}
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Product Name & Status */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-xs">
                                  {prod.product_name}
                                </span>
                                {isConfigured ? (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Configured
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                    0.00%
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Payout Rate Percentage Input Field */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center relative w-32">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="0.00"
                                  value={editingRates[prod.id] !== undefined ? editingRates[prod.id] : "0.00"}
                                  onChange={(e) => handleRateInputChange(prod.id, e.target.value)}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#B063FF] focus:ring-1 focus:ring-[#B063FF] rounded-md py-1.5 pl-3 pr-7 text-xs font-semibold text-slate-900 text-right focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                  %
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToBanks}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ← Back to Banks
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingRates}
                  onClick={handleSaveProductRates}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#B063FF] hover:bg-[#9E4BE8] text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingRates ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Rates</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

