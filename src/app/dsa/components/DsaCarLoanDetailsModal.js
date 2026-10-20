"use client";

import React, { useState, useEffect } from "react";

export default function DsaCarLoanDetailsModal({
  item,
  isOpen,
  onClose = () => {},
}) {
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const caseId = item.id || item.case_id;
  const caseNumber = item.caseNumber || item.case_number || `CASE-${String(caseId).padStart(6, "0")}`;
  const customerName = item.customerName || item.customer_name || item.name || "—";
  const mobileNumber = item.mobile || item.mobile_number || "—";
  const bankName = item.bank || item.bank_name || "—";
  const companyName = item.companyName || item.company_name || "—";
  const sanctionAmount = item.sanctionAmount || (item.rawSanctionAmount ? `₹${Number(item.rawSanctionAmount).toLocaleString("en-IN")}` : "—");
  const subDsaName = item.subDsaName || item.sub_dsa?.name || null;
  const subDsaCode = item.subDsaCode || item.sub_dsa?.dsa_code || null;

  const currentStatus = (item.status || "SUBMITTED").toUpperCase();
  const isAccepted = currentStatus === "ACCEPTED" || currentStatus === "APPROVED";
  const isRejected = currentStatus === "REJECTED";

  const carDetails = item.carLoanDetails || item.car_loan_details || {};
  const bankerName = carDetails.banker_name || "—";
  const bankerMobile = carDetails.banker_mobile || "—";
  const carPhotos = Array.isArray(carDetails.car_photos) ? carDetails.car_photos : [];
  const invoiceUrl = carDetails.invoice_copy_url;
  const insuranceUrl = carDetails.insurance_copy_url;
  const paymentAdviceUrl = carDetails.payment_advice_url;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-xl flex flex-col overflow-hidden h-full max-h-screen overscroll-contain animate-in slide-in-from-right duration-200">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-purple-50 text-[#B063FF] border border-purple-200/80 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 17a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4zm-9-8l1.5-4h7L17 9m-14 3h18l-1.5 5.5a1.5 1.5 0 01-1.45 1.1h-1.1a3.5 3.5 0 01-6.9 0h-2.1a3.5 3.5 0 01-6.9 0H3.95A1.5 1.5 0 012.5 17.5L1 12h2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight truncate">
                Car Loan Case Details
              </h3>
              <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                <span className="font-semibold text-slate-900">{customerName}</span>
                {" · "}
                <span className="font-mono text-[#B063FF] font-semibold">{caseNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Status Pill Badge */}
            {isAccepted ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Accepted
              </span>
            ) : isRejected ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                Rejected
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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

        {/* Scrollable Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700 custom-scrollbar">
          {/* Rejection Alert if Rejected */}
          {isRejected && item.rejectReason && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <span>⚠️ Rejection Reason</span>
              </div>
              <p className="text-xs text-red-700 font-normal leading-relaxed">
                {item.rejectReason}
              </p>
            </div>
          )}

          {/* Customer & Primary Info Card */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Customer & Case Overview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-slate-400 block text-[11px]">Customer Name</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">{customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Mobile Number</span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block">{mobileNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Case Number</span>
                <span className="font-mono text-[#B063FF] font-semibold text-xs mt-0.5 block">{caseNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Sanction Amount</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">{sanctionAmount}</span>
              </div>
            </div>
          </div>

          {/* Partner & Bank Overview */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Lender & Corporate Partner
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-slate-400 block text-[11px]">Lending Bank</span>
                <span className="font-medium text-slate-900 text-xs mt-0.5 block">{bankName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Corporate Company</span>
                <span className="font-medium text-slate-900 text-xs mt-0.5 block">{companyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Partner Attribution</span>
                <span className="font-medium text-slate-900 text-xs mt-0.5 block">
                  {subDsaName ? (
                    <span className="text-slate-800">
                      via {subDsaName} {subDsaCode ? <span className="font-mono text-slate-400">({subDsaCode})</span> : null}
                    </span>
                  ) : (
                    <span className="text-slate-500">Direct (Self)</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Loan Type</span>
                <span className="font-medium text-slate-900 text-xs mt-0.5 block">Car Loan (Vehicle Finance)</span>
              </div>
            </div>
          </div>

          {/* Bank Executive / Banker Details */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Bank Executive / Banker Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-slate-400 block text-[11px]">Banker Name</span>
                <span className="font-medium text-slate-900 text-xs mt-0.5 block">{bankerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Banker Contact Number</span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block">{bankerMobile}</span>
              </div>
            </div>
          </div>

          {/* Uploaded Car Photos */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Uploaded Vehicle Photos
              </h4>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {carPhotos.length} {carPhotos.length === 1 ? "photo" : "photos"}
              </span>
            </div>

            {carPhotos.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-200">
                No car photos uploaded for this application.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {carPhotos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoPreview(photoUrl)}
                    className="group relative aspect-4/3 rounded-md overflow-hidden border border-slate-200 bg-slate-100 cursor-zoom-in hover:shadow-md transition-all"
                  >
                    <img
                      src={photoUrl}
                      alt={`Car photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      🔍 Zoom
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification & Legal Documents */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Attached Documents
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-md">
              {/* Invoice Copy */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">Invoice Copy</span>
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
              </div>

              {/* Insurance Copy */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">Insurance Document</span>
                  {insuranceUrl ? (
                    <a
                      href={insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#B063FF] hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Insurance Document ↗</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 block mt-0.5">Not Uploaded</span>
                  )}
                </div>
              </div>

              {/* Payment Advice */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">Bank Payment Advice</span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200/80 bg-white flex items-center justify-end shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* FULL PHOTO ZOOM MODAL */}
      {activePhotoPreview && (
        <div
          onClick={() => setActivePhotoPreview(null)}
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
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
    </>
  );
}
