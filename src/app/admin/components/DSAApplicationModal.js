"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

export default function DSAApplicationModal({ requestId, onClose, onRejectSuccess, onVerifySuccess }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedDocs, setCheckedDocs] = useState({});

  // Reject Modal State
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Verify Modal State
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchApplicationDetails = async () => {
    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/corporate/request/${requestId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized. Insufficient permissions or session expired.");
        }
        if (response.status === 404) {
          throw new Error("Application details not found.");
        }
        throw new Error(`Failed to fetch application details (Status ${response.status})`);
      }

      const json = await response.json();

      if (json.status && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Failed to load application details.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchApplicationDetails();
    }
  }, [requestId]);

  // Lock background scroll when modal is open
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

  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonPayload);
      return parsed.id || null;
    } catch (e) {
      return null;
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setRejectError("");

    const trimmedReason = rejectionReason.trim();
    if (trimmedReason.length < 5) {
      setRejectError("Rejection reason must be at least 5 characters long.");
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      setRejectError("Unable to identify reviewer session. Please log in again.");
      return;
    }

    setIsRejecting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/corporate/request/${requestId}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reviewed_by: userId,
            rejection_reason: trimmedReason,
          }),
        }
      );

      const json = await response.json();

      if (response.ok && json.status) {
        setShowRejectConfirm(false);
        toast.success("DSA application rejected.");
        if (typeof onRejectSuccess === "function") {
          onRejectSuccess();
        } else {
          onClose();
        }
      } else {
        throw new Error(json.message || "Failed to reject application.");
      }
    } catch (err) {
      const errMsg = err.message || "An error occurred while rejecting the application.";
      setRejectError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    if (e) e.preventDefault();
    setVerifyError("");

    const userId = getUserIdFromToken();
    if (!userId) {
      setVerifyError("Unable to identify reviewer session. Please log in again.");
      return;
    }

    setIsVerifying(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/corporate/request/${requestId}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            verified_by: userId,
          }),
        }
      );

      const json = await response.json();

      if (response.ok && json.status) {
        setShowVerifyConfirm(false);
        toast.success("DSA application verified and approved!");
        if (typeof onVerifySuccess === "function") {
          onVerifySuccess(json.data);
        } else {
          onClose();
        }
      } else {
        throw new Error(json.message || "Failed to verify DSA application.");
      }
    } catch (err) {
      const errMsg = err.message || "An error occurred while verifying the application.";
      setVerifyError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDocCheckboxToggle = (docId) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      const datePart = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timePart = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${datePart} • ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  // Section & Tab States
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);
  const [isBankExpanded, setIsBankExpanded] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [activePartnerIndex, setActivePartnerIndex] = useState(0);

  const request = data?.request;
  const documents = data?.documents || [];
  const partners = data?.partners || [];

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
        // CARD is personal PAN of applicant
        p1.push(doc);
      } else if (type === "PAN") {
        if (request?.constitution_type === "Partnership") {
          // In partnership, 'PAN' is firm PAN!
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
  }, [documents, request]);

  // Unified list of partners: Partner 1 (Primary) + all additional partners
  const allPartners = React.useMemo(() => {
    if (!request) return [];

    const p1 = {
      id: "primary",
      partner_number: 1,
      name: request.name,
      email: request.email,
      mobile: request.mobile,
      pan_number: request.pan_number,
      aadhaar_number: request.aadhaar_number,
      isPrimary: true,
      documents: partner1Docs.map((d) => ({
        ...d,
        uniqueKey: d.id, // Primary documents use their numeric ID in checkedDocs
      })),
    };

    const additional = (partners || []).map((p, idx) => ({
      ...p,
      partner_number: p.partner_number || idx + 2,
      isPrimary: false,
      documents: (p.documents || []).map((doc) => ({
        ...doc,
        uniqueKey: `partner_${p.id}_${doc.id}`,
      })),
    }));

    return [p1, ...additional];
  }, [request, partner1Docs, partners]);

  const isPartnership = request?.constitution_type === "Partnership";
  const currentPartner = allPartners[activePartnerIndex] || allPartners[0];
  const nextPartnerIndex =
    allPartners.length > 0 ? (activePartnerIndex + 1) % allPartners.length : 0;
  const nextPartner = allPartners[nextPartnerIndex];

  // Immediate partner switch without any animation
  const handlePartnerSwitch = (targetIndex) => {
    if (targetIndex === activePartnerIndex) return;
    setActivePartnerIndex(targetIndex);
  };

  const partnerDocs = partners.flatMap((p) =>
    (p.documents || []).map((doc) => ({
      ...doc,
      uniqueKey: `partner_${p.id}_${doc.id}`,
    }))
  );

  const totalAllDocs = documents.length + partnerDocs.length;
  const verifiedCount =
    documents.filter((doc) => !!checkedDocs[doc.id]).length +
    partnerDocs.filter((doc) => !!checkedDocs[doc.uniqueKey]).length;

  // Verification checkbox logic: button is enabled only when all required documents are checked
  const allDocsVerified =
    totalAllDocs === 0 ||
    (documents.every((doc) => !!checkedDocs[doc.id]) &&
      partnerDocs.every((doc) => !!checkedDocs[doc.uniqueKey]));

  // Document item component renderer with thumbnail preview & verification checkbox
  const renderDocumentItem = (doc, uniqueKey) => {
    const isChecked = !!checkedDocs[uniqueKey];
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
        className={`rounded-lg border p-3 transition-all flex flex-col justify-between space-y-2.5 bg-white ${
          isChecked
            ? "border-emerald-300 bg-emerald-50/20 shadow-2xs"
            : "border-slate-200/80 hover:border-slate-300 shadow-2xs"
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Document Preview Thumbnail if image, or Document Type Badge if PDF */}
          {fileUrl && isImage ? (
            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 group/img">
              <img
                src={fileUrl}
                alt={getDocTypeLabel(doc.document_type)}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium"
                title="View full image"
              >
                View
              </a>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-md bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 text-slate-600">
              <span className="text-xl">{getDocIcon(doc.document_type)}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-400 mt-0.5">
                {doc.file_format || "PDF"}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <span className="block text-xs font-semibold text-slate-900 truncate">
                {getDocTypeLabel(doc.document_type)}
              </span>
              <span
                className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                  isChecked
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {isChecked ? "✓ Verified" : "Pending"}
              </span>
            </div>

            <p className="text-[11px] font-normal text-slate-500 truncate mt-0.5">
              {doc.original_name || "Document"}
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
              <span className="uppercase">{doc.file_format || "PDF"}</span>
              {doc.file_size ? (
                <>
                  <span>•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Bottom: View File link and Verification Checkbox */}
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

          <label
            htmlFor={`doc-check-${uniqueKey}`}
            className="text-[11px] font-medium flex items-center gap-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900"
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleDocCheckboxToggle(uniqueKey)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
              id={`doc-check-${uniqueKey}`}
            />
            <span
              className={
                isChecked
                  ? "font-semibold text-emerald-700"
                  : "font-normal text-slate-600"
              }
            >
              {isChecked ? "Verified" : "Verify Document"}
            </span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop overlay (extended -inset-6 to eliminate edge blur gap / unblurred line at bottom) */}
      <div
        className="fixed -inset-6 z-40 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden h-full max-h-screen overscroll-contain">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  DSA Application Verification
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                <span className="font-semibold text-slate-900">{request?.name || "N/A"}</span>
                {" · "}
                <span>{request?.company_name || request?.master_company_name || "N/A"}</span>
                {" · "}
                <span>{request?.location || request?.master_location_name || "N/A"}</span>
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 custom-scrollbar bg-[#F8FAFC] overscroll-contain">
          {/* LOADING STATE */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <svg
                className="animate-spin w-8 h-8 text-slate-700 mb-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-xs font-medium text-slate-600">
                Loading application details...
              </p>
            </div>
          ) : error ? (
            /* ERROR STATE */
            <div className="p-4 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
              <button
                onClick={fetchApplicationDetails}
                className="px-3 py-1 bg-white hover:bg-red-100 border border-red-200/80 text-red-800 rounded-md font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : request ? (
            <>
              {/* SECTION 1: PERSONAL & KYC DETAILS */}
              <div>
                <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">👤</span>
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
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50/80 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
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

                  {/* Personal & KYC Details Grid (Vertical 2-column layout: 3 in left column, 2 in right column) */}
                  <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-3.5 text-xs">
                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Full Name</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate" title={currentPartner.name || ""}>
                        {currentPartner.name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Email Address</span>
                      <span className="font-medium text-slate-900 text-xs block truncate" title={currentPartner.email || ""}>
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
                        Aadhaar, PAN & Photo verification
                      </span>
                    </div>

                    {currentPartner.documents.length === 0 ? (
                      <div className="py-4 text-center bg-slate-50 rounded-md border border-slate-200/80">
                        <p className="text-xs text-slate-400 font-normal">
                          {isPartnership
                            ? `No KYC documents uploaded for Partner ${currentPartner.partner_number}.`
                            : "No KYC documents uploaded for this applicant."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentPartner.documents.map((doc) =>
                          renderDocumentItem(doc, doc.uniqueKey)
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: COMPANY DOCUMENTS & DETAILS (Collapsible Section) */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 shadow-2xs">
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
                          {request.company_name || request.master_company_name || "N/A"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Type</span>
                        <span className="font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-[11px]">
                          {request.constitution_type || "N/A"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Operating Location</span>
                        <span className="font-semibold text-slate-900 text-xs block truncate">
                          {request.location || request.master_location_name || "N/A"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] font-medium text-slate-500 mb-0.5">GST Number</span>
                        {request.gst_number ? (
                          <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                            {request.gst_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Not Provided</span>
                        )}
                      </div>
                    </div>

                    {/* Company & Compliance Documents (Partnership Deed, Firm PAN, GST, etc.) */}
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
                            No additional company documents required or uploaded.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {companyDocs.map((doc) =>
                            renderDocumentItem(doc, doc.id)
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: BANK ACCOUNT & BUSINESS DETAILS (Collapsible Section) */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 shadow-2xs">
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
                        {request.account_holder_name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Account Number</span>
                      <span className="font-mono font-semibold text-slate-900 text-xs block tabular-nums tracking-wider">
                        {request.account_number || "N/A"}
                      </span>
                      {request.bank_name && (
                        <span className="text-[11px] text-purple-700 font-medium block mt-0.5">
                          Bank: {request.bank_name}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">IFSC Code</span>
                      {request.ifsc_code ? (
                        <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                          {request.ifsc_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">N/A</span>
                      )}
                      {request.branch_name && (
                        <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                          Branch: {request.branch_name}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Associated Company</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate">
                        {request.company_name || request.master_company_name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Operating Location</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate">
                        {request.location || request.master_location_name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Constitution Type</span>
                      <span className="font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-[11px]">
                        {request.constitution_type || "N/A"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: APPLICATION METADATA & TIMESTAMPS (Collapsible Section) */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                  className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Application Metadata & Timestamps
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isMetadataExpanded ? "Collapse" : "Expand"}
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isMetadataExpanded ? "rotate-180" : ""}`}
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
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Applicant Name</span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {request.name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Review Status</span>
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {request.status || "PENDING"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Date & Time</span>
                      <span className="font-medium text-slate-900 tabular-nums font-mono text-xs">
                        {formatDateTime(request.created_at)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Target Company</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate">
                        {request.company_name || request.master_company_name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Operating Location</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate">
                        {request.location || request.master_location_name || "N/A"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Fixed Sticky Bottom Action Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/80 bg-slate-50/50 shrink-0 sticky bottom-0 z-10">
          {/* Mobile warning text (no box) */}
          {!allDocsVerified && totalAllDocs > 0 && (
            <p className="sm:hidden w-full text-center text-[11px] font-medium text-amber-600 mb-2">
              Verify all {totalAllDocs} documents to approve ({verifiedCount} of {totalAllDocs} verified)
            </p>
          )}

          {/* Mobile Footer Buttons (no Close button) */}
          <div className="w-full sm:hidden flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRejectError("");
                setRejectionReason("");
                setShowRejectConfirm(true);
              }}
              className="flex-1 py-1.5 rounded-md bg-white hover:bg-red-50 text-red-600 font-medium text-xs border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer text-center"
            >
              Reject
            </button>

            <button
              type="button"
              disabled={!allDocsVerified}
              onClick={() => {
                if (!allDocsVerified) return;
                setVerifyError("");
                setShowVerifyConfirm(true);
              }}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors text-center ${
                allDocsVerified
                  ? "btn-primary cursor-pointer text-white shadow-2xs"
                  : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
              }`}
            >
              Verify & Create
            </button>
          </div>

          {/* Desktop Footer: Verify Text & Action Buttons in 1 Line (hidden sm:flex, no Close button, no box on verify line) */}
          <div className="hidden sm:flex w-full items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {!allDocsVerified && totalAllDocs > 0 && (
                <span className="text-[11px] font-medium text-amber-600 whitespace-nowrap">
                  Verify all {totalAllDocs} documents to approve ({verifiedCount} of {totalAllDocs} verified)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setRejectError("");
                  setRejectionReason("");
                  setShowRejectConfirm(true);
                }}
                className="px-3.5 py-1.5 rounded-md bg-white hover:bg-red-50 text-red-600 font-medium text-xs border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                Reject Application
              </button>

              <button
                type="button"
                disabled={!allDocsVerified}
                onClick={() => {
                  if (!allDocsVerified) return;
                  setVerifyError("");
                  setShowVerifyConfirm(true);
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                  allDocsVerified
                    ? "btn-primary cursor-pointer text-white shadow-2xs"
                    : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                }`}
              >
                Verify & Create DSA User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REJECT APPLICATION CONFIRMATION MODAL */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center text-sm font-semibold shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm Application Rejection
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  DSA Registration Request • {request?.name || "Applicant"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Are you sure you want to reject this DSA application? This action will mark the request as <strong className="text-slate-900 font-semibold">REJECTED</strong> and send an email notification to the applicant.
            </p>

            {rejectError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️ {rejectError}</span>
              </div>
            )}

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection (minimum 5 characters)..."
                  className="w-full bg-white border border-slate-200 rounded-md p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400 font-normal">
                  <span>Minimum 5 characters required</span>
                  <span className="tabular-nums">{rejectionReason.trim().length}/500</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => setShowRejectConfirm(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || rejectionReason.trim().length < 5}
                  className={`px-4 py-1.5 rounded-md text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${isRejecting || rejectionReason.trim().length < 5
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  {isRejecting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DSA VERIFICATION MODAL */}
      {showVerifyConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-sm font-semibold shrink-0">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm DSA Verification
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  DSA Registration Request • {request?.name || "Applicant"}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 text-xs space-y-1.5 font-normal">
              <p className="font-semibold text-slate-900">
                Verification Notice
              </p>
              <p className="leading-relaxed">
                Verifying this application will automatically:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                <li>Create the official active <strong>DSA User Account</strong>.</li>
                <li>Generate a unique <strong>DSA Code</strong> & credentials.</li>
                <li>Send login details to <strong>{request?.email || "registered email"}</strong>.</li>
              </ul>
            </div>

            {verifyError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️ {verifyError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => setShowVerifyConfirm(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifySubmit}
                disabled={isVerifying}
                className="px-4 py-1.5 rounded-md btn-primary text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Confirm & Verify</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
