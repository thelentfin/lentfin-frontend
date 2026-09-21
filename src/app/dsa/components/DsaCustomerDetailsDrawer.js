"use client";

import React, { useState, useEffect } from "react";

export default function DsaCustomerDetailsDrawer({
  customer,
  onClose = () => {},
}) {
  const [isSmAsmExpanded, setIsSmAsmExpanded] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);

  // Lock background scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!customer) return null;

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "—" || dateStr === "N/A") return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "" || amount === "—") return "N/A";
    if (typeof amount === "string" && amount.includes("₹")) return amount;
    const num = Number(String(amount).replace(/[^0-9.-]+/g, ""));
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPaymentOptionLabel = (option) => {
    if (!option || option === "—") return "Standard Payment";
    const map = {
      SPOT_48_HOURS: "Spot Payment (Within 48 Hours)",
      AFTER_5_DAYS: "Payment After 5 Days",
    };
    return map[option] || option;
  };

  const rawStatus = (customer.status || "Submitted").trim().toUpperCase();
  const isAccepted = rawStatus === "ACCEPTED" || rawStatus === "APPROVED" || rawStatus === "VERIFIED";
  const isRejected = rawStatus === "REJECTED";
  const displayStatus = isAccepted ? "Accepted" : isRejected ? "Rejected" : "Submitted";

  const isPddClearedYes = Boolean(
    customer.pddCleared === true ||
    String(customer.pddCleared).trim().toUpperCase() === "YES" ||
    String(customer.pddStatus || "").trim().toUpperCase() === "CLEARED"
  );

  const paymentOptionStr = customer.paymentType || "";
  const paymentRateLabel = customer.paymentPercentage
    ? `${customer.paymentPercentage}%`
    : paymentOptionStr.includes("48") || paymentOptionStr.includes("SPOT")
    ? "0.85%"
    : "0.90%";

  const baseLoanLabel = customer.baseLoanAmount || customer.disbursementAmount || customer.sanctionAmount || "—";

  const getCommissionAmount = () => {
    if (customer.paymentAmount && customer.paymentAmount !== "—") {
      return customer.paymentAmount;
    }
    const rawDisb = customer.rawDisbursementAmount || Number(String(customer.disbursementAmount || "0").replace(/[^0-9.-]+/g, ""));
    if (rawDisb && !isNaN(rawDisb) && rawDisb > 0) {
      const pct = customer.paymentPercentage
        ? Number(customer.paymentPercentage)
        : (paymentOptionStr.includes("48") || paymentOptionStr.includes("SPOT") ? 0.85 : 0.90);
      const calc = Math.round((rawDisb * pct) / 100);
      return formatCurrency(calc);
    }
    return "—";
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
      />

      {/* Slide-over Drawer Workspace Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Customer Application Details
                </h3>
                {(customer.caseNumber || customer.applicationNo) && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200/80 tabular-nums">
                    {customer.caseNumber || customer.applicationNo}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                    isAccepted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : isRejected
                      ? "bg-red-50 text-red-700 border-red-200/80"
                      : "bg-blue-50 text-blue-700 border-blue-200/80"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isAccepted
                        ? "bg-emerald-500"
                        : isRejected
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                  />
                  {displayStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                <span className="font-semibold text-slate-900">
                  {customer.customerName || customer.name || "N/A"}
                </span>
                {" · "}
                <span className="tabular-nums">
                  App No: {customer.applicationNo || "N/A"}
                </span>
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

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[#F8FAFC]">
          {/* REJECTION REASON CARD (shown only for REJECTED applications) */}
          {isRejected && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-xs border-b border-red-200/80 pb-2">
                <span className="text-sm">⚠️</span>
                <h4 className="uppercase tracking-wider">Rejection Reason</h4>
              </div>
              <p className="text-xs text-red-900 font-medium leading-relaxed">
                {customer.rejectReason ||
                  customer.reject_reason ||
                  "No specific reason provided."}
              </p>
            </div>
          )}

          {/* SECTION 1: CUSTOMER & CASE INFORMATION */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="text-sm">👤</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Customer & Case Overview
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Customer Name</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {customer.customerName || customer.name || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {customer.mobile || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Application Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {customer.applicationNo || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Loan Account Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {customer.loanAccountNo || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Lending Bank</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {customer.bank || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Case Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {customer.caseNumber || customer.applicationNo || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Sanction Amount</span>
                <span className="font-semibold text-slate-900 text-xs block tabular-nums">
                  {formatCurrency(customer.sanctionAmount)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Submitted Date</span>
                <span className="font-normal text-slate-700 text-xs block tabular-nums">
                  {formatDate(customer.createdAt || customer.disbursementDate)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2 & 3: SANCTION & DISBURSEMENT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SANCTION DETAILS */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <span className="text-sm">📜</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Sanction Details
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Sanction Amount</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(customer.sanctionAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Sanction Status</span>
                  <span className="font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                    {customer.status || "Active"}
                  </span>
                </div>
              </div>

              {/* Sanction Document Container */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  Sanction Letter
                </span>
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">📄</span>
                    <span className="block text-xs font-medium text-slate-900 truncate">
                      {customer.sanctionLetterName || "sanction_letter.pdf"}
                    </span>
                  </div>

                  {customer.sanctionLetterUrl ? (
                    <a
                      href={customer.sanctionLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-[11px] font-medium shrink-0 cursor-pointer"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* DISBURSEMENT DETAILS */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <span className="text-sm">💸</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Disbursement Details
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Type</span>
                  <span className="font-semibold text-slate-900 text-xs">
                    {customer.disbursementType || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Amount</span>
                  <span className="font-semibold text-emerald-700 text-xs tabular-nums">
                    {formatCurrency(customer.disbursementAmount)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Date</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">
                    {formatDate(customer.disbursementDate)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Rate (ROI)</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">
                    {customer.rate || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Processing Fee</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">
                    {formatCurrency(customer.pf)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Tenure</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">
                    {customer.tenure || "N/A"}
                  </span>
                </div>

                {customer.insuranceAmount && customer.insuranceAmount !== "—" && (
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Insurance</span>
                    <span className="font-normal text-slate-700 text-xs tabular-nums">
                      {formatCurrency(customer.insuranceAmount)}
                    </span>
                  </div>
                )}

                {customer.chequeHandoverDate && customer.chequeHandoverDate !== "—" && (
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Cheque Date</span>
                    <span className="font-normal text-slate-700 text-xs tabular-nums">
                      {formatDate(customer.chequeHandoverDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: PDD DETAILS & DOCUMENT */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="text-sm">🔍</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                PDD Details & Verification Document
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  PDD Cleared Status
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                    isPddClearedYes
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80"
                  }`}
                >
                  {isPddClearedYes ? "✓ Cleared (YES)" : "Pending (NO)"}
                </span>
              </div>

              {isPddClearedYes && (
                <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-md border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">📜</span>
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-slate-900 truncate">
                        {customer.pddDocumentName || "pdd_document.pdf"}
                      </span>
                      <p className="text-[10px] text-slate-500 font-normal truncate">
                        PDD Verification Document
                      </p>
                    </div>
                  </div>

                  {customer.pddDocumentUrl ? (
                    <a
                      href={customer.pddDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-[11px] font-medium shrink-0 cursor-pointer"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      Unavailable
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: SM & ASM DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsSmAsmExpanded(!isSmAsmExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">👥</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Sales Manager (SM) & Area Sales Manager (ASM) Details
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isSmAsmExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isSmAsmExpanded ? "rotate-180" : ""
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

            {isSmAsmExpanded && (
              <div className="pt-1 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* SM Details */}
                  <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200/80 space-y-2">
                    <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                      Sales Manager (SM)
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Name:</span>
                        <span className="font-semibold text-slate-900">{customer.smName || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Mobile:</span>
                        <span className="font-medium text-slate-900 tabular-nums">{customer.smNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Email:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[180px]">{customer.smEmail || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* ASM Details */}
                  <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200/80 space-y-2">
                    <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                      Area Sales Manager (ASM)
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Name:</span>
                        <span className="font-semibold text-slate-900">{customer.asmName || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Mobile:</span>
                        <span className="font-medium text-slate-900 tabular-nums">{customer.asmNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-normal">Email:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[180px]">{customer.asmEmail || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: PAYMENT / COMMISSION DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2.5 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">💳</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Payment & Commission Details
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isPaymentExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isPaymentExpanded ? "rotate-180" : ""
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

            {isPaymentExpanded && (
              <div className="pt-1 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5 text-xs">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Option</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {formatPaymentOptionLabel(customer.paymentType)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Rate</span>
                    <span className="font-medium text-slate-900 text-xs tabular-nums">
                      {paymentRateLabel}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Base Loan Amount</span>
                    <span className="font-medium text-slate-900 text-xs tabular-nums">
                      {formatCurrency(baseLoanLabel)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Amount</span>
                    <span className="font-semibold text-emerald-700 text-xs tabular-nums">
                      {getCommissionAmount()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer (Sticky Bottom) */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0 sticky bottom-0 z-10">
          <div className="text-[11px] text-slate-500 font-normal">
            Application Status:{" "}
            <span className="font-semibold text-slate-800">{displayStatus}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </>
  );
}
