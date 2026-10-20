"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminCarLoanDetailsModal({
  item,
  isOpen,
  onClose = () => {},
  onActionSuccess = () => {},
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [acceptError, setAcceptError] = useState("");
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);

  // Document verification checkboxes
  const [verifiedDocs, setVerifiedDocs] = useState({
    carPhoto: false,
    invoice: false,
    insurance: false,
    paymentAdvice: false,
  });

  // Lock background scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!isOpen || !item) return null;

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const caseId = item.id || item.case_id;
  const caseNumber = item.case_number || `CASE-${String(caseId).padStart(6, "0")}`;
  const customerName = item.customer_name || "—";
  const mobileNumber = item.mobile_number || "—";
  const bankName = item.bank_name || item.bank?.bank_name || "—";
  const companyName = item.company_name || item.company?.company_name || "—";
  const dsaName = item.dsa?.name || "—";
  const dsaCode = item.dsa?.dsa_code || "—";
  const subDsaName = item.sub_dsa?.name || null;
  const subDsaCode = item.sub_dsa?.dsa_code || null;

  const currentStatus = (item.status || "SUBMITTED").toUpperCase();
  const isSubmitted = currentStatus === "SUBMITTED";
  const isAccepted = currentStatus === "ACCEPTED" || currentStatus === "APPROVED";
  const isRejected = currentStatus === "REJECTED";

  const carDetails = item.car_loan_details || {};
  const bankerName = carDetails.banker_name || "—";
  const bankerMobile = carDetails.banker_mobile || "—";
  const carPhotos = Array.isArray(carDetails.car_photos) ? carDetails.car_photos : [];
  const invoiceUrl = carDetails.invoice_copy_url;
  const insuranceUrl = carDetails.insurance_copy_url;
  const paymentAdviceUrl = carDetails.payment_advice_url;

  // Handle Accept / Approve
  const handleAcceptSubmit = async () => {
    setAcceptError("");
    setIsAccepting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing. Please log in again.");

      const response = await fetch(
        `${API_BASE_URL}/loan-case/admin/status/${caseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "ACCEPTED" }),
        }
      );

      const json = await response.json();
      if (response.ok && json.status) {
        toast.success("Car loan application approved successfully!");
        setShowAcceptConfirm(false);
        onActionSuccess(caseId, "ACCEPTED");
        onClose();
      } else {
        throw new Error(json.message || "Failed to approve car loan.");
      }
    } catch (err) {
      setAcceptError(err.message || "Failed to accept application.");
      toast.error(err.message || "Failed to accept application.");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Reject
  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    setRejectError("");
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      setRejectError("Rejection reason must be at least 5 characters long.");
      return;
    }

    setIsRejecting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const response = await fetch(
        `${API_BASE_URL}/loan-case/admin/status/${caseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "REJECTED", reject_reason: reason }),
        }
      );

      const json = await response.json();
      if (response.ok && json.status) {
        toast.success("Car loan application rejected.");
        setShowRejectModal(false);
        onActionSuccess(caseId, "REJECTED");
        onClose();
      } else {
        throw new Error(json.message || "Failed to reject car loan.");
      }
    } catch (err) {
      setRejectError(err.message || "Failed to reject application.");
      toast.error(err.message || "Failed to reject application.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed -inset-6 z-40 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden h-full max-h-screen overscroll-contain animate-in slide-in-from-right duration-200">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight truncate">
                Car Loan Application Details
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-normal truncate">
                <span className="font-semibold text-slate-900">{customerName}</span>
                {" · "}
                <span>
                  DSA: {dsaName} {dsaCode ? `(${dsaCode})` : ""}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 sm:ml-4">
            {/* Status Pill Badge */}
            {isAccepted ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Accepted
              </span>
            ) : isRejected ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                Rejected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Submitted
              </span>
            )}

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-sm"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body (Independent Scroll Area) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 custom-scrollbar bg-[#F8FAFC]">
          {/* REJECTION REASON CARD (shown only for REJECTED applications) */}
          {isRejected && item.reject_reason && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-3.5 sm:p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-xs border-b border-red-200/80 pb-2">
                <span className="text-sm">⚠️</span>
                <h4 className="uppercase tracking-wider">Rejection Reason</h4>
              </div>
              <p className="text-xs text-red-900 font-medium leading-relaxed">
                {item.reject_reason}
              </p>
            </div>
          )}

          {/* SECTION 1: CUSTOMER & CASE OVERVIEW */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <span className="text-sm">👤</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Customer & Case Overview
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5 text-xs">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Customer Name
                </span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {customerName}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Mobile Number
                </span>
                <a
                  href={`tel:${mobileNumber}`}
                  className="font-mono font-medium text-[#B063FF] hover:underline text-xs block tabular-nums truncate"
                >
                  {mobileNumber}
                </a>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Case Number
                </span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums truncate">
                  {caseNumber}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Lending Bank
                </span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {bankName}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Corporate Company
                </span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {companyName}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Partner DSA
                </span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {dsaName} {dsaCode ? `(${dsaCode})` : ""}
                </span>
              </div>

              {subDsaName && (
                <div className="min-w-0 col-span-2">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                    Referral Sub-DSA
                  </span>
                  <span className="font-medium text-purple-700 text-xs block truncate">
                    {subDsaName} {subDsaCode ? `(${subDsaCode})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: BANKER / EXECUTIVE CONTACT */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <span className="text-sm">👔</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Banker / Executive Contact
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5 text-xs">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Executive Name
                </span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {bankerName}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Executive Mobile
                </span>
                <a
                  href={`tel:${bankerMobile}`}
                  className="font-mono font-semibold text-[#B063FF] hover:underline text-xs block tabular-nums truncate"
                >
                  {bankerMobile}
                </a>
              </div>

              <div className="min-w-0 col-span-2">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">
                  Associated Bank
                </span>
                <span className="font-medium text-slate-700 text-xs block truncate">
                  {bankName}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CAR PHOTOS WITH NUMBER PLATE */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">📸</span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Car Photos with Number Plate ({carPhotos.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Front photo with legible number plate is mandatory for verification
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#B063FF] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={verifiedDocs.carPhoto}
                  onChange={(e) =>
                    setVerifiedDocs({ ...verifiedDocs, carPhoto: e.target.checked })
                  }
                  className="rounded text-[#B063FF] focus:ring-[#B063FF]"
                />
                Verify Photos
              </label>
            </div>

            {carPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {carPhotos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoPreview(photoUrl)}
                    className="group relative aspect-4/3 rounded-lg border border-slate-200 overflow-hidden bg-slate-950 cursor-pointer shadow-xs hover:border-[#B063FF] transition-all"
                  >
                    <img
                      src={photoUrl}
                      alt={`Car Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span
                      className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        idx === 0
                          ? "bg-[#B063FF] text-white shadow-xs"
                          : "bg-black/70 text-white backdrop-blur-xs"
                      }`}
                    >
                      {idx === 0 ? "★ Front Photo" : `#${idx + 1}`}
                    </span>
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to View
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No car photos uploaded.
              </div>
            )}
          </div>

          {/* SECTION 4: VEHICLE VERIFICATION DOCUMENTS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">📑</span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Vehicle Verification Documents
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verify dealer purchase invoice, active insurance, and payment advice
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Document 1: Purchase Invoice */}
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">1. Invoice Copy</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      • Dealer vehicle purchase invoice
                    </span>
                  </div>
                  {invoiceUrl ? (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#B063FF] hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Invoice Document ↗</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 block mt-0.5">Not Uploaded</span>
                  )}
                </div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#B063FF] cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={verifiedDocs.invoice}
                    onChange={(e) =>
                      setVerifiedDocs({ ...verifiedDocs, invoice: e.target.checked })
                    }
                    className="rounded text-[#B063FF] focus:ring-[#B063FF]"
                  />
                  Verified
                </label>
              </div>

              {/* Document 2: Insurance Policy */}
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">2. Insurance Copy</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      • Valid vehicle insurance policy
                    </span>
                  </div>
                  {insuranceUrl ? (
                    <a
                      href={insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#B063FF] hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Insurance Policy ↗</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 block mt-0.5">Not Uploaded</span>
                  )}
                </div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#B063FF] cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={verifiedDocs.insurance}
                    onChange={(e) =>
                      setVerifiedDocs({ ...verifiedDocs, insurance: e.target.checked })
                    }
                    className="rounded text-[#B063FF] focus:ring-[#B063FF]"
                  />
                  Verified
                </label>
              </div>

              {/* Document 3: Payment Advice */}
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">3. Payment Advice</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      • Bank payment advice / sanction
                    </span>
                  </div>
                  {paymentAdviceUrl ? (
                    <a
                      href={paymentAdviceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#B063FF] hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Payment Advice ↗</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 block mt-0.5">Not Uploaded</span>
                  )}
                </div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#B063FF] cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={verifiedDocs.paymentAdvice}
                    onChange={(e) =>
                      setVerifiedDocs({ ...verifiedDocs, paymentAdvice: e.target.checked })
                    }
                    className="rounded text-[#B063FF] focus:ring-[#B063FF]"
                  />
                  Verified
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer with Actions */}
        <div className="px-3.5 sm:px-6 py-3 border-t border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {isSubmitted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isAccepting || isRejecting}
                  className="px-3.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold text-red-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reject Application
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAcceptError("");
                    setShowAcceptConfirm(true);
                  }}
                  disabled={isAccepting || isRejecting}
                  className="px-4 py-1.5 rounded-md btn-primary text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>✓</span>
                  <span>Accept & Approve</span>
                </button>
              </>
            )}

            {isAccepted && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
                ✓ Application Approved
              </span>
            )}

            {isRejected && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
                ✕ Application Rejected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM ACCEPT APPLICATION MODAL (Matches General Loan Style) */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-sm font-semibold shrink-0">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm Application Acceptance
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Car Loan Case • {customerName}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 text-xs space-y-1.5 font-normal">
              <p className="font-semibold text-slate-900">
                Acceptance Notice
              </p>
              <p className="leading-relaxed">
                Accepting this car loan case will mark it as <strong className="text-slate-900 font-semibold">ACCEPTED</strong> and notify the DSA partner.
              </p>
            </div>

            {acceptError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️ {acceptError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                disabled={isAccepting}
                onClick={() => setShowAcceptConfirm(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptSubmit}
                disabled={isAccepting}
                className="px-4 py-1.5 rounded-md btn-primary text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Accepting...</span>
                  </>
                ) : (
                  <span>Confirm & Accept</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PHOTO ZOOM MODAL */}
      {activePhotoPreview && (
        <div
          onClick={() => setActivePhotoPreview(null)}
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
            <img
              src={activePhotoPreview}
              alt="Car Full Preview"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setActivePhotoPreview(null)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white font-bold hover:bg-black transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-lg border border-slate-200/80 shadow-lg p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center text-sm font-semibold shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm Application Rejection
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Car Loan Case • {customerName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Are you sure you want to reject this car loan case? This action will mark the case as <strong className="text-slate-900 font-semibold">REJECTED</strong>.
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
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || rejectionReason.trim().length < 5}
                  className={`px-4 py-1.5 rounded-md text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isRejecting || rejectionReason.trim().length < 5
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
    </>
  );
}
