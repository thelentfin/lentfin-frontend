"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { exportCustomerApplicationToExcel } from "./customerApplicationExcelExport";

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

  const [verificationDocData, setVerificationDocData] = useState({
    doc: null,
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

    const fetchVerificationDoc = async () => {
      if (!caseId) return;
      setVerificationDocData((prev) => ({ ...prev, isLoading: true, error: "" }));
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token missing");

        const response = await fetch(
          `${API_BASE_URL}/admin-verification/${caseId}`,
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
              setVerificationDocData({ doc: null, isLoading: false, error: "" });
            }
            return;
          }
          throw new Error(`Status ${response.status}`);
        }

        const json = await response.json();
        if (json.status && json.data) {
          if (isMounted) {
            setVerificationDocData({ doc: json.data, isLoading: false, error: "" });
          }
        } else {
          if (isMounted) {
            setVerificationDocData({ doc: null, isLoading: false, error: "" });
          }
        }
      } catch (err) {
        if (isMounted) {
          setVerificationDocData({
            doc: null,
            isLoading: false,
            error: err.message || "Failed to load verification document",
          });
        }
      }
    };

    fetchSmAsmDetails();
    fetchPaymentDetails();
    fetchLoanCaseDetails();
    fetchVerificationDoc();

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

  const totalAllDocs = verificationDocs.length;
  const allDocsVerified =
    totalAllDocs === 0 ||
    verificationDocs.every((doc) => !!checkedDocs[doc.id]);
  const verifiedCount = verificationDocs.filter((doc) => !!checkedDocs[doc.id]).length;

  // Bank Confirmation / Sanction PDF Upload State
  const [bankConfirmationPdf, setBankConfirmationPdf] = useState(null);
  const fileInputSectionRef = React.useRef(null);

  const handleBankPdfChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file only.");
      if (e.target) e.target.value = "";
      return;
    }
    setBankConfirmationPdf(file);
    toast.success(`Bank Confirmation PDF attached: ${file.name}`);
  };

  const handleRemoveBankPdf = () => {
    setBankConfirmationPdf(null);
    if (fileInputSectionRef.current) fileInputSectionRef.current.value = "";
  };

  // Gating condition: Both all documents verified AND Bank Confirmation PDF attached (or already stored in DB)
  const hasBankPdf = !!bankConfirmationPdf || !!verificationDocData.doc;
  const isApprovalAllowed = allDocsVerified && hasBankPdf;

  const [modalStatus, setModalStatus] = useState(null);

  useEffect(() => {
    setModalStatus(null);
    setBankConfirmationPdf(null);
    setCheckedDocs({});
    setVerificationDocData({ doc: null, isLoading: true, error: "" });
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

  // Excel Export Staged SaaS State
  // stage: "idle" | "gathering" | "formatting" | "ready"
  const [exportStage, setExportStage] = useState("idle");

  const handleExportExcel = async () => {
    if (exportStage !== "idle") return;

    // Stage 1: Gathering records (0ms)
    setExportStage("gathering");
    const toastId = toast.loading("Compiling customer application data...");

    try {
      // Stage 2: Formatting workbook (after 700ms)
      await new Promise((resolve) => setTimeout(resolve, 700));
      setExportStage("formatting");
      toast.loading("Applying brand styling & document links...", { id: toastId });

      // Stage 3: Ready & Trigger download (after 1400ms)
      await new Promise((resolve) => setTimeout(resolve, 700));
      setExportStage("ready");

      // Generate & download workbook
      await exportCustomerApplicationToExcel({
        item,
        loanCaseDetailData,
        smAsmData,
        verificationDocs,
        customerMobile,
        applicationNumber,
        loanAccountNumber,
        bankName,
        sanctionDocName,
        sanctionDocUrl,
        isPddClearedYes,
        pddDocName,
        pddDocUrl,
        currentStatus,
      });

      // Morphing toast to success
      toast.success("Excel file downloaded successfully!", { id: toastId });

      // Return button to idle after 1.5s
      setTimeout(() => {
        setExportStage("idle");
      }, 1500);
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error(err?.message || "Failed to export Excel file.", { id: toastId });
      setExportStage("idle");
    }
  };

  const handleAcceptSubmit = async () => {
    setAcceptError("");
    if (!caseId) {
      setAcceptError("Unable to identify loan case. Please close and try again.");
      return;
    }

    setIsAccepting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing. Please log in again.");

      // If a bank confirmation PDF was newly attached by the admin, upload it to the verification table first
      if (bankConfirmationPdf) {
        const formData = new FormData();
        formData.append("verification_document", bankConfirmationPdf);

        const uploadRes = await fetch(
          `${API_BASE_URL}/admin-verification/upload/${caseId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.status) {
          throw new Error(uploadJson.message || "Failed to upload Bank Confirmation PDF.");
        }
      }

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
        toast.success("Customer application approved and Bank Confirmation PDF saved.");
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
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight truncate">
                <span className="hidden sm:inline">Customer </span>Application Details
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-normal truncate">
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

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 sm:ml-4">
            <button
              onClick={handleExportExcel}
              disabled={exportStage !== "idle"}
              type="button"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold transition-all disabled:opacity-80 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title="Export complete application data to Excel"
            >
              {exportStage === "gathering" ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="hidden sm:inline">Gathering Records...</span>
                  <span className="sm:hidden">Gathering...</span>
                </>
              ) : exportStage === "formatting" ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="hidden sm:inline">Formatting Excel...</span>
                  <span className="sm:hidden">Formatting...</span>
                </>
              ) : exportStage === "ready" ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </span>
                  <span className="hidden sm:inline">Download Ready!</span>
                  <span className="sm:hidden">Ready!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export Excel</span>
                  <span className="sm:hidden">Excel</span>
                </>
              )}
            </button>

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
          {isRejected && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-3.5 sm:p-4 space-y-2 shadow-2xs">
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
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <span className="text-sm">👤</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Customer & Case Overview
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5 text-xs">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Customer Name</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {loan_case.customer_name || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Mobile Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums truncate">
                  {customerMobile || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Application No</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums truncate">
                  {applicationNumber || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Loan Account No</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums truncate">
                  {loanAccountNumber || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Lending Bank</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {bankName || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Case Number</span>
                <span className="font-mono font-medium text-slate-900 text-xs block tabular-nums truncate">
                  {loan_case.case_number || applicationNumber || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Sanction Amount</span>
                <span className="font-semibold text-slate-900 text-xs block tabular-nums truncate">
                  {formatCurrency(loan_case.sanction_amount)}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Submitted Date</span>
                <span className="font-normal text-slate-700 text-xs block tabular-nums truncate">
                  {formatDate(
                    disbursement.created_at || disbursement.disbursement_date
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DSA PARTNER DETAILS */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <span className="text-sm">🤝</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                DSA Partner Details
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5 text-xs">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">DSA Name</span>
                <span className="font-semibold text-slate-900 text-xs block truncate">
                  {dsa.name || "N/A"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">DSA Code</span>
                <span className="font-mono font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 inline-block text-xs tabular-nums">
                  {dsa.dsa_code || "N/A"}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">DSA Email</span>
                <span className="font-medium text-slate-900 text-xs block truncate">
                  {dsa.email || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4: SANCTION & DISBURSEMENT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* SANCTION DETAILS */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
                <span className="text-sm">📜</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Sanction Details
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-x-3.5 sm:gap-x-4 gap-y-2 text-xs">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Sanction Amount</span>
                  <span className="font-semibold text-slate-900 text-xs tabular-nums block truncate">
                    {formatCurrency(loan_case.sanction_amount)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Sanction Status</span>
                  <span className="font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 text-[11px] inline-block">
                    {loan_case.status || "Active"}
                  </span>
                </div>
              </div>

              {/* Sanction Document Container */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="block text-[11px] font-medium text-slate-500 mb-1">
                  Sanction Letter
                </span>
                <div className="bg-slate-50 p-2 sm:p-2.5 rounded-md border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">📄</span>
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
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
                <span className="text-sm">💸</span>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Disbursement Details
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2 sm:gap-y-2.5 text-xs">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Type</span>
                  <span className="font-semibold text-slate-900 text-xs truncate block">{disbursement.disbursement_type || "N/A"}</span>
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Amount</span>
                  <span className="font-semibold text-emerald-700 text-xs tabular-nums truncate block">{formatCurrency(disbursement.disbursement_amount)}</span>
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Date</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums truncate block">{formatDate(disbursement.disbursement_date)}</span>
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Rate</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums truncate block">{disbursement.rate ? `${disbursement.rate}%` : "N/A"}</span>
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Processing Fee</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums truncate block">{formatCurrency(disbursement.pf)}</span>
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Tenure</span>
                  <span className="font-normal text-slate-700 text-xs tabular-nums truncate block">{disbursement.tenure ? `${disbursement.tenure} months` : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: PDD DETAILS & DOCUMENT */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 sm:pb-2.5">
              <span className="text-sm">🔍</span>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                PDD Details & Verification Document
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs items-center">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-500 mb-1 truncate">
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
                <div className="col-span-2 sm:col-span-2 bg-slate-50 p-2 sm:p-2.5 rounded-md border border-slate-200/80 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">📜</span>
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
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5">
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
                Inspect each document link, check the verification box, and attach the Bank Approval PDF to unlock Accept & Approve.
              </p>

              {/* Bank Confirmation / Approval PDF Upload Card */}
              <div
                className={`rounded-md border p-2.5 sm:p-3 transition-colors flex items-center justify-between gap-2.5 sm:gap-3 ${
                  bankConfirmationPdf || verificationDocData.doc
                    ? "bg-emerald-50/30 border-emerald-300"
                    : "bg-purple-50/40 border-purple-200/80"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-base sm:text-lg shrink-0 p-1.5 bg-white rounded border border-slate-200/80">
                    🏦
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        Bank Confirmation
                      </span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-snug">
                      {bankConfirmationPdf ? (
                        <span className="truncate block font-medium text-slate-700">
                          {bankConfirmationPdf.name} ({(bankConfirmationPdf.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : verificationDocData.doc ? (
                        <span className="truncate block font-medium text-slate-700">
                          {verificationDocData.doc.original_name} ({(verificationDocData.doc.file_size / 1024).toFixed(0)} KB) • In database
                        </span>
                      ) : (
                        <>
                          <span className="block sm:inline">
                            Upload the sanction/approval PDF received from
                          </span>{" "}
                          <span className="block sm:inline">
                            the bank (PDF only)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {bankConfirmationPdf ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        ✓ Attached
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveBankPdf}
                        className="text-xs text-slate-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors cursor-pointer"
                        title="Remove PDF"
                      >
                        ✕
                      </button>
                    </div>
                  ) : verificationDocData.doc ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={verificationDocData.doc.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-[11px] font-medium shrink-0 inline-flex items-center gap-1"
                      >
                        <span>View</span>
                      </a>
                      <label
                        htmlFor="bank-pdf-upload-section"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium cursor-pointer transition-colors shadow-2xs select-none"
                      >
                        <span>Replace</span>
                        <input
                          id="bank-pdf-upload-section"
                          ref={fileInputSectionRef}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={handleBankPdfChange}
                        />
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="bank-pdf-upload-section"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs select-none"
                    >
                      <span>Upload PDF</span>
                      <input
                        id="bank-pdf-upload-section"
                        ref={fileInputSectionRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleBankPdfChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {verificationDocs.length === 0 ? (
                <div className="py-6 text-center bg-slate-50 rounded-md border border-slate-200/80">
                  <p className="text-xs text-slate-400 font-normal">
                    No documents uploaded for this application.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {verificationDocs.map((doc) => {
                    const isChecked = !!checkedDocs[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`rounded-md border p-2 sm:p-3 transition-colors flex flex-col justify-between space-y-2 sm:space-y-3 ${isChecked
                          ? "bg-emerald-50/20 border-emerald-200/80"
                          : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2.5">
                          <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0">
                            <div className="text-base sm:text-lg shrink-0 p-1 sm:p-1.5 bg-white rounded border border-slate-200/80">
                              📄
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] sm:text-xs font-semibold text-slate-900 truncate">
                                {doc.label}
                              </span>
                              <p className="text-[10px] sm:text-[11px] font-normal text-slate-500 truncate mt-0.5">
                                {doc.name}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 text-[10px] sm:text-[11px] font-medium flex items-center gap-0.5 ${isChecked ? "text-emerald-700" : "text-slate-400"
                              }`}
                          >
                            {isChecked ? "✓" : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200/80 gap-1">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] sm:text-[11px] font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition-colors shrink-0 underline sm:no-underline"
                          >
                            <span>View</span>
                          </a>

                          <label
                            htmlFor={`custdoc-check-${doc.id}`}
                            className="text-[10px] sm:text-[11px] font-medium flex items-center gap-1 cursor-pointer select-none text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleDocCheckboxToggle(doc.id)}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                              id={`custdoc-check-${doc.id}`}
                            />
                            <span className={isChecked ? "font-semibold text-emerald-700" : "font-normal text-slate-600"}>
                              {isChecked ? "Verified" : "Verify"}
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

          {/* BANK CONFIRMATION DOCUMENT (Shown for Accepted Applications) */}
          {isAccepted && (
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏦</span>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Bank Confirmation Document
                  </h4>
                </div>
                {verificationDocData.doc && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    ✓ Attached on Approval
                  </span>
                )}
              </div>

              {verificationDocData.isLoading ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg className="animate-spin w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Loading Bank Confirmation PDF...</span>
                </div>
              ) : verificationDocData.doc ? (
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-md border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-base sm:text-lg shrink-0 p-1.5 bg-white rounded border border-slate-200/80">
                      📄
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 truncate">
                        {verificationDocData.doc.original_name || "Bank_Confirmation.pdf"}
                      </span>
                      <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                        {verificationDocData.doc.file_size
                          ? `${(verificationDocData.doc.file_size / 1024).toFixed(0)} KB • `
                          : ""}
                        Uploaded on {formatDate(verificationDocData.doc.created_at)}
                      </p>
                    </div>
                  </div>

                  {verificationDocData.doc.secure_url ? (
                    <a
                      href={verificationDocData.doc.secure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold shrink-0 shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <span>View PDF</span>
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Unavailable</span>
                  )}
                </div>
              ) : (
                <div className="py-3 px-3.5 text-center bg-slate-50 rounded-md border border-slate-200/80">
                  <p className="text-xs text-slate-500 font-normal">
                    No bank confirmation document found in database for this case.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: SM & ASM DETAILS (Collapsible Section) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsExtendedDetailsExpanded(!isExtendedDetailsExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5 cursor-pointer select-none text-left"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    {/* SM Details */}
                    <div className="bg-slate-50 p-3 sm:p-3.5 rounded-md border border-slate-200/80 space-y-2">
                      <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                        Sales Manager (SM)
                      </span>

                      {smAsmData.sm ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div className="min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Name</span>
                            <span className="font-semibold text-slate-900 text-xs block truncate">{smAsmData.sm.name || "N/A"}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Mobile</span>
                            <span className="font-medium text-slate-900 text-xs tabular-nums block truncate">{smAsmData.sm.mobile_number || "N/A"}</span>
                          </div>
                          <div className="col-span-2 min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Email</span>
                            <span className="font-medium text-slate-700 text-xs block truncate">{smAsmData.sm.email || "N/A"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic py-1 text-center text-xs font-normal">
                          No SM details recorded for this case.
                        </p>
                      )}
                    </div>

                    {/* ASM Details */}
                    <div className="bg-slate-50 p-3 sm:p-3.5 rounded-md border border-slate-200/80 space-y-2">
                      <span className="font-semibold text-slate-900 text-xs block border-b border-slate-200/80 pb-1">
                        Area Sales Manager (ASM)
                      </span>

                      {smAsmData.asm ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div className="min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Name</span>
                            <span className="font-semibold text-slate-900 text-xs block truncate">{smAsmData.asm.name || "N/A"}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Mobile</span>
                            <span className="font-medium text-slate-900 text-xs tabular-nums block truncate">{smAsmData.asm.mobile_number || "N/A"}</span>
                          </div>
                          <div className="col-span-2 min-w-0">
                            <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-0.5 truncate">Email</span>
                            <span className="font-medium text-slate-700 text-xs block truncate">{smAsmData.asm.email || "N/A"}</span>
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
          <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsPaymentDetailsExpanded(!isPaymentDetailsExpanded)}
              className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-2.5 cursor-pointer select-none text-left"
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
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5 text-xs">
                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Payment Option</span>
                      <span className="font-semibold text-slate-900 text-xs block truncate">
                        {formatPaymentOptionLabel(paymentData.payment.payment_option)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Payment Rate</span>
                      <span className="font-medium text-slate-900 text-xs tabular-nums block truncate">
                        {paymentData.payment.payment_percentage
                          ? `${paymentData.payment.payment_percentage}%`
                          : "N/A"}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Base Loan Amount</span>
                      <span className="font-medium text-slate-900 text-xs tabular-nums block truncate">
                        {formatCurrency(paymentData.payment.loan_amount)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate">Payment Amount</span>
                      <span className="font-semibold text-emerald-700 text-xs tabular-nums block truncate">
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

        {/* Fixed Sticky Bottom Action Footer */}
        {(isSubmitted || isAccepted || isRejected) && (
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/80 bg-slate-50/50 shrink-0 sticky bottom-0 z-10">
            {isSubmitted ? (
              <>
                {/* Mobile warning text (stacked lines) */}
                <div className="sm:hidden w-full text-center mb-2 leading-tight">
                  {isApprovalAllowed ? (
                    <>
                      <p className="text-[11px] font-semibold text-emerald-700">
                        Ready to approve application
                      </p>
                      <p className="text-[10px] font-medium text-emerald-600 mt-0.5">
                        (All {totalAllDocs} documents verified & Bank PDF uploaded ✓)
                      </p>
                    </>
                  ) : !allDocsVerified && !hasBankPdf ? (
                    <>
                      <p className="text-[11px] font-medium text-amber-700">
                        Verify all {totalAllDocs} documents & upload Bank PDF to approve
                      </p>
                      <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                        ({verifiedCount} of {totalAllDocs} verified)
                      </p>
                    </>
                  ) : allDocsVerified && !hasBankPdf ? (
                    <>
                      <p className="text-[11px] font-medium text-amber-700">
                        Upload Bank Approval PDF in document section to approve
                      </p>
                      <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                        ({verifiedCount} of {totalAllDocs} verified • PDF pending)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium text-amber-700">
                        Verify remaining documents to approve
                      </p>
                      <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                        ({verifiedCount} of {totalAllDocs} verified • PDF uploaded ✓)
                      </p>
                    </>
                  )}
                </div>

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
                    disabled={!isApprovalAllowed}
                    onClick={() => {
                      if (!isApprovalAllowed) return;
                      setAcceptError("");
                      setShowAcceptConfirm(true);
                    }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors text-center ${
                      isApprovalAllowed
                        ? "btn-primary cursor-pointer text-white shadow-2xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                    }`}
                  >
                    Accept & Approve
                  </button>
                </div>

                {/* Desktop Footer: Stacked Status Line & Action Buttons */}
                <div className="hidden sm:flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
                    {isApprovalAllowed ? (
                      <>
                        <span className="text-[11px] font-semibold text-emerald-700 truncate">
                          Ready to approve application
                        </span>
                        <span className="text-[10px] font-medium text-emerald-600 truncate mt-0.5">
                          (All {totalAllDocs} documents verified & Bank PDF uploaded ✓)
                        </span>
                      </>
                    ) : !allDocsVerified && !hasBankPdf ? (
                      <>
                        <span className="text-[11px] font-medium text-amber-700 truncate">
                          Verify all {totalAllDocs} documents & upload Bank PDF to approve
                        </span>
                        <span className="text-[10px] font-semibold text-amber-600 truncate mt-0.5">
                          ({verifiedCount} of {totalAllDocs} verified)
                        </span>
                      </>
                    ) : allDocsVerified && !hasBankPdf ? (
                      <>
                        <span className="text-[11px] font-medium text-amber-700 truncate">
                          Upload Bank Approval PDF in document section to approve
                        </span>
                        <span className="text-[10px] font-semibold text-amber-600 truncate mt-0.5">
                          ({verifiedCount} of {totalAllDocs} verified • PDF pending)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-medium text-amber-700 truncate">
                          Verify remaining documents to approve
                        </span>
                        <span className="text-[10px] font-semibold text-amber-600 truncate mt-0.5">
                          ({verifiedCount} of {totalAllDocs} verified • PDF uploaded ✓)
                        </span>
                      </>
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
                      disabled={!isApprovalAllowed}
                      onClick={() => {
                        if (!isApprovalAllowed) return;
                        setAcceptError("");
                        setShowAcceptConfirm(true);
                      }}
                      className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                        isApprovalAllowed
                          ? "btn-primary cursor-pointer text-white shadow-2xs"
                          : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                      }`}
                    >
                      Accept & Approve
                    </button>
                  </div>
                </div>
              </>
            ) : isAccepted ? (
              <div className="w-full inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                <span>This application has already been approved.</span>
              </div>
            ) : isRejected ? (
              <div className="w-full inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200/80 text-xs font-medium">
                <span className="w-4 h-4 rounded-full bg-red-600 text-white inline-flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                <span>This application has been rejected.</span>
              </div>
            ) : null}
          </div>
        )}
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

            {(bankConfirmationPdf || verificationDocData.doc) && (
              <div className="p-2.5 rounded-md bg-purple-50 border border-purple-200/80 text-purple-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="text-base">🏦</span>
                  <div className="min-w-0">
                    <span className="font-semibold block truncate">
                      {bankConfirmationPdf?.name || verificationDocData.doc?.original_name}
                    </span>
                    <span className="text-[10px] text-purple-600 block">
                      {bankConfirmationPdf
                        ? `Bank Confirmation PDF Attached (${(bankConfirmationPdf.size / 1024).toFixed(0)} KB)`
                        : `Bank Confirmation PDF in Database (${((verificationDocData.doc?.file_size || 0) / 1024).toFixed(0)} KB)`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded border border-purple-200 shrink-0">Attached ✓</span>
              </div>
            )}

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
    </>
  );
}