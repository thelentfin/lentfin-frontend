"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { dsaService } from "@/services/dsaService";
import { dashboardApiService } from "@/services/dashboardApiService";
import ColorfulUserAvatar from "@/components/ColorfulUserAvatar";

export default function ReferralNetworkManagement() {
  const [loading, setLoading] = useState(true);
  const [networkData, setNetworkData] = useState({
    summary: {
      totalPartners: 0,
      activePartners: 0,
      totalCases: 0,
      approvedCases: 0,
      pendingCases: 0,
      rejectedCases: 0,
      totalSanctionAmount: 0,
    },
    partners: [],
  });

  const [dsaProfile, setDsaProfile] = useState({
    referralCode: "",
    name: "",
    dsaCode: "",
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  // Selected partner for Cases Drawer
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerCasesLoading, setPartnerCasesLoading] = useState(false);
  const [partnerCasesData, setPartnerCasesData] = useState({
    partner: null,
    cases: [],
  });

  // Fetch Referral Network Data
  const loadReferralNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dsaService.getReferralNetwork();
      if (res && res.status && res.data) {
        setNetworkData({
          summary: res.data.summary || {
            totalPartners: 0,
            activePartners: 0,
            totalCases: 0,
            approvedCases: 0,
            pendingCases: 0,
            rejectedCases: 0,
            totalSanctionAmount: 0,
          },
          partners: Array.isArray(res.data.partners) ? res.data.partners : [],
        });
      }
    } catch (err) {
      console.error("Failed to load referral network:", err);
      toast.error("Failed to load referral network data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Logged-in DSA Referral Code
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await dashboardApiService.getDsaDashboard();
        if (isMounted && res && res.status && res.data?.profile) {
          const p = res.data.profile;
          setDsaProfile({
            referralCode: p.referral_code || "",
            name: p.name || "",
            dsaCode: p.dsa_code || "",
          });
        }
      } catch (err) {
        // Fallback to localStorage cache
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("dsa_profile");
            if (raw) {
              const p = JSON.parse(raw);
              setDsaProfile({
                referralCode: p.referral_code || "",
                name: p.name || "",
                dsaCode: p.dsa_code || "",
              });
            }
          } catch (e) {}
        }
      }
    };

    fetchProfile();
    loadReferralNetwork();

    return () => {
      isMounted = false;
    };
  }, [loadReferralNetwork]);

  // Open Partner Cases Drawer
  const handleOpenPartnerCases = async (partner) => {
    setSelectedPartner(partner);
    setPartnerCasesLoading(true);
    setPartnerCasesData({ partner, cases: [] });

    try {
      const res = await dsaService.getReferralPartnerCases(partner.id);
      if (res && res.status && res.data) {
        setPartnerCasesData({
          partner: res.data.partner || partner,
          cases: Array.isArray(res.data.cases) ? res.data.cases : [],
        });
      } else {
        toast.error(res?.message || "Failed to load partner cases");
      }
    } catch (err) {
      console.error("Error loading partner cases:", err);
      toast.error("Error loading partner cases");
    } finally {
      setPartnerCasesLoading(false);
    }
  };

  // Close Partner Cases Drawer
  const handleCloseDrawer = () => {
    setSelectedPartner(null);
    setPartnerCasesData({ partner: null, cases: [] });
  };

  // Copy Referral Code
  const handleCopyCode = () => {
    if (!dsaProfile.referralCode) {
      toast.error("Referral code not available");
      return;
    }
    navigator.clipboard?.writeText(dsaProfile.referralCode);
    toast.success("Referral Code copied to clipboard!");
  };

  // Copy Full Invite Link
  const handleCopyInviteLink = () => {
    if (!dsaProfile.referralCode) {
      toast.error("Referral code not available");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/dsa-signup?ref=${encodeURIComponent(dsaProfile.referralCode)}`;
    navigator.clipboard?.writeText(inviteUrl);
    toast.success("Registration invite link copied to clipboard!");
  };

  // Filtered & Sorted Partners List
  const filteredPartners = useMemo(() => {
    let list = [...(networkData.partners || [])];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const firm = (p.firm_name || "").toLowerCase();
        const code = (p.dsa_code || "").toLowerCase();
        const mobile = (p.mobile || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        return (
          name.includes(q) ||
          firm.includes(q) ||
          code.includes(q) ||
          mobile.includes(q) ||
          email.includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.status === statusFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === "MOST_CASES") {
        return Number(b.total_cases || 0) - Number(a.total_cases || 0);
      }
      if (sortBy === "HIGHEST_VOLUME") {
        return Number(b.total_sanction_amount || 0) - Number(a.total_sanction_amount || 0);
      }
      if (sortBy === "NAME_ASC") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

    return list;
  }, [networkData.partners, searchTerm, statusFilter, sortBy]);

  // Format INR Currency
  const formatINR = (val) => {
    const num = Number(val || 0);
    if (isNaN(num)) return "₹0";
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Helper for Status Badge
  const renderStatusBadge = (status) => {
    const clean = (status || "").toUpperCase();
    if (clean === "ACCEPTED" || clean === "ACTIVE" || clean === "DISBURSED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ {status}
        </span>
      );
    }
    if (clean === "REJECTED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
          ✕ {status}
        </span>
      );
    }
    if (clean === "SUBMITTED" || clean === "IN_REVIEW" || clean === "PENDING") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          ⏳ {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
        {status || "DRAFT"}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* 1. MINIMAL HEADER & ACTIONS (Matching Commission & Settlement Hub) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
              Affiliate Network
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              Partner: <strong className="text-slate-700 font-mono">{dsaProfile.dsaCode || "DSA"}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Referral Network
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track partners onboarded under your referral code, monitor loan applications, and view disbursement volume in real time.
          </p>
        </div>

        {/* Right side: Referral Code on Top, 2 Buttons underneath */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {/* Top: Referral Code Display - Pure text without capsule, click-to-copy */}
          <div
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 text-xs text-slate-500 font-medium cursor-pointer hover:opacity-85 transition-opacity select-none group"
            title="Click to copy referral code"
          >
            <span>Your Referral Code:</span>
            <span className="font-mono font-bold text-purple-700 tracking-wider text-sm group-hover:underline">
              {dsaProfile.referralCode || "—"}
            </span>
          </div>

          {/* Bottom: 2 Action Buttons Side-by-Side with equal width and nowrap */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer active:scale-98 whitespace-nowrap min-w-[110px]"
              title="Copy Referral Code"
            >
              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Code</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-98 whitespace-nowrap min-w-[110px]"
              title="Copy Direct Registration Link"
            >
              <svg className="w-3.5 h-3.5 text-purple-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Partners */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Referred Partners</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              👥
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? <span className="inline-block w-12 h-6 bg-slate-200 animate-pulse rounded" /> : networkData.summary.totalPartners}
          </div>
          <p className="text-[11px] text-slate-400">
            {networkData.summary.activePartners} active in system
          </p>
        </div>

        {/* Total Cases Submitted */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Network Cases</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              📁
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? <span className="inline-block w-12 h-6 bg-slate-200 animate-pulse rounded" /> : networkData.summary.totalCases}
          </div>
          <p className="text-[11px] text-slate-400">
            {networkData.summary.approvedCases} approved • {networkData.summary.pendingCases} in review
          </p>
        </div>

        {/* Disbursed / Sanctioned Volume */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sanctioned Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              ₹
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
            {loading ? <span className="inline-block w-20 h-6 bg-slate-200 animate-pulse rounded" /> : formatINR(networkData.summary.totalSanctionAmount)}
          </div>
          <p className="text-[11px] text-slate-400">
            Approved business closed
          </p>
        </div>

        {/* Conversion / Success Rate */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Approval Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              📊
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? (
              <span className="inline-block w-12 h-6 bg-slate-200 animate-pulse rounded" />
            ) : networkData.summary.totalCases > 0 ? (
              `${Math.round((networkData.summary.approvedCases / networkData.summary.totalCases) * 100)}%`
            ) : (
              "0%"
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Network conversion index
          </p>
        </div>
      </div>

      {/* 3. Partners Directory Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Referred Partner Directory</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                {filteredPartners.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed breakdown of partner performance and loan cases.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px] sm:min-w-[260px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search partner, firm, code, phone..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs cursor-pointer"
            >
              <option value="NEWEST">Newest Joined</option>
              <option value="MOST_CASES">Most Cases</option>
              <option value="HIGHEST_VOLUME">Highest Volume</option>
              <option value="NAME_ASC">Name (A-Z)</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadReferralNetwork}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Refresh Data"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl">
                🤝
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                {networkData.partners.length === 0
                  ? "No partners onboarded yet"
                  : "No partners match your search"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {networkData.partners.length === 0
                  ? `Share your referral code (${dsaProfile.referralCode || "N/A"}) with prospective DSA partners to start earning referral perks and tracking their loan submissions.`
                  : "Try clearing your search query or changing filters to view your referred network."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Partner &amp; Firm</th>
                  <th className="py-3 px-4">DSA Code</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joined On</th>
                  <th className="py-3 px-4 text-center">Cases Logged</th>
                  <th className="py-3 px-4 text-right">Sanctioned Volume</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPartners.map((partner) => {
                  const totalCases = Number(partner.total_cases || 0);
                  const approvedCases = Number(partner.approved_cases || 0);
                  const pendingCases = Number(partner.pending_cases || 0);

                  return (
                    <tr
                      key={partner.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Partner & Firm */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-purple-700 shrink-0 border border-slate-200">
                            {partner.name?.charAt(0)?.toUpperCase() || "D"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate">
                              {partner.name || "N/A"}
                            </span>
                            {partner.firm_name ? (
                              <span className="text-[11px] text-slate-500 block truncate">
                                🏢 {partner.firm_name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block italic">
                                Individual DSA
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DSA Code */}
                      <td className="py-3 px-4 font-mono font-medium text-purple-700">
                        {partner.dsa_code || `#DSA-${String(partner.id).padStart(3, "0")}`}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium tabular-nums">
                          {partner.mobile || "-"}
                        </div>
                        {partner.email && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {partner.email}
                          </div>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-500 tabular-nums">
                        {partner.created_at
                          ? new Date(partner.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      {/* Cases Logged */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-900 text-xs">
                            {totalCases}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {approvedCases > 0 ? `${approvedCases} approved` : `${pendingCases} in review`}
                          </span>
                        </div>
                      </td>

                      {/* Sanctioned Volume */}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                        {formatINR(partner.total_sanction_amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(partner.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPartnerCases(partner)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="View all cases logged by this partner"
                        >
                          <span>View Cases</span>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Partner Cases Breakdown Drawer (Slide-over) */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDrawer}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col z-50">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 border border-purple-200 text-sm">
                  {selectedPartner.name?.charAt(0)?.toUpperCase() || "D"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {selectedPartner.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono text-purple-700 font-medium">
                      {selectedPartner.dsa_code || `#${selectedPartner.id}`}
                    </span>
                    {selectedPartner.firm_name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{selectedPartner.firm_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDrawer}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Partner Summary Banner */}
            <div className="p-4 bg-purple-50/50 border-b border-purple-100/60 grid grid-cols-3 gap-3 text-center shrink-0">
              <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Total Cases</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {partnerCasesData.cases.length}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Approved Cases</span>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                  {partnerCasesData.cases.filter((c) => ["ACCEPTED", "DISBURSED"].includes(c.status?.toUpperCase())).length}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Sanctioned Volume</span>
                <span className="text-sm font-bold text-purple-700 mt-0.5 block">
                  {formatINR(
                    partnerCasesData.cases
                      .filter((c) => ["ACCEPTED", "DISBURSED"].includes(c.status?.toUpperCase()))
                      .reduce((acc, c) => acc + Number(c.sanction_amount || 0), 0)
                  )}
                </span>
              </div>
            </div>

            {/* Drawer Content: Case List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Loan Applications Breakdown ({partnerCasesData.cases.length})
                </h4>
              </div>

              {partnerCasesLoading ? (
                <div className="space-y-3 py-4">
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                </div>
              ) : partnerCasesData.cases.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-base">
                    📁
                  </div>
                  <p className="text-xs font-semibold text-slate-800">No loan cases recorded</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                    This partner has not yet submitted any loan applications under LentFin.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partnerCasesData.cases.map((loanCase) => (
                    <div
                      key={loanCase.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-purple-200 transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                              {loanCase.case_number || `#CASE-${loanCase.id}`}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {loanCase.customer_name || "Customer"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span>Product: <strong>{loanCase.product_name || "General Loan"}</strong></span>
                            {loanCase.bank_name && (
                              <>
                                <span>•</span>
                                <span>Bank: <strong>{loanCase.bank_name}</strong></span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {renderStatusBadge(loanCase.status)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">
                          Logged on:{" "}
                          <strong className="text-slate-700">
                            {loanCase.created_at
                              ? new Date(loanCase.created_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </strong>
                        </span>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 mr-1.5">Sanction Amount:</span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {formatINR(loanCase.sanction_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
