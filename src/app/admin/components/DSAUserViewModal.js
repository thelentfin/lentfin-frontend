"use client";

import React, { useState, useEffect } from "react";

export default function DSAUserViewModal({ user, onClose }) {
  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!user) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const maskPan = (pan) => {
    if (!pan || pan.length < 10) return pan || "Not Provided";
    return `${pan.slice(0, 5)}****${pan.slice(9)}`;
  };

  const maskAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length < 12) return aadhaar || "Not Provided";
    return `XXXX XXXX ${aadhaar.slice(8)}`;
  };

  const maskAccountNumber = (acc) => {
    if (!acc || acc.length < 4) return acc || "N/A";
    const visible = acc.slice(-4);
    return `•••• •••• ${visible}`;
  };

  const getDocIcon = (type) => {
    const map = {
      CARD: "🪪",
      AADHAAR: "🆔",
      PASSPORT: "🖼️",
      MSME: "📜",
      GST: "🏛️",
      PARTNERSHIP_DEED: "📜",
      PAN: "🪪",
      COI: "📄",
      COMPANY_PAN: "🏢",
      MOA_AOA: "📁",
      LLP_AGREEMENT: "📜",
      LLP_PAN: "🪪",
      LLP_COI: "📄",
    };
    return map[type] || "📄";
  };

  const getDocTypeLabel = (type) => {
    const map = {
      CARD: "Basic PAN Card",
      AADHAAR: "Aadhaar Card",
      PASSPORT: "Passport Photo",
      MSME: "MSME Certificate",
      GST: "GST Certificate",
      PARTNERSHIP_DEED: "Partnership Deed",
      PAN: "Partnership / Firm PAN",
      COI: "Certificate of Incorporation",
      COMPANY_PAN: "Company PAN Card",
      MOA_AOA: "MOA / AOA Document",
      LLP_AGREEMENT: "LLP Agreement",
      LLP_PAN: "LLP PAN Card",
      LLP_COI: "LLP COI",
    };
    return map[type] || type || "Document";
  };

  const documents = user.documents || [];
  const isStatusActive = (user.status || "").toUpperCase() === "ACTIVE";

  // Collapsible section states
  const [isDocsExpanded, setIsDocsExpanded] = useState(true);
  const [isVerificationExpanded, setIsVerificationExpanded] = useState(false);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  DSA User Profile
                </h3>
                {user.dsa_code && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200/80 tabular-nums">
                    {user.dsa_code}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${isStatusActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isStatusActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                  />
                  {user.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                <span className="font-semibold text-slate-900">{user.name || "N/A"}</span>
                {" · "}
                <span>{user.company_name || "N/A"}</span>
                {" · "}
                <span>{user.email || "N/A"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-sm shrink-0 ml-4"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Scrollable Body (Independent Scroll Area) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[#F8FAFC]">
          {/* SECTION 1: ACCOUNT INFORMATION */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="text-sm">🔑</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Account Credentials & Role
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">DSA Code</span>
                <span className="font-mono font-semibold text-slate-900 text-xs tabular-nums">
                  {user.dsa_code || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Account Status</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 text-[11px]">
                  {user.status || "ACTIVE"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">System Role</span>
                <span className="font-medium text-slate-900 uppercase text-xs">
                  {user.role || "DSA"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Created Date</span>
                <span className="font-normal text-slate-700 text-xs tabular-nums">{formatDate(user.created_at)}</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Updated Date</span>
                <span className="font-normal text-slate-700 text-xs tabular-nums">{formatDate(user.updated_at)}</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Password Status</span>
                <span className="font-normal text-slate-700 text-xs">
                  {Number(user.must_change_password) === 1 ? "Must Change Password" : "Configured & Active"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: PERSONAL & KYC DETAILS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="text-sm">👤</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Personal & KYC Details
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Full Name</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {user.name || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Email Address</span>
                <span className="font-medium text-slate-900 text-xs block truncate">
                  {user.email || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile Number</span>
                <span className="font-medium text-slate-900 font-mono text-xs block tabular-nums">
                  {user.mobile || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">PAN Number</span>
                <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                  {maskPan(user.pan_number)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Aadhaar Number</span>
                <span className="font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                  {maskAadhaar(user.aadhaar_number)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4: BUSINESS DETAILS & BANK DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BUSINESS DETAILS */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <span className="text-sm">🏢</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Business Entity
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Company Name</span>
                  <span className="font-semibold text-slate-900 text-right">{user.company_name || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Location</span>
                  <span className="font-normal text-slate-700 text-right">{user.location || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Constitution</span>
                  <span className="font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 text-[11px] text-right">{user.constitution_type || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-normal">GST Number</span>
                  <span className="font-mono text-slate-900 uppercase tabular-nums text-right text-xs">{user.gst_number || "Not Provided"}</span>
                </div>
              </div>
            </div>

            {/* BANK DETAILS */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <span className="text-sm">🏦</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Bank Account
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Account Holder</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[150px] text-right">{user.account_holder_name || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Account Number</span>
                  <span className="font-mono text-slate-900 tabular-nums text-right text-xs">{maskAccountNumber(user.account_number)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-normal">IFSC Code</span>
                  <span className="font-mono text-slate-900 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 tabular-nums text-right text-xs">{user.ifsc_code || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: VERIFICATION METADATA (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsVerificationExpanded(!isVerificationExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🛡️</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Verification Audit Metadata
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isVerificationExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isVerificationExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isVerificationExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5 text-xs pt-1 animate-fadeIn">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Source</span>
                  <span className="font-semibold text-slate-900 text-xs">
                    Portal Registration
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Verified By</span>
                  <span className="font-medium text-slate-800 text-xs">System Administrator</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Verified Date</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">{formatDate(user.verified_at)}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Audit Remarks</span>
                  <span className="font-normal text-slate-600 text-xs truncate block">
                    {user.remarks || "No remarks"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: VERIFICATION DOCUMENTS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsDocsExpanded(!isDocsExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📁</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Verification Documents ({documents.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isDocsExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDocsExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isDocsExpanded && (
              <div className="pt-1">
                {documents.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 rounded-md border border-slate-200/80">
                    <p className="text-xs text-slate-400 font-normal">
                      No verified documents attached to this user account.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documents.map((doc) => {
                      const docUrl = doc.secure_url || doc.cloudinary_url;

                      return (
                        <div
                          key={doc.id}
                          className="rounded-md border border-slate-200/80 bg-slate-50/50 p-3 transition-colors flex items-center justify-between gap-2.5 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base">{getDocIcon(doc.document_type)}</span>
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-900 truncate">
                                {getDocTypeLabel(doc.document_type)}
                              </span>
                              <p className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                                {doc.original_name || "Document File"}
                              </p>
                            </div>
                          </div>

                          {docUrl ? (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer text-[11px] font-medium shrink-0"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              Unavailable
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer (Sticky Bottom) */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex justify-end shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </>
  );
}
