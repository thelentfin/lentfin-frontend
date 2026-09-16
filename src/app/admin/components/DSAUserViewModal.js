"use client";

import React, { useState, useEffect } from "react";

export default function DSAUserViewModal({ user, onClose }) {
  // Section & Tab States
  const [activePartnerIndex, setActivePartnerIndex] = useState(0);
  const [isCredentialsExpanded, setIsCredentialsExpanded] = useState(false);
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);
  const [isBankExpanded, setIsBankExpanded] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Lock background scroll when drawer is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow || "";
      document.documentElement.style.overflow = originalHtmlOverflow || "";
    };
  }, []);

  if (!user) return null;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (type) => {
    const map = {
      CARD: "PAN Card",
      AADHAAR: "Aadhaar Card",
      PASSPORT: "Passport Photo",
      PHOTO: "Passport Photo",
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
  const partners = user.partners || [];
  const isStatusActive = (user.status || "").toUpperCase() === "ACTIVE";
  const isPartnership = user.constitution_type === "Partnership";

  // Categorize Partner 1 KYC documents vs Company / Compliance documents
  const { partner1Docs, companyDocs } = React.useMemo(() => {
    if (!documents || documents.length === 0) {
      return { partner1Docs: [], companyDocs: [] };
    }

    const p1 = [];
    const comp = [];

    documents.forEach((doc) => {
      const type = (doc.document_type || "").toUpperCase();
      if (type === "AADHAAR" || type === "PASSPORT" || type === "PHOTO") {
        p1.push(doc);
      } else if (type === "CARD") {
        p1.push(doc);
      } else if (type === "PAN") {
        if (user.constitution_type === "Partnership") {
          comp.push(doc);
        } else {
          p1.push(doc);
        }
      } else if (
        type === "PARTNERSHIP_DEED" ||
        type === "COMPANY_PAN" ||
        type === "GST" ||
        type === "MSME" ||
        type === "COI" ||
        type === "MOA_AOA" ||
        type === "LLP_AGREEMENT" ||
        type === "LLP_PAN" ||
        type === "LLP_COI"
      ) {
        comp.push(doc);
      } else {
        comp.push(doc);
      }
    });

    return { partner1Docs: p1, companyDocs: comp };
  }, [documents, user.constitution_type]);

  // Unified list of partners: Partner 1 (Primary) + all additional partners
  const allPartners = React.useMemo(() => {
    const p1 = {
      id: "primary",
      partner_number: 1,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      pan_number: user.pan_number,
      aadhaar_number: user.aadhaar_number,
      isPrimary: true,
      documents: partner1Docs,
    };

    const additional = (partners || []).map((p, idx) => ({
      ...p,
      partner_number: p.partner_number || idx + 2,
      isPrimary: false,
      documents: p.documents || [],
    }));

    return [p1, ...additional];
  }, [user, partner1Docs, partners]);

  const currentPartner = allPartners[activePartnerIndex] || allPartners[0];
  const nextPartnerIndex =
    allPartners.length > 0 ? (activePartnerIndex + 1) % allPartners.length : 0;
  const nextPartner = allPartners[nextPartnerIndex];

  const handlePartnerSwitch = (targetIndex) => {
    if (targetIndex === activePartnerIndex) return;
    setActivePartnerIndex(targetIndex);
  };

  // Document item component renderer with thumbnail preview & View link
  const renderDocumentItem = (doc, uniqueKey) => {
    const fileUrl = doc.secure_url || doc.cloudinary_url;
    const isImage =
      fileUrl &&
      (doc.resource_type === "image" ||
        /\.(jpg|jpeg|png|webp|svg|gif)($|\?)/i.test(fileUrl) ||
        ["jpg", "jpeg", "png", "webp"].includes(
          (doc.file_format || "").toLowerCase()
        ));

    return (
      <div
        key={uniqueKey}
        className="rounded-lg border border-slate-200/80 hover:border-slate-300 p-3 transition-all flex flex-col justify-between space-y-2.5 bg-white shadow-2xs"
      >
        <div className="flex items-start gap-3 min-w-0">
          {fileUrl && isImage ? (
            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 group/img">
              <img
                src={fileUrl}
                alt={getDocTypeLabel(doc.document_type)}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-md bg-purple-50 border border-purple-200/80 flex flex-col items-center justify-center shrink-0 text-purple-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                {doc.file_format ? doc.file_format.toUpperCase() : "PDF"}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-slate-900 truncate">
              {getDocTypeLabel(doc.document_type)}
            </span>
            <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
              {doc.original_name || "Uploaded Document"}
            </p>
            {doc.file_size && (
              <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">
                {formatFileSize(doc.file_size)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-purple-700 hover:text-purple-800 inline-flex items-center gap-1 transition-colors"
            >
              <span>View File</span>
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : (
            <span className="text-[10px] text-slate-400 font-normal">
              No Link
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verified
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop overlay (extended -inset-6 to eliminate edge blur gap) */}
      <div
        className="fixed -inset-6 z-40 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden h-full max-h-screen overscroll-contain">
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
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                    isStatusActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isStatusActive ? "bg-emerald-500" : "bg-slate-400"
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
                <span>{user.location || "N/A"}</span>
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

        {/* Modal Scrollable Body (Independent Scroll Area) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[#F8FAFC] overscroll-contain">
          {/* CARD 1: PERSONAL & KYC DETAILS (Always Open) */}
          <div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👤</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {isPartnership
                        ? `Personal & KYC Details — Partner ${currentPartner.partner_number}${currentPartner.isPrimary ? " (Primary DSA)" : ""}`
                        : "Personal & KYC Details"}
                    </h4>
                    {isPartnership && allPartners.length > 1 && (
                      <span className="text-[10px] font-medium text-slate-500">
                        Partner {activePartnerIndex + 1} of {allPartners.length}
                      </span>
                    )}
                  </div>
                </div>

                {isPartnership && allPartners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handlePartnerSwitch(nextPartnerIndex)}
                    className="relative top-5 left-2 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50/80 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                    title={`View Partner ${nextPartner?.partner_number} details`}
                  >
                    <span>View Partner {nextPartner?.partner_number} Details</span>
                    <svg
                      className="w-3.5 h-3.5 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Full Name</span>
                  <span className="font-semibold text-slate-900 text-xs block truncate">
                    {currentPartner.name || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Email Address</span>
                  <span className="font-medium text-slate-900 text-xs block truncate">
                    {currentPartner.email || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile Number</span>
                  <span className="font-medium text-slate-900 font-mono text-xs block tabular-nums">
                    {currentPartner.mobile || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">PAN Number</span>
                  {currentPartner.pan_number ? (
                    <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                      {currentPartner.pan_number}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">Not Provided</span>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Aadhaar Number</span>
                  {currentPartner.aadhaar_number ? (
                    <span className="font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                      {currentPartner.aadhaar_number}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">Not Provided</span>
                  )}
                </div>
              </div>

              {/* KYC Documents */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-800 tracking-tight">
                    {isPartnership
                      ? `Partner ${currentPartner.partner_number} KYC Documents (${currentPartner.documents.length})`
                      : `Personal KYC Documents (${currentPartner.documents.length})`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Aadhaar, PAN & Photo
                  </span>
                </div>

                {currentPartner.documents.length === 0 ? (
                  <div className="py-4 text-center bg-slate-50 rounded-md border border-slate-200/80">
                    <p className="text-xs text-slate-400 font-normal">
                      {isPartnership
                        ? `No KYC documents uploaded for Partner ${currentPartner.partner_number}.`
                        : "No KYC documents uploaded for this user."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentPartner.documents.map((doc, idx) =>
                      renderDocumentItem(doc, doc.id || `doc_${idx}`)
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 2: ACCOUNT CREDENTIALS & ROLE (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsCredentialsExpanded(!isCredentialsExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🔑</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Account Credentials & Role
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isCredentialsExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isCredentialsExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isCredentialsExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs pt-1 animate-fadeIn">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">DSA Code</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs tabular-nums bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block">
                    {user.dsa_code || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Account Status</span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded border text-[11px] ${
                      isStatusActive
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                        : "text-slate-700 bg-slate-100 border-slate-200/80"
                    }`}
                  >
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
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Password Status</span>
                  <span className="font-normal text-slate-700 text-xs">
                    {Number(user.must_change_password) === 1
                      ? "Must Change Password"
                      : "Configured & Active"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Created Date & Time</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums font-mono">
                    {formatDateTime(user.created_at)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Last Updated Date & Time</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums font-mono">
                    {formatDateTime(user.updated_at)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 3: COMPANY DOCUMENTS & DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">🏢</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Company Documents & Details
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isCompanyExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isCompanyExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isCompanyExpanded && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                {/* Company & Legal Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Company Name</span>
                    <span className="font-semibold text-slate-900 text-xs block truncate">
                      {user.company_name || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Type</span>
                    <span className="font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-[11px]">
                      {user.constitution_type || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Operating Location</span>
                    <span className="font-semibold text-slate-900 text-xs block truncate">
                      {user.location || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">GST Number</span>
                    {user.gst_number ? (
                      <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                        {user.gst_number}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Not Provided</span>
                    )}
                  </div>
                </div>

                {/* Company & Compliance Documents */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold text-slate-800 tracking-tight">
                      Company & Compliance Documents ({companyDocs.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Partnership deed, Firm PAN & GST
                    </span>
                  </div>

                  {companyDocs.length === 0 ? (
                    <div className="py-4 text-center bg-slate-50 rounded-md border border-slate-200/80">
                      <p className="text-xs text-slate-400 font-normal">
                        No additional company documents uploaded.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {companyDocs.map((doc, idx) =>
                        renderDocumentItem(doc, doc.id || `comp_doc_${idx}`)
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CARD 4: BANK ACCOUNT & BUSINESS DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsBankExpanded(!isBankExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🏦</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Bank Account & Business Details
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isBankExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isBankExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isBankExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs pt-1 animate-fadeIn">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Account Holder Name</span>
                  <span className="font-semibold text-slate-900 text-xs block truncate">
                    {user.account_holder_name || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Account Number</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs block tabular-nums tracking-wider">
                    {user.account_number || "N/A"}
                  </span>
                  {user.bank_name && (
                    <span className="text-[11px] text-purple-700 font-medium block mt-0.5">
                      Bank: {user.bank_name}
                    </span>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">IFSC Code</span>
                  {user.ifsc_code ? (
                    <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                      {user.ifsc_code}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">N/A</span>
                  )}
                  {user.branch_name && (
                    <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                      Branch: {user.branch_name}
                    </span>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Associated Company</span>
                  <span className="font-semibold text-slate-900 text-xs block truncate">
                    {user.company_name || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Operating Location</span>
                  <span className="font-semibold text-slate-900 text-xs block truncate">
                    {user.location || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Type</span>
                  <span className="font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-[11px]">
                    {user.constitution_type || "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 5: VERIFICATION & AUDIT METADATA (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📋</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Verification & Audit Metadata
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isMetadataExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isMetadataExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isMetadataExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs pt-1 animate-fadeIn">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Source</span>
                  <span className="font-semibold text-slate-900 text-xs">
                    Portal Registration
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Verified By</span>
                  <span className="font-medium text-slate-800 text-xs">
                    {(user.verified_by && isNaN(user.verified_by) ? user.verified_by : null) ||
                      (typeof window !== "undefined"
                        ? localStorage.getItem("userName") || localStorage.getItem("name")
                        : null) ||
                      "System Administrator"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Verified Date & Time</span>
                  <span className="font-medium text-slate-900 tabular-nums font-mono text-xs">
                    {formatDateTime(user.verified_at)}
                  </span>
                </div>

                {user.source_request_id && (
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Source Request ID</span>
                    <span className="font-mono font-medium text-slate-900 text-xs">
                      #{user.source_request_id}
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Audit Remarks</span>
                  <span className="font-normal text-slate-700 text-xs">
                    {user.remarks || "Account verified and activated."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-md btn-primary text-white text-xs font-medium transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Close Profile
          </button>
        </div>
      </div>
    </>
  );
}
