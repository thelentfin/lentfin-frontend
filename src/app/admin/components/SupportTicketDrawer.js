"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supportTicketService } from "@/services/supportTicketService";
import { customerApiService } from "@/services/customerApiService";

export default function SupportTicketDrawer({
  ticket,
  onClose = () => { },
  onRejectApplication = () => { },
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    "Application rejected by Admin. Ticket resolved."
  );

  // Lock background scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!ticket) return null;

  const isCustomerAppTicket =
    ticket.category === "Customer Application" ||
    ticket.category === "Customer Application Support" ||
    ticket.category === "CUSTOMER_APPLICATION";

  const isResolved = (ticket.status || "").toUpperCase() === "RESOLVED";

  const handleConfirmReject = async () => {
    if (isProcessing) return;

    if (!ticket?.id) {
      toast.error("Ticket ID not found.");
      return;
    }

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for resolving this ticket.");
      return;
    }

    const caseId =
      ticket.case_id ||
      ticket.caseId ||
      ticket.customerApp?.id ||
      ticket.customerApp?.caseId;

    if (!caseId) {
      toast.error("Customer loan case ID not found on this ticket.");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Reject the customer application via existing loan case status endpoint
      const caseRes = await customerApiService.rejectLoanCase(
        caseId,
        trimmedReason
      );

      if (!caseRes || !caseRes.status) {
        toast.error(
          caseRes?.message ||
          "Failed to reject customer application. Support ticket resolution was cancelled."
        );
        return;
      }

      // Step 2: Resolve the support ticket via existing ticket resolve endpoint
      const ticketRes = await supportTicketService.resolveTicket(
        ticket.id,
        trimmedReason
      );

      if (!ticketRes || !ticketRes.status) {
        toast.error(
          ticketRes?.message ||
          "Customer application was rejected, but failed to resolve the support ticket. Please retry resolving the ticket."
        );
        onRejectApplication(ticket.id, caseId, trimmedReason, {
          appRejected: true,
          ticketResolved: false,
        });
        return;
      }

      // Step 3: Both operations succeeded
      toast.success(
        "Customer application rejected and support ticket marked as RESOLVED."
      );
      setShowRejectModal(false);
      onRejectApplication(ticket.id, caseId, trimmedReason, {
        appRejected: true,
        ticketResolved: true,
      });
    } catch (err) {
      toast.error(
        err?.message || "An unexpected error occurred while rejecting application."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytesOrStr) => {
    if (!bytesOrStr) return "File";
    return String(bytesOrStr);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Drawer Header (Sticky Top) */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Support Ticket Details
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200/80 tabular-nums">
                  {ticket.ticketNumber}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${isResolved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-blue-50 text-blue-700 border-blue-200/80"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isResolved ? "bg-emerald-500" : "bg-blue-500"
                      }`}
                  />
                  {ticket.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                Raised by {ticket.dsa?.name || "DSA Partner"}{" "}
                {ticket.dsa?.dsaCode ? `(${ticket.dsa.dsaCode})` : ""}
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
          {/* SECTION 1: SUPPORT TICKET OVERVIEW */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="text-sm">🎫</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Ticket Overview
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Ticket Number
                </span>
                <span className="font-mono font-semibold text-slate-900 text-xs tabular-nums">
                  {ticket.ticketNumber}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Category
                </span>
                <span className="font-semibold text-slate-900">
                  {ticket.category || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Current Status
                </span>
                <span className="font-semibold text-slate-900">
                  {ticket.status}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Created Date & Time
                </span>
                <span className="text-slate-700 font-medium tabular-nums">
                  {ticket.createdAt || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DSA PARTNER DETAILS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="text-sm">👤</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                DSA Partner Details
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  DSA Name
                </span>
                <span className="font-semibold text-slate-900 text-xs">
                  {ticket.dsa?.name || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  DSA Code
                </span>
                <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-[11px] inline-block tabular-nums">
                  {ticket.dsa?.dsaCode || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Email Address
                </span>
                <span className="text-slate-700 font-medium break-all">
                  {ticket.dsa?.email || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Mobile Number
                </span>
                <span className="text-slate-700 font-mono font-medium tabular-nums">
                  {ticket.dsa?.mobile || ticket.dsa?.phone || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTOMER APPLICATION DETAILS (ONLY FOR CUSTOMER APPLICATION TICKETS) */}
          {isCustomerAppTicket && ticket.customerApp && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏦</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Customer Application Details
                  </h4>
                </div>
                {ticket.customerApp.status && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${ticket.customerApp.status === "REJECTED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : ticket.customerApp.status === "ACCEPTED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                  >
                    {ticket.customerApp.status}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    Customer / Applicant Name
                  </span>
                  <span className="font-semibold text-slate-900 text-xs">
                    {ticket.customerApp.name || ticket.customerApp.customerName || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    Application Number
                  </span>
                  <span className="font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs inline-block tabular-nums">
                    {ticket.customerApp.applicationNo ||
                      ticket.customerApp.caseNumber ||
                      `APP-#${ticket.customerApp.id}`}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    Lender / Bank
                  </span>
                  <span className="font-medium text-slate-800">
                    {ticket.customerApp.bank || "N/A"}
                  </span>
                </div>

                {ticket.customerApp.sanctionAmount && (
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Sanction Amount
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {ticket.customerApp.sanctionAmount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: ISSUE TYPE & DESCRIPTION */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="text-sm">📝</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Support Request Details
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  Issue Type
                </span>
                <div className="inline-block px-2.5 py-1 rounded bg-slate-50 border border-slate-200 font-semibold text-slate-900">
                  {ticket.issueType || "General Query"}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  Description
                </span>
                <div className="rounded-md bg-slate-50/80 border border-slate-200/80 p-3 text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                  {ticket.description || "No description provided."}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: ATTACHMENTS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">📎</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Attached Documents
                </h4>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {ticket.attachments?.length || 0} file(s)
              </span>
            </div>

            {ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ticket.attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-sm shrink-0 border border-slate-200/60">
                        {file.type?.includes("pdf") || file.name?.endsWith(".pdf")
                          ? "📄"
                          : file.name?.match(/\.(jpg|jpeg|png)$/i)
                            ? "🖼️"
                            : "📎"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-xs truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-[#B063FF] hover:underline cursor-pointer shrink-0"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        View
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No attachments uploaded with this ticket.
              </p>
            )}
          </div>
        </div>

        {/* Drawer Footer (Sticky Bottom) */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-white flex items-center justify-between gap-3 sticky bottom-0 z-10 shrink-0">
          <div>
            {isResolved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                This ticket is marked as Resolved.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isCustomerAppTicket && !isResolved && (
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>Reject Application</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* REJECT APPLICATION CONFIRMATION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xl max-w-md w-full p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <div className="w-9 h-9 rounded-md bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center text-base font-semibold shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Are you sure you want to reject this application?
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Ticket {ticket.ticketNumber} •{" "}
                  {ticket.customerApp?.name ||
                    ticket.customerApp?.customerName ||
                    "Customer Application"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Rejecting this application will reject the customer application. The customer will need to submit a new application. This support ticket will also be marked as resolved.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="reject-reason-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Resolution / Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isProcessing}
                placeholder="Enter reason for rejecting application and resolving ticket..."
                className="w-full text-xs rounded-md border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#B063FF]/30 focus:border-[#B063FF] transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5 text-white"
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
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject Application</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
