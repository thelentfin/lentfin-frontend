"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CustomerApplicationDetailsModal({
  item,
  onClose = () => { },
  onActionSuccess = () => { },
}) {
  // Verification checkbox state (document review before Accept)
  const [checkedDocs, setCheckedDocs] = useState({});

  // Reject Modal State
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Accept Modal State
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [smAsmData, setSmAsmData] = useState({
    sm: null,
    asm: null,
    isLoading: true,
    error: "",
  });

  const [paymentData, setPaymentData] = useState({
    payment: null,
    isLoading: true,
    error: "",
  });

  const [loanCaseDetailData, setLoanCaseDetailData] = useState({
    caseData: null,
    bankData: null,
    sanctionDoc: null,
    isLoading: true,
    error: "",
  });

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const { dsa = {}, loan_case = {}, disbursement = {} } = item || {};

  const caseId =
    loan_case?.case_id ||
    loan_case?.id ||
    disbursement?.case_id ||
    item?.case_id ||
    item?.id;

  const targetCaseNumber = loan_case?.case_number || item?.case_number;

  // Fetch SM / ASM details, Payment details, and extended Case/Bank/Sanction details by matching case_id / case_number
  useEffect(() => {
    if (!caseId && !targetCaseNumber) return;

    let isMounted = true;

    const fetchSmAsmDetails = async () => {
      if (!caseId) return;
      setSmAsmData((prev) => ({ ...prev, isLoading: true, error: "" }));
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token missing");

        const response = await fetch(
          `${API_BASE_URL}/loan-case-sm-asm/${caseId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            if (isMounted) {
              setSmAsmData({ sm: null, asm: null, isLoading: false, error: "" });
            }
            return;
          }
          throw new Error(`Status ${response.status}`);
        }

        const json = await response.json();
        if (json.status && Array.isArray(json.data)) {
          const sm = json.data.find((d) => d.role === "SM") || null;
          const asm = json.data.find((d) => d.role === "ASM") || null;
          if (isMounted) {
            setSmAsmData({ sm, asm, isLoading: false, error: "" });
          }
        } else {
          if (isMounted) {
            setSmAsmData({ sm: null, asm: null, isLoading: false, error: "" });
          }
        }
      } catch (err) {
        if (isMounted) {
          setSmAsmData({
            sm: null,
            asm: null,
            isLoading: false,
            error: err.message || "Failed to load SM/ASM details",
          });
        }
      }
    };

    const fetchPaymentDetails = async () => {
      setPaymentData((prev) => ({ ...prev, isLoading: true, error: "" }));
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token missing");

        const response = await fetch(`${API_BASE_URL}/loan-payment/admin/all`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const json = await response.json();
        if (json.status && Array.isArray(json.data)) {
          // Strictly match related payment record by case_id
          const matchedItem = json.data.find(
            (p) =>
              String(p.loan_case?.case_id || p.loan_case?.id || p.payment?.case_id) ===
              String(caseId)
          );
          if (isMounted) {
            setPaymentData({
              payment: matchedItem ? matchedItem.payment : null,
              isLoading: false,
              error: "",
            });
          }
        } else {
          if (isMounted) {
            setPaymentData({ payment: null, isLoading: false, error: "" });
          }
        }
      } catch (err) {
        if (isMounted) {
          setPaymentData({
            payment: null,
            isLoading: false,
            error: err.message || "Failed to load payment details",
          });
        }
      }
    };

    const fetchLoanCaseDetails = async () => {
      setLoanCaseDetailData((prev) => ({ ...prev, isLoading: true, error: "" }));
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token missing");

        const response = await fetch(`${API_BASE_URL}/loan-case/admin/all`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const json = await response.json();
        if (json.status && Array.isArray(json.data)) {
          // Match related loan case record by case_id or case_number
          const matchedCase = json.data.find((c) => {
            const cId =
              c.loan_case?.id ||
              c.loan_case?.case_id ||
              c.id ||
              c.case_id;
            const cCaseNum =
              c.loan_case?.case_number || c.case_number;

            const matchesId =
              caseId !== undefined &&
              cId !== undefined &&
              String(cId) === String(caseId);

            const matchesCaseNum =
              targetCaseNumber &&
              cCaseNum &&
              String(cCaseNum) === String(targetCaseNumber);

            return matchesId || matchesCaseNum;
          });

          if (isMounted) {
            if (matchedCase) {
              setLoanCaseDetailData({
                caseData: matchedCase.loan_case || matchedCase,
                bankData: matchedCase.bank || matchedCase.bank_name || null,
                sanctionDoc: matchedCase.document || matchedCase.sanction_doc || null,
                isLoading: false,
                error: "",
              });
            } else {
              setLoanCaseDetailData({
                caseData: null,
                bankData: null,
                sanctionDoc: null,
                isLoading: false,
                error: "",
              });
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoanCaseDetailData({
            caseData: null,
            bankData: null,
            sanctionDoc: null,
            isLoading: false,
            error: err.message || "Failed to load case details",
          });
        }
      }
    };

    fetchSmAsmDetails();
    fetchPaymentDetails();
    fetchLoanCaseDetails();

    return () => {
      isMounted = false;
    };
  }, [caseId, targetCaseNumber, API_BASE_URL]);

  if (!item) return null;

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

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "N/A";
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatPaymentOptionLabel = (option) => {
    if (!option) return "N/A";
    const map = {
      SPOT_48_HOURS: "Spot (48 Hours)",
      AFTER_5_DAYS: "After 5 Days",
    };
    return map[option] || option;
  };

  // Robust field extraction across Admin & DSA API structures
  const customerMobile =
    loanCaseDetailData.caseData?.mobile_number ||
    loanCaseDetailData.caseData?.mobile ||
    loan_case?.mobile_number ||
    loan_case?.mobile ||
    item?.mobile_number ||
    item?.mobile;

  const applicationNumber =
    loanCaseDetailData.caseData?.application_number ||
    loanCaseDetailData.caseData?.applicationNo ||
    loan_case?.application_number ||
    loan_case?.applicationNo ||
    item?.application_number ||
    item?.applicationNo;

  const loanAccountNumber =
    loanCaseDetailData.caseData?.loan_account_number ||
    loanCaseDetailData.caseData?.loanAccountNo ||
    loan_case?.loan_account_number ||
    loan_case?.loanAccountNo ||
    item?.loan_account_number ||
    item?.loanAccountNo;

  const bankName =
    (typeof loanCaseDetailData.bankData === "string"
      ? loanCaseDetailData.bankData
      : loanCaseDetailData.bankData?.bank_name) ||
    (typeof loanCaseDetailData.caseData?.bank === "string"
      ? loanCaseDetailData.caseData.bank
      : loanCaseDetailData.caseData?.bank?.bank_name ||
      loanCaseDetailData.caseData?.bank_name) ||
    (typeof loan_case?.bank === "string"
      ? loan_case.bank
      : loan_case?.bank?.bank_name || loan_case?.bank_name) ||
    (typeof item?.bank === "string"
      ? item.bank
      : item?.bank?.bank_name || item?.bank_name);

  // Sanction Letter Document Resolution
  let sanctionDocObj =
    loanCaseDetailData.sanctionDoc ||
    item?.sanctionDoc ||
    item?.sanction_letter_doc;

  if (!sanctionDocObj && Array.isArray(loanCaseDetailData.caseData?.documents)) {
    sanctionDocObj = loanCaseDetailData.caseData.documents.find((d) =>
      (d?.document_type || "").toLowerCase().includes("sanction")
    );
  }

  if (!sanctionDocObj && Array.isArray(item?.documents)) {
    sanctionDocObj = item.documents.find((d) =>
      (d?.document_type || "").toLowerCase().includes("sanction")
    );
  }

  if (!sanctionDocObj && Array.isArray(loan_case?.documents)) {
    sanctionDocObj = loan_case.documents.find((d) =>
      (d?.document_type || "").toLowerCase().includes("sanction")
    );
  }

  const sanctionDocUrl =
    sanctionDocObj?.secure_url ||
    sanctionDocObj?.cloudinary_url ||
    sanctionDocObj?.url ||
    loanCaseDetailData.caseData?.sanctionLetterUrl ||
    item?.sanctionLetterUrl ||
    item?.sanction_letter_url;

  const sanctionDocName =
    sanctionDocObj?.original_name ||
    sanctionDocObj?.name ||
    loanCaseDetailData.caseData?.sanctionLetterName ||
    item?.sanctionLetterName ||
    "sanction_letter.pdf";

  // Robust evaluation of PDD Cleared status (handles YES, yes, 1, true, etc.)
  const rawPddCleared =
    disbursement?.pdd_cleared ??
    disbursement?.pddCleared ??
    item?.disbursement?.pdd_cleared ??
    item?.disbursement?.pddCleared ??
    item?.pdd_cleared ??
    item?.pddCleared ??
    loan_case?.pdd_cleared ??
    loan_case?.pddCleared;

  const isPddClearedYes =
    rawPddCleared !== undefined &&
    rawPddCleared !== null &&
    (String(rawPddCleared).trim().toUpperCase() === "YES" ||
      String(rawPddCleared).trim().toUpperCase() === "Y" ||
      String(rawPddCleared).trim() === "1" ||
      rawPddCleared === 1 ||
      rawPddCleared === true ||
      String(rawPddCleared).trim().toLowerCase() === "true");

  // Robust PDD Document object and URL extraction across API response variants
  let pddDocObj =
    item?.document ||
    disbursement?.document ||
    item?.disbursement?.document ||
    item?.pddDoc ||
    item?.pddDocument;

  if (!pddDocObj && Array.isArray(item?.documents)) {
    pddDocObj = item.documents.find((d) =>
      (d?.document_type || "").toUpperCase().includes("PDD")
    );
  }

  if (!pddDocObj && Array.isArray(loan_case?.documents)) {
    pddDocObj = loan_case.documents.find((d) =>
      (d?.document_type || "").toUpperCase().includes("PDD")
    );
  }

  const pddDocUrl =
    pddDocObj?.secure_url ||
    pddDocObj?.cloudinary_url ||
    pddDocObj?.url ||
    item?.pddDocumentUrl ||
    item?.pdd_document_url;

  const pddDocName =
    pddDocObj?.original_name ||
    pddDocObj?.name ||
    item?.pddDocumentName ||
    "pdd_document.pdf";

  // Collapsible section states
  const [isExtendedDetailsExpanded, setIsExtendedDetailsExpanded] = useState(false);
  const [isPaymentDetailsExpanded, setIsPaymentDetailsExpanded] = useState(false);

  // ==================================================
  // ACCEPT / REJECT LOGIC (mirrors DSA Application flow)
  // ==================================================

  // Documents that need to be reviewed before Accept is allowed
  const verificationDocs = [
    sanctionDocUrl
      ? { id: "sanction", label: "Sanction Letter", url: sanctionDocUrl, name: sanctionDocName }
      : null,
    isPddClearedYes && pddDocUrl
      ? { id: "pdd", label: "PDD Document", url: pddDocUrl, name: pddDocName }
      : null,
  ].filter(Boolean);

  const allDocsVerified =
    verificationDocs.length === 0 ||
    verificationDocs.every((doc) => !!checkedDocs[doc.id]);
  const verifiedCount = verificationDocs.filter((doc) => !!checkedDocs[doc.id]).length;

  const [modalStatus, setModalStatus] = useState(null);

  useEffect(() => {
    setModalStatus(null);
  }, [item]);

  const handleDocCheckboxToggle = (docId) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const currentStatus = (
    modalStatus ||
    loan_case?.status ||
    loanCaseDetailData?.caseData?.status ||
    item?.status ||
    "SUBMITTED"
  ).toUpperCase();

  const isSubmitted = currentStatus === "SUBMITTED" || currentStatus === "PENDING";
  const isAccepted = currentStatus === "ACCEPTED" || currentStatus === "APPROVED";
  const isRejected = currentStatus === "REJECTED";

  const handleAcceptSubmit = async () => {
    setAcceptError("");
    if (!caseId) {
      setAcceptError("Unable to identify loan case. Please close and try again.");
      return;
    }

    setIsAccepting(true);

    try {
      const token = localStorage.getItem("token");
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
        setShowAcceptConfirm(false);
        setModalStatus("ACCEPTED");
        toast.success("Customer application accepted.");
        onActionSuccess(caseId, "ACCEPTED");
        onClose();
      } else {
        throw new Error(json.message || "Failed to accept application.");
      }
    } catch (err) {
      const errMsg = err.message || "An error occurred while accepting the application.";
      setAcceptError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    setRejectError("");

    const trimmedReason = rejectionReason.trim();
    if (trimmedReason.length < 5) {
      setRejectError("Rejection reason must be at least 5 characters long.");
      return;
    }

    if (!caseId) {
      setRejectError("Unable to identify loan case. Please close and try again.");
      return;
    }

    setIsRejecting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/loan-case/admin/status/${caseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "REJECTED",
            reject_reason: trimmedReason,
          }),
        }
      );

      const json = await response.json();

      if (response.ok && json.status) {
        setShowRejectConfirm(false);
        setModalStatus("REJECTED");
        toast.success("Customer application rejected.");
        onActionSuccess(caseId, "REJECTED");
        onClose();
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
                  Customer Application Details
                </h3>
                {loan_case.case_number && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200/80 tabular-nums">
                    {loan_case.case_number}
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
                  {currentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                <span className="font-semibold text-slate-900">
                  {loan_case.customer_name || "N/A"}
                </span>
                {" · "}
                <span>
                  DSA: {dsa.name || "N/A"}{" "}
                  {dsa.dsa_code ? `(${dsa.dsa_code})` : ""}
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

        {/* Drawer Scrollable Body (Independent Scroll Area) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-[#F8FAFC]">
          {/* REJECTION REASON CARD (shown only for REJECTED applications) */}
          {isRejected && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-xs border-b border-red-200/80 pb-2">
                <span className="text-sm">⚠️</span>
                <h4 className="uppercase tracking-wider">Rejection Reason</h4>
              </div>
              <p className="text-xs text-red-900 font-medium leading-relaxed">
                {loanCaseDetailData?.caseData?.reject_reason ||
                  loan_case?.reject_reason ||
                  item?.reject_reason ||
                  item?.loan_case?.reject_reason ||
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
                  {loan_case.customer_name || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Mobile Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {customerMobile || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Application Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {applicationNumber || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Loan Account Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {loanAccountNumber || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Lending Bank</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {bankName || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Case Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums">
                  {loan_case.case_number || applicationNumber || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Sanction Amount</span>
                <span className="font-semibold text-slate-900 text-xs block tabular-nums">
                  {formatCurrency(loan_case.sanction_amount)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Submitted Date</span>
                <span className="font-normal text-slate-700 text-xs block tabular-nums">
                  {formatDate(
                    disbursement.created_at || disbursement.disbursement_date
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DSA PARTNER DETAILS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="text-sm">🤝</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                DSA Partner Details
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">DSA Name</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {dsa.name || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">DSA Code</span>
                <span className="font-mono font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                  {dsa.dsa_code || "N/A"}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">DSA Email</span>
                <span className="font-medium text-slate-900 text-xs block truncate">
                  {dsa.email || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4: SANCTION & DISBURSEMENT DETAILS */}
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
                    {formatCurrency(loan_case.sanction_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-normal">Sanction Status</span>
                  <span className="font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                    {loan_case.status || "Active"}
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
                      {sanctionDocName}
                    </span>
                  </div>

                  {sanctionDocUrl ? (
                    <a
                      href={sanctionDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-[11px] font-medium shrink-0"
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
                  <span className="font-semibold text-slate-900 text-xs">{disbursement.disbursement_type || "N/A"}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Amount</span>
                  <span className="font-semibold text-emerald-700 text-xs tabular-nums">{formatCurrency(disbursement.disbursement_amount)}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Date</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">{formatDate(disbursement.disbursement_date)}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Rate</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">{disbursement.rate ? `${disbursement.rate}%` : "N/A"}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Processing Fee</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">{formatCurrency(disbursement.pf)}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Tenure</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums">{disbursement.tenure ? `${disbursement.tenure} months` : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: PDD DETAILS & DOCUMENT */}
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
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${isPddClearedYes
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80"
                    }`}
                >
                  {isPddClearedYes ? "✓ Cleared (YES)" : "Pending (NO)"}
                </span>
              </div>

              {isPddClearedYes ? (
                <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-md border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">📜</span>
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-slate-900 truncate">
                        {pddDocName}
                      </span>
                      <p className="text-[10px] text-slate-500 font-normal truncate">
                        {pddDocObj?.document_type || "PDD Document"}
                      </p>
                    </div>
                  </div>

                  {pddDocUrl ? (
                    <a
                      href={pddDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-[11px] font-medium shrink-0"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      Unavailable
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* SECTION 5B: DOCUMENT VERIFICATION CHECKLIST (only while SUBMITTED / pending review) */}
          {isSubmitted && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📁</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Document Verification ({verificationDocs.length})
                  </h4>
                </div>
                {verificationDocs.length > 0 && (
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border tabular-nums ${allDocsVerified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80"
                      }`}
                  >
                    {verifiedCount} of {verificationDocs.length} Verified
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 font-normal">
                Inspect each document link and check the verification box to unlock Accept & Approve.
              </p>

              {verificationDocs.length === 0 ? (
                <div className="py-6 text-center bg-slate-50 rounded-md border border-slate-200/80">
                  <p className="text-xs text-slate-400 font-normal">
                    No documents uploaded for this application.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verificationDocs.map((doc) => {
                    const isChecked = !!checkedDocs[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`rounded-md border p-3 transition-colors flex flex-col justify-between space-y-3 ${isChecked
                          ? "bg-emerald-50/20 border-emerald-200/80"
                          : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="text-lg shrink-0 p-1.5 bg-white rounded border border-slate-200/80">
                              📄
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-900 truncate">
                                {doc.label}
                              </span>
                              <p className="text-[11px] font-normal text-slate-500 truncate mt-0.5">
                                {doc.name}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 text-[11px] font-medium flex items-center gap-1 ${isChecked ? "text-emerald-700" : "text-slate-400"
                              }`}
                          >
                            {isChecked ? "✓ Verified" : "Unverified"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 gap-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition-colors shrink-0"
                          >
                            <span>View File</span>
                          </a>

                          <label
                            htmlFor={`custdoc-check-${doc.id}`}
                            className="text-[11px] font-medium flex items-center gap-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleDocCheckboxToggle(doc.id)}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                              id={`custdoc-check-${doc.id}`}
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

          {/* SECTION 6: SM & ASM DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsExtendedDetailsExpanded(!isExtendedDetailsExpanded)}
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
                  {isExtendedDetailsExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExtendedDetailsExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExtendedDetailsExpanded && (
              <div className="pt-1 animate-fadeIn">
                {smAsmData.isLoading ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>Fetching SM & ASM details...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* SM Details */}
                    <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200/80 space-y-2">
                      <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                        Sales Manager (SM)
                      </span>

                      {smAsmData.sm ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Name:</span>
                            <span className="font-semibold text-slate-900">{smAsmData.sm.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Mobile:</span>
                            <span className="font-medium text-slate-900 tabular-nums">{smAsmData.sm.mobile_number || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Email:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[180px]">{smAsmData.sm.email || "N/A"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic py-1 text-center text-xs font-normal">
                          No SM details recorded for this case.
                        </p>
                      )}
                    </div>

                    {/* ASM Details */}
                    <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200/80 space-y-2">
                      <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                        Area Sales Manager (ASM)
                      </span>

                      {smAsmData.asm ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Name:</span>
                            <span className="font-semibold text-slate-900">{smAsmData.asm.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Mobile:</span>
                            <span className="font-medium text-slate-900 tabular-nums">{smAsmData.asm.mobile_number || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-normal">Email:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[180px]">{smAsmData.asm.email || "N/A"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic py-1 text-center text-xs font-normal">
                          No ASM details recorded for this case.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 7: PAYMENT / COMMISSION DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsPaymentDetailsExpanded(!isPaymentDetailsExpanded)}
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
                  {isPaymentDetailsExpanded ? "Collapse" : "Expand"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isPaymentDetailsExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isPaymentDetailsExpanded && (
              <div className="pt-1 animate-fadeIn">
                {paymentData.isLoading ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>Fetching payment details...</span>
                  </div>
                ) : paymentData.payment ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5 text-xs">
                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Option</span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {formatPaymentOptionLabel(paymentData.payment.payment_option)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Rate</span>
                      <span className="font-medium text-slate-900 text-xs tabular-nums">
                        {paymentData.payment.payment_percentage
                          ? `${paymentData.payment.payment_percentage}%`
                          : "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Base Loan Amount</span>
                      <span className="font-medium text-slate-900 text-xs tabular-nums">
                        {formatCurrency(paymentData.payment.loan_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Payment Amount</span>
                      <span className="font-semibold text-emerald-700 text-xs tabular-nums">
                        {formatCurrency(paymentData.payment.payment_amount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center bg-slate-50 rounded-md border border-slate-200/80">
                    <p className="text-xs text-slate-500 font-normal">
                      No payment / commission details submitted for this case.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer (Sticky Bottom) */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>

          {isSubmitted ? (
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
              {!allDocsVerified && verificationDocs.length > 0 && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
                  Verify all {verificationDocs.length} documents to approve
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
                    setAcceptError("");
                    setShowAcceptConfirm(true);
                  }}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    allDocsVerified
                      ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                  }`}
                >
                  Accept & Approve
                </button>
              </div>
            </div>
          ) : isAccepted ? (
            <div className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>This application has already been approved.</span>
            </div>
          ) : isRejected ? (
            <div className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200/80 text-xs font-medium">
              <span className="w-4 h-4 rounded-full bg-red-600 text-white inline-flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
              <span>This application has been rejected.</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Close Details
            </button>
          )}
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
                  Customer Loan Case • {loan_case?.customer_name || "Applicant"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Are you sure you want to reject this customer loan case? This action will mark the case as <strong className="text-slate-900 font-semibold">REJECTED</strong>.
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

      {/* CONFIRM ACCEPT APPLICATION MODAL */}
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
                  Customer Loan Case • {loan_case?.customer_name || "Applicant"}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 text-xs space-y-1.5 font-normal">
              <p className="font-semibold text-slate-900">
                Acceptance Notice
              </p>
              <p className="leading-relaxed">
                Accepting this loan case will mark it as <strong>ACCEPTED</strong>.
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
                className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
    </>
  );
}