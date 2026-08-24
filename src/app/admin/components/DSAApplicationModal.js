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
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
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

  // Collapsible section states
  const [isDocsExpanded, setIsDocsExpanded] = useState(true);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  const request = data?.request;
  const documents = data?.documents || [];

  // Verification checkbox logic: button is enabled only when all required documents are checked
  const allDocsVerified =
    documents.length === 0 ||
    (documents.length > 0 && documents.every((doc) => !!checkedDocs[doc.id]));
  const verifiedCount = documents.filter((doc) => !!checkedDocs[doc.id]).length;

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
                  DSA Application Verification
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {request?.status || "PENDING"}
                </span>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[#F8FAFC]">
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
                      {request.name || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Email Address</span>
                    <span className="font-medium text-slate-900 text-xs block truncate">
                      {request.email || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile Number</span>
                    <span className="font-medium text-slate-900 font-mono text-xs block tabular-nums">
                      {request.mobile || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">PAN Number</span>
                    {request.pan_number ? (
                      <span className="font-mono font-semibold text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs">
                        {request.pan_number}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Not Provided</span>
                    )}
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Aadhaar Number</span>
                    {request.aadhaar_number ? (
                      <span className="font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                        {request.aadhaar_number}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Not Provided</span>
                    )}
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
              </div>

              {/* SECTION 2: BANK & BUSINESS DETAILS */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <span className="text-sm">🏦</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Bank Account & Business Details
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
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
              </div>

              {/* SECTION 3: APPLICATION METADATA SUMMARY (Collapsible Section) */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
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
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Registration Date</span>
                      <span className="font-normal text-slate-700 tabular-nums">{formatDate(request.created_at)}</span>
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

              {/* SECTION 4: UPLOADED VERIFICATION DOCUMENTS (Collapsible Section) */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsDocsExpanded(!isDocsExpanded)}
                  className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📁</span>
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Uploaded Verification Documents ({documents.length})
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    {documents.length > 0 && (
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border tabular-nums ${allDocsVerified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          : "bg-amber-50 text-amber-700 border-amber-200/80"
                          }`}
                      >
                        {verifiedCount} of {documents.length} Verified
                      </span>
                    )}
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
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-500 font-normal">
                      Inspect each document link and check the verification box to unlock user creation.
                    </p>

                    {documents.length === 0 ? (
                      <div className="py-6 text-center bg-slate-50 rounded-md border border-slate-200/80">
                        <p className="text-xs text-slate-400 font-normal">
                          No documents uploaded for this application.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc) => {
                          const isChecked = !!checkedDocs[doc.id];
                          return (
                            <div
                              key={doc.id}
                              className={`rounded-md border p-3 transition-colors flex flex-col justify-between space-y-3 ${isChecked
                                ? "bg-emerald-50/20 border-emerald-200/80"
                                : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300"
                                }`}
                            >
                              {/* Card Top: Type, Name, Details & Status */}
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="text-lg shrink-0 p-1.5 bg-white rounded border border-slate-200/80">
                                    {getDocIcon(doc.document_type)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-900 truncate">
                                      {getDocTypeLabel(doc.document_type)}
                                    </span>
                                    <p className="text-[11px] font-normal text-slate-500 truncate mt-0.5">
                                      {doc.original_name || "File"}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono tabular-nums">
                                      <span>{doc.file_format || "PDF"}</span>
                                      <span>•</span>
                                      <span>{formatFileSize(doc.file_size)}</span>
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`shrink-0 text-[11px] font-medium flex items-center gap-1 ${isChecked ? "text-emerald-700" : "text-slate-400"
                                    }`}
                                >
                                  {isChecked ? "✓ Verified" : "Unverified"}
                                </span>
                              </div>

                              {/* Card Bottom: Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 gap-2">
                                {doc.secure_url ? (
                                  <a
                                    href={doc.secure_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition-colors shrink-0"
                                  >
                                    <span>View File</span>
                                    <svg
                                      className="w-3 h-3 text-slate-500"
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
                                  <span className="text-[11px] text-slate-400 font-normal">No Link</span>
                                )}

                                <label
                                  htmlFor={`doc-check-${doc.id}`}
                                  className="text-[11px] font-medium flex items-center gap-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleDocCheckboxToggle(doc.id)}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                                    id={`doc-check-${doc.id}`}
                                  />
                                  <span className={isChecked ? "font-semibold text-emerald-700" : "font-normal text-slate-600"}>
                                    {isChecked ? "Verified" : "Verify Document"}
                                  </span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Fixed Sticky Bottom Action Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>

          {/* Action Buttons Container */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
            {!allDocsVerified && documents.length > 0 && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
                Verify all {documents.length} documents to approve
              </span>
            )}

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectError("");
                  setRejectionReason("");
                  setShowRejectConfirm(true);
                }}
                className="px-3.5 py-1.5 rounded-md bg-white hover:bg-red-50 text-red-600 font-medium text-xs border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer"
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
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${allDocsVerified
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
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
                className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
