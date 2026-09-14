"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import { customerApiService } from "@/services/customerApiService";
import { supportTicketService } from "@/services/supportTicketService";
import {
  CUSTOMER_APP_ISSUE_TYPES,
  GENERAL_ISSUE_TYPES,
  ACCOUNT_ISSUE_TYPES,
  MAX_ATTACHMENT_COUNT,
  validateSupportFile,
  createSupportTicketSchema,
} from "@/schemas/supportTicketSchema";

const CATEGORY_CONFIG = {
  "customer-application": {
    categoryTitle: "Customer Application",
    pageTitle: "Customer Application Support",
    requestHeading: "Raise Customer Application Support",
    badgeLabel: "Customer Application",
    subtitle: "Tell us what went wrong and we'll help you resolve it.",
    issueTypes: CUSTOMER_APP_ISSUE_TYPES,
    showCustomerFields: true,
  },
  general: {
    categoryTitle: "General Support",
    pageTitle: "General Support",
    requestHeading: "Raise General Support",
    badgeLabel: "General Support",
    subtitle: "Tell us what went wrong and we'll help you resolve it.",
    issueTypes: GENERAL_ISSUE_TYPES,
    showCustomerFields: false,
  },
  account: {
    categoryTitle: "Account / Profile Support",
    pageTitle: "Account / Profile Support",
    requestHeading: "Raise Account & Profile Support",
    badgeLabel: "Account & Profile",
    subtitle: "Tell us what went wrong and we'll help you resolve it.",
    issueTypes: ACCOUNT_ISSUE_TYPES,
    showCustomerFields: false,
  },
};

export default function SupportTicketView({
  category = "customer-application",
  onBack = () => {},
  dsaName = "",
  dsaProfile = null,
  customerCases: propCustomerCases = null,
  isLoadingCases: propIsLoadingCases = null,
}) {
  const config =
    CATEGORY_CONFIG[category] || CATEGORY_CONFIG["customer-application"];
  const isCustomerApp = category === "customer-application";

  // Autofilled / Read-only DSA profile info
  const dsaInfo = useMemo(() => {
    let name = dsaProfile?.name || dsaName || "";
    let email = dsaProfile?.email || "";
    let mobile = dsaProfile?.mobile || dsaProfile?.phone || "";
    let dsaCode =
      dsaProfile?.dsa_code || (dsaProfile?.id ? `DSA-${dsaProfile.id}` : "");

    if (typeof window !== "undefined") {
      if (!name)
        name =
          localStorage.getItem("userName") ||
          localStorage.getItem("name") ||
          "DSA Partner";
      if (!email)
        email =
          localStorage.getItem("userEmail") ||
          localStorage.getItem("email") ||
          "dsa.partner@lentfin.com";
      if (!mobile)
        mobile =
          localStorage.getItem("userMobile") ||
          localStorage.getItem("mobile") ||
          "+91 98765 43210";
      if (!dsaCode) dsaCode = localStorage.getItem("dsaCode") || "DSA-PARTNER";
    }

    return { name, email, mobile, dsaCode };
  }, [dsaProfile, dsaName]);

  // Form State
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Customer Applications State from API
  const [internalCases, setInternalCases] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [casesError, setCasesError] = useState("");

  const hasParentCases =
    Array.isArray(propCustomerCases) && propCustomerCases.length > 0;
  const isParentLoading = propIsLoadingCases === true;

  // Fetch applications if not provided by parent or if parent finished with 0 cases
  useEffect(() => {
    if (!isCustomerApp) return;

    if (hasParentCases) {
      setInternalCases(propCustomerCases);
      setInternalLoading(false);
      return;
    }

    if (isParentLoading) {
      setInternalLoading(true);
      return;
    }

    let isMounted = true;
    setInternalLoading(true);
    setCasesError("");

    customerApiService
      .fetchCustomerCases()
      .then((data) => {
        if (!isMounted) return;
        setInternalCases(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch customer cases in SupportTicketView:", err);
        const msg = "Unable to load customer applications. Please try again.";
        setCasesError(msg);
        sonnerToast.error(msg);
      })
      .finally(() => {
        if (isMounted) setInternalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isCustomerApp, hasParentCases, isParentLoading, propCustomerCases]);

  const activeCustomerCases = hasParentCases ? propCustomerCases : internalCases;
  const isLoadingCases = isParentLoading || internalLoading;

  // Validation & Submission States
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);

  // Filter dynamically loaded customer applications: show ONLY SUBMITTED and ACCEPTED (exclude REJECTED, DRAFT, etc.)
  const eligibleCustomerCases = useMemo(() => {
    if (!activeCustomerCases || activeCustomerCases.length === 0) return [];
    return activeCustomerCases.filter((c) => {
      const s = String(c.status || "").trim().toUpperCase();
      return s === "SUBMITTED" || s === "ACCEPTED";
    });
  }, [activeCustomerCases]);

  // Selected case details helper (matches on numeric case ID)
  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return eligibleCustomerCases.find(
      (c) => String(c.id) === String(selectedCaseId),
    );
  }, [selectedCaseId, eligibleCustomerCases]);

  // Searchable Customer Application Selector State
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState(false);
  const caseDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        caseDropdownRef.current &&
        !caseDropdownRef.current.contains(event.target)
      ) {
        setIsCaseDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsCaseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filter ONLY by customer name (not application number, not bank) from eligible cases
  const filteredCustomerCases = useMemo(() => {
    if (!eligibleCustomerCases || eligibleCustomerCases.length === 0) return [];
    if (!caseSearchQuery.trim()) return eligibleCustomerCases;
    const query = caseSearchQuery.toLowerCase().trim();
    return eligibleCustomerCases.filter((c) => {
      const name = (c.customerName || c.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [eligibleCustomerCases, caseSearchQuery]);

  // Clear specific error on field change
  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // File Upload Handlers (Strict client validation matching backend: Max 5 files, 5 MB, JPG, PNG, PDF)
  const handleFileSelection = (files) => {
    if (!files || files.length === 0) return;
    const currentCount = attachedFiles.length;
    const newFilesArray = Array.from(files);

    if (currentCount + newFilesArray.length > MAX_ATTACHMENT_COUNT) {
      const msg = `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`;
      setErrors((prev) => ({ ...prev, attachments: msg }));
      sonnerToast.error(msg);
      return;
    }

    const validNewFiles = [];
    for (const file of newFilesArray) {
      const check = validateSupportFile(file);
      if (!check.valid) {
        setErrors((prev) => ({ ...prev, attachments: check.error }));
        sonnerToast.error(check.error);
        return;
      }
      validNewFiles.push({
        rawFile: file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
      });
    }

    setAttachedFiles((prev) => [...prev, ...validNewFiles]);
    clearFieldError("attachments");
    sonnerToast.success(`Added ${validNewFiles.length} file(s).`);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
    clearFieldError("attachments");
  };

  // Submit Handler integrating with POST /api/support-ticket/create
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const schema = createSupportTicketSchema(category);
    const parseResult = schema.safeParse({
      issueType,
      description,
      selectedCaseId,
    });

    if (!parseResult.success) {
      const newErrors = {};
      parseResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (!newErrors[field]) {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      sonnerToast.error("Please resolve the highlighted errors before submitting.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const backendCategory =
        category === "customer-application"
          ? "CUSTOMER_APPLICATION"
          : "GENERAL_SUPPORT";

      const formData = new FormData();
      formData.append("category", backendCategory);
      formData.append("case_id", String(selectedCaseId));
      formData.append("issue_type", issueType);
      formData.append("description", description.trim());

      attachedFiles.forEach((item) => {
        if (item.rawFile instanceof File) {
          formData.append("attachments", item.rawFile);
        }
      });

      const response = await supportTicketService.createTicket(formData);

      if (!response || !response.status) {
        const errorMsg =
          response?.message ||
          "Failed to create support ticket. Please try again.";
        sonnerToast.error(errorMsg);
        setErrors((prev) => ({ ...prev, submit: errorMsg }));
        setIsSubmitting(false);
        return;
      }

      const created = response.data?.ticket || {};
      const caseInfo = response.data?.loan_case || selectedCase || {};
      const uploadedAttachments = response.data?.attachments || [];

      // Find human-readable label for issue type
      const matchedIssue = config.issueTypes.find((t) =>
        typeof t === "object"
          ? t.value === created.issue_type || t.value === issueType
          : t === created.issue_type || t === issueType,
      );
      const issueLabel =
        typeof matchedIssue === "object"
          ? matchedIssue.label
          : created.issue_type || issueType;

      const newTicket = {
        ticketId: created.ticket_id,
        ticketNumber: created.ticket_number,
        status: created.status || "OPEN",
        category: config.categoryTitle,
        pageTitle: config.pageTitle,
        issueType: issueLabel,
        description: created.description || description.trim(),
        applicationRef:
          caseInfo.customer_name || caseInfo.customerName
            ? `${caseInfo.customer_name || caseInfo.customerName} (${caseInfo.case_number || caseInfo.caseNumber || caseInfo.applicationNo || selectedCaseId})`
            : selectedCase
            ? `${selectedCase.customerName || selectedCase.name} (${selectedCase.applicationNo || selectedCase.caseNumber || selectedCaseId})`
            : `Case #${selectedCaseId}`,
        attachedCount: uploadedAttachments.length || attachedFiles.length,
        createdAt: created.created_at
          ? new Date(created.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
      };

      setGeneratedTicket(newTicket);
      sonnerToast.success(
        `Ticket ${created.ticket_number || ""} created successfully!`,
      );
    } catch (err) {
      console.error("Support Ticket Submission Error:", err);
      const errorMsg =
        err.message || "An unexpected error occurred. Please try again.";
      sonnerToast.error(errorMsg);
      setErrors((prev) => ({ ...prev, submit: errorMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIssueType("");
    setDescription("");
    setSelectedCaseId("");
    setAttachedFiles([]);
    setErrors({});
    setGeneratedTicket(null);
    setCaseSearchQuery("");
    setIsCaseDropdownOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Support Subpage Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
            {config.requestHeading}
          </h1>

          <button
            type="button"
            onClick={onBack}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            title="Back to Support Center"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#B063FF] font-normal">
          Tell us what went wrong and we'll help you resolve it.
        </p>
      </div>

      {/* SUCCESS STATE CARD (Rendered after ticket creation) */}
      {generatedTicket ? (
        <div className="rounded-lg border border-emerald-200/80 bg-white p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Ticket Raised Successfully
              </span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <h2 className="text-xl font-bold text-slate-900 font-mono">
                  {generatedTicket.ticketNumber}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {generatedTicket.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your support request has been submitted. Our operations desk will inspect your case.
              </p>
            </div>
          </div>

          {/* Ticket Summary Details */}
          <div className="max-w-2xl mx-auto rounded-md bg-slate-50 border border-slate-200/80 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">
                  Support Category
                </span>
                <span className="font-semibold text-slate-900">
                  {generatedTicket.pageTitle}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">
                  Issue Type
                </span>
                <span className="font-semibold text-slate-900">
                  {generatedTicket.issueType}
                </span>
              </div>
              {generatedTicket.applicationRef && (
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                    Customer Application
                  </span>
                  <span className="font-semibold text-slate-900">
                    {generatedTicket.applicationRef}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">
                  Submitted By
                </span>
                <span className="font-medium text-slate-900">
                  {dsaInfo.name} ({dsaInfo.dsaCode})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">
                  Submission Time
                </span>
                <span className="font-medium text-slate-900">
                  {generatedTicket.createdAt}
                </span>
              </div>
            </div>

            {generatedTicket.attachedCount > 0 && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                📎 {generatedTicket.attachedCount} attachment(s) included with this ticket.
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Return to Support Center
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 text-xs font-medium text-white bg-[#B063FF] hover:bg-[#9d4eed] rounded-md transition-colors cursor-pointer shadow-xs"
            >
              Raise Another Ticket
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Submission Error Banner */}
          {errors.submit && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errors.submit}</span>
              </div>
              <button
                type="button"
                onClick={() => clearFieldError("submit")}
                className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Support Ticket Form Details */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {isCustomerApp
                  ? "Customer Application Support Ticket Details"
                  : `${config.pageTitle} Ticket Details`}
              </h3>
            </div>

            {/* Customer Application Selector (ONLY for Customer Application flow) */}
            {config.showCustomerFields && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-800">
                  Customer Application <span className="text-red-500">*</span>
                </label>

                <div className="relative w-full max-w-xl" ref={caseDropdownRef}>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCaseDropdownOpen}
                    disabled={isLoadingCases}
                    onClick={() => {
                      if (isLoadingCases) return;
                      setIsCaseDropdownOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setTimeout(() => searchInputRef.current?.focus(), 50);
                        }
                        return next;
                      });
                    }}
                    className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-xs bg-white transition-colors text-left focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] min-h-[38px] ${
                      isLoadingCases
                        ? "bg-slate-50/70 border-slate-200 cursor-wait text-slate-400"
                        : "cursor-pointer"
                    } ${
                      errors.selectedCaseId
                        ? "border-red-400 bg-red-50/30"
                        : isCaseDropdownOpen
                        ? "border-[#B063FF] ring-1 ring-[#B063FF]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {isLoadingCases ? (
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        <svg
                          className="animate-spin w-3.5 h-3.5 text-[#B063FF]"
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
                        <span>Loading customer applications...</span>
                      </span>
                    ) : selectedCase ? (
                      <span className="flex flex-col text-left truncate pr-2 gap-0.5">
                        <span className="font-semibold text-slate-900 leading-tight truncate">
                          {selectedCase.customerName ||
                            selectedCase.customer_name ||
                            selectedCase.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal leading-tight truncate">
                          {selectedCase.applicationNo ||
                            selectedCase.application_number ||
                            selectedCase.caseNumber ||
                            selectedCase.case_number ||
                            `APP-#${selectedCase.id}`}{" "}
                          • {selectedCase.bank || selectedCase.bank_name || "Bank Partner"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400 truncate pr-2">
                        Select customer application ▾
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                        isCaseDropdownOpen ? "rotate-180 text-[#B063FF]" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Searchable Dropdown Menu */}
                  {isCaseDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-md border border-slate-200 shadow-lg py-1 animate-fadeIn">
                      {/* Search Input Filter - Filters ONLY by customer name */}
                      <div className="p-2 border-b border-slate-100 bg-white">
                        <div className="relative">
                          <svg
                            className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={caseSearchQuery}
                            onChange={(e) => setCaseSearchQuery(e.target.value)}
                            placeholder="Search by customer name..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded border border-slate-200 bg-slate-50/60 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] focus:border-[#B063FF]"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {caseSearchQuery && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseSearchQuery("");
                                searchInputRef.current?.focus();
                              }}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                              title="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Application List (Each item displays Customer Name + Application Number + Bank) */}
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {isLoadingCases ? (
                          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <svg
                              className="animate-spin w-4 h-4 text-[#B063FF]"
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
                            <span>Loading applications...</span>
                          </div>
                        ) : casesError ? (
                          <div className="p-3 text-center text-xs text-red-500">
                            <span>{casesError}</span>
                          </div>
                        ) : filteredCustomerCases.length > 0 ? (
                          filteredCustomerCases.map((c, idx) => {
                            const isSelected =
                              String(selectedCaseId) === String(c.id);
                            return (
                              <button
                                type="button"
                                key={c.id || idx}
                                onClick={() => {
                                  setSelectedCaseId(String(c.id));
                                  clearFieldError("selectedCaseId");
                                  setIsCaseDropdownOpen(false);
                                  setCaseSearchQuery("");
                                }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex flex-col gap-0.5 ${
                                  isSelected
                                    ? "bg-[#B063FF]/10 text-[#B063FF]"
                                    : "hover:bg-slate-50 text-slate-800"
                                }`}
                              >
                                <span className="font-semibold text-slate-900">
                                  {c.customerName ||
                                    c.customer_name ||
                                    c.name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  {c.applicationNo ||
                                    c.application_number ||
                                    c.caseNumber ||
                                    c.case_number ||
                                    `APP-#${c.id}`}{" "}
                                  • {c.bank || c.bank_name || "Bank Partner"}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            {caseSearchQuery ? (
                              <span>
                                No customer applications matching &ldquo;{caseSearchQuery}&rdquo;
                              </span>
                            ) : (
                              <span>
                                No submitted or accepted customer applications available
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {errors.selectedCaseId && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.selectedCaseId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Issue Type Selector (Exact backend enum values) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-800">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                value={issueType}
                onChange={(e) => {
                  setIssueType(e.target.value);
                  clearFieldError("issueType");
                }}
                className={`w-full rounded-md border px-3 py-2 text-xs text-slate-800 bg-white transition-colors focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] ${
                  errors.issueType
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-200"
                }`}
              >
                <option value="">Select issue type ▾</option>
                {config.issueTypes.map((type) => {
                  const val = typeof type === "object" ? type.value : type;
                  const label = typeof type === "object" ? type.label : type;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {errors.issueType && (
                <p className="text-[11px] text-red-500 mt-1">{errors.issueType}</p>
              )}
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-800">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {description.trim().length} / 2000 chars (min 15)
                </span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearFieldError("description");
                }}
                maxLength={2000}
                placeholder="Please explain your issue in detail..."
                className={`w-full rounded-md border px-3 py-2 text-xs text-slate-800 bg-white transition-colors focus:outline-hidden focus:ring-1 focus:ring-[#B063FF] ${
                  errors.description
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-200"
                }`}
              />
              {errors.description && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Attachments Section (Strictly restricted to 5 files, 5 MB each, JPG, PNG, PDF) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-800">
                  Attachments <span className="text-slate-400 font-normal">(Optional — Max 5 files, 5 MB each)</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  PDF, JPG, PNG
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelection(e.dataTransfer.files);
                }}
                className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? "border-[#B063FF] bg-[#B063FF]/5"
                    : errors.attachments
                    ? "border-red-300 bg-red-50/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    handleFileSelection(e.target.files);
                    e.target.value = "";
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Upload supporting documents"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 shadow-2xs">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    Drag & drop files or{" "}
                    <span className="text-[#B063FF] font-semibold underline">
                      browse
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports PDF, JPG, PNG up to 5 MB each (up to 5 files)
                  </p>
                </div>
              </div>

              {errors.attachments && (
                <p className="text-[11px] text-red-500 mt-1">{errors.attachments}</p>
              )}

              {/* Selected Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-slate-500">
                    Attached Files ({attachedFiles.length} / {MAX_ATTACHMENT_COUNT})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-700 shadow-2xs"
                      >
                        <span className="text-[11px]">📎</span>
                        <span className="font-medium max-w-[200px] truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({file.size})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer text-xs ml-1"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200/80 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#B063FF] hover:bg-[#9d4eed] disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
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
                  <span>Raising Ticket...</span>
                </>
              ) : (
                <>
                  <span>Raise Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
