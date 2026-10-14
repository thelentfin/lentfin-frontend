import XLSX from "xlsx-js-style";

/**
 * Format currency in Indian Rupees format (₹ xx,xx,xxx)
 */
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === "" || isNaN(amount)) {
    return "N/A";
  }
  const numericAmount = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericAmount);
};

/**
 * Format date to standard readable string (e.g., 22-Sep-2026)
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * Format timestamp (e.g., 22-Sep-2026, 02:45 PM)
 */
const formatTimestamp = (date) => {
  try {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return new Date().toLocaleString();
  }
};

// ==========================================
// BRAND COLOR PALETTE & STYLE DEFINITIONS
// ==========================================
const BORDER_SUBTLE = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

const BORDER_PURPLE = {
  top: { style: "thin", color: { rgb: "5B21B6" } },
  bottom: { style: "thin", color: { rgb: "5B21B6" } },
  left: { style: "thin", color: { rgb: "5B21B6" } },
  right: { style: "thin", color: { rgb: "5B21B6" } },
};

const BORDER_RED = {
  top: { style: "thin", color: { rgb: "FCA5A5" } },
  bottom: { style: "thin", color: { rgb: "FCA5A5" } },
  left: { style: "thin", color: { rgb: "FCA5A5" } },
  right: { style: "thin", color: { rgb: "FCA5A5" } },
};

// Title Banner Style
const STYLE_MAIN_BANNER = {
  fill: { fgColor: { rgb: "4C1D95" } }, // Deep Brand Purple (Purple 900)
  font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center" },
};

// Sub-header / Timestamp Style
const STYLE_SUB_BANNER = {
  fill: { fgColor: { rgb: "F5F3FF" } }, // Purple 50
  font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "6B21A8" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Section Header Style
const STYLE_SECTION_HEADER = {
  fill: { fgColor: { rgb: "6D28D9" } }, // Brand Purple 700
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
  border: BORDER_PURPLE,
};

// Table Column Header Style
const STYLE_TH = {
  fill: { fgColor: { rgb: "EDE9FE" } }, // Purple 100
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "4C1D95" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Label Cell Style (Col A & C)
const STYLE_LABEL = {
  fill: { fgColor: { rgb: "F8FAFC" } }, // Slate 50
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "475569" } }, // Slate 600
  alignment: { horizontal: "left", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Value Cell Style (Col B & D)
const STYLE_VALUE = {
  fill: { fgColor: { rgb: "FFFFFF" } },
  font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } }, // Slate 900
  alignment: { horizontal: "left", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Highlight Amount Value (Emerald)
const STYLE_VALUE_AMOUNT = {
  fill: { fgColor: { rgb: "FFFFFF" } },
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "047857" } }, // Emerald 700
  alignment: { horizontal: "left", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Document Action Button Style
const STYLE_BUTTON = {
  fill: { fgColor: { rgb: "7C3AED" } }, // Vibrant Brand Purple 600
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER_PURPLE,
};

// Disabled Button Style (when URL unavailable)
const STYLE_BUTTON_DISABLED = {
  fill: { fgColor: { rgb: "F1F5F9" } }, // Slate 100
  font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "94A3B8" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDER_SUBTLE,
};

// Rejection Banner Style
const STYLE_REJECT_BANNER = {
  fill: { fgColor: { rgb: "FEF2F2" } }, // Red 50
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "991B1B" } }, // Red 800
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
  border: BORDER_RED,
};

/**
 * Main Export Function
 * Exports a single Customer Application Dossier into a structured, branded Excel file (.xlsx)
 */
export async function exportCustomerApplicationToExcel({
  item,
  loanCaseDetailData = {},
  smAsmData = {},
  verificationDocs = [],
  customerMobile = "N/A",
  applicationNumber = "N/A",
  loanAccountNumber = "N/A",
  bankName = "N/A",
  companyName = "N/A",
  sanctionDocName = "N/A",
  sanctionDocUrl = null,
  isPddClearedYes = false,
  pddDocName = "N/A",
  pddDocUrl = null,
  currentStatus = "SUBMITTED",
  productName = "N/A",
  customerEmail = "N/A",
  panNumber = "N/A",
  city = "N/A",
  sanctionDate = null,
  approvalDate = null,
  effectiveSubDsa = null,
  dsaMobile = "N/A",
  tranchesList = [],
  effectivePendingDisbursal = 0,
  effectiveCurrentDisbursed = 0,
  effectiveSanctionAmount = 0,
}) {
  const lib = XLSX.default || XLSX;
  const { dsa = {}, loan_case = {}, disbursement = {}, sub_dsa = null } = item || {};
  const caseData = loanCaseDetailData?.caseData || loan_case || {};

  const customerName =
    loan_case.customer_name ||
    caseData.customer_name ||
    item?.customer_name ||
    "Customer";
  const caseNumber =
    loan_case.case_number ||
    caseData.case_number ||
    applicationNumber ||
    "N/A";

  const resolvedProductName =
    productName && productName !== "N/A"
      ? productName
      : loan_case.product_name ||
        caseData.product_name ||
        item?.product_name ||
        "Loan Product";


  const resolvedCity =
    city && city !== "N/A"
      ? city
      : loan_case.city ||
        caseData.city ||
        item?.city ||
        "";

  const resolvedSanctionDate =
    sanctionDate ||
    loan_case.sanction_date ||
    caseData.sanction_date ||
    item?.sanction_date ||
    approvalDate ||
    loan_case.approved_at ||
    item?.approved_at ||
    null;

  const resolvedSubDsa =
    effectiveSubDsa ||
    sub_dsa ||
    item?.sub_dsa ||
    (item?.sub_dsa_name
      ? {
          name: item.sub_dsa_name,
          dsa_code: item.sub_dsa_code,
          mobile: item.sub_dsa_mobile,
          email: item.sub_dsa_email,
        }
      : null);

  const resolvedDsaMobile =
    dsaMobile && dsaMobile !== "N/A"
      ? dsaMobile
      : dsa.mobile_number ||
        dsa.mobile ||
        item?.dsa_mobile ||
        item?.dsa?.mobile_number ||
        "N/A";

  const resolvedSanctionAmount =
    effectiveSanctionAmount > 0
      ? effectiveSanctionAmount
      : Number(loan_case.sanction_amount || caseData.sanction_amount || item?.sanction_amount || 0);

  const resolvedDisbursedAmount =
    effectiveCurrentDisbursed > 0
      ? effectiveCurrentDisbursed
      : Number(disbursement.disbursement_amount || item?.disbursement?.disbursement_amount || 0);

  const resolvedPendingDisbursal =
    effectivePendingDisbursal >= 0 && resolvedSanctionAmount > 0
      ? effectivePendingDisbursal
      : Math.max(0, resolvedSanctionAmount - resolvedDisbursedAmount);

  const disbursalPercent =
    resolvedSanctionAmount > 0
      ? Math.min(100, Math.round((resolvedDisbursedAmount / resolvedSanctionAmount) * 100))
      : 100;

  const ws = {};
  const merges = [];
  const rowHeights = [];
  let curRow = 0;

  // Helper to set cell
  const setCell = (colIdx, rowIdx, cellData) => {
    const addr = lib.utils.encode_cell({ r: rowIdx, c: colIdx });
    ws[addr] = cellData;
  };

  // Helper to add merged section banner
  const addMergedRow = (title, style, height = 24) => {
    for (let c = 0; c < 4; c++) {
      setCell(c, curRow, {
        t: "s",
        v: c === 0 ? title : "",
        s: style,
      });
    }
    merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 3 } });
    rowHeights[curRow] = { hpt: height };
    curRow++;
  };

  // Helper to add empty spacing row
  const addEmptyRow = (height = 10) => {
    for (let c = 0; c < 4; c++) {
      setCell(c, curRow, { t: "s", v: "", s: {} });
    }
    rowHeights[curRow] = { hpt: height };
    curRow++;
  };

  // Helper to add a 4-column key-value row
  const add2PairRow = (
    label1,
    val1,
    label2 = "",
    val2 = "",
    isVal1Amount = false,
    isVal2Amount = false
  ) => {
    setCell(0, curRow, { t: "s", v: label1, s: STYLE_LABEL });
    setCell(1, curRow, {
      t: "s",
      v: String(val1 ?? "N/A"),
      s: isVal1Amount ? STYLE_VALUE_AMOUNT : STYLE_VALUE,
    });
    setCell(2, curRow, { t: "s", v: label2, s: STYLE_LABEL });
    setCell(3, curRow, {
      t: "s",
      v: String(val2 ?? "N/A"),
      s: isVal2Amount ? STYLE_VALUE_AMOUNT : STYLE_VALUE,
    });
    rowHeights[curRow] = { hpt: 20 };
    curRow++;
  };

  // Helper to create a Button cell with HYPERLINK
  const makeButtonCell = (url, label = "📂 View Document") => {
    if (url && typeof url === "string" && url.trim().length > 0) {
      const cleanUrl = url.trim();
      return {
        f: `HYPERLINK("${cleanUrl}", "${label}")`,
        v: label,
        s: STYLE_BUTTON,
      };
    }
    return {
      t: "s",
      v: "Unavailable",
      s: STYLE_BUTTON_DISABLED,
    };
  };

  // ==========================================
  // 1. HEADER
  // ==========================================
  addMergedRow(
    "LENTFIN FINANCIAL SERVICES - CUSTOMER LOAN APPLICATION",
    STYLE_MAIN_BANNER,
    28
  );

  addMergedRow(`Export Date: ${formatTimestamp(new Date())}`, STYLE_SUB_BANNER, 18);
  addEmptyRow(8);

  // ==========================================
  // 2. REJECTION REASON (ONLY IF REJECTED)
  // ==========================================
  const isRejected = (currentStatus || "").toUpperCase() === "REJECTED";
  const rejectReason =
    loanCaseDetailData?.caseData?.reject_reason ||
    caseData?.reject_reason ||
    loan_case?.reject_reason ||
    item?.reject_reason ||
    "";
  if (isRejected && rejectReason) {
    addMergedRow(`⚠️ REJECTION REASON: ${rejectReason}`, STYLE_REJECT_BANNER, 22);
    addEmptyRow(8);
  }

  // ==========================================
  // 3. SECTION 1: CUSTOMER & CASE OVERVIEW (FROM DRAWER)
  // ==========================================
  const resolvedCompanyName =
    companyName && companyName !== "N/A"
      ? companyName
      : loanCaseDetailData?.caseData?.company_name ||
        loanCaseDetailData?.caseData?.company?.company_name ||
        loan_case?.company_name ||
        loan_case?.company?.company_name ||
        item?.company_name ||
        "N/A";

  addMergedRow("1. CUSTOMER & CASE OVERVIEW", STYLE_SECTION_HEADER, 22);
  add2PairRow(
    "Customer Name",
    customerName,
    "Mobile Number",
    customerMobile || "N/A"
  );
  add2PairRow(
    "Application Number",
    applicationNumber || "N/A",
    "Loan Account Number",
    loanAccountNumber || "N/A"
  );
  add2PairRow(
    "Corporate Company",
    resolvedCompanyName,
    "Lending Bank",
    bankName || "N/A"
  );
  add2PairRow(
    "Product / Loan Type",
    resolvedProductName,
    "Application Status",
    (currentStatus || "SUBMITTED").toUpperCase()
  );
  add2PairRow(
    "Case Number",
    caseNumber || "N/A",
    "Sanction Amount",
    formatCurrency(resolvedSanctionAmount),
    false,
    true
  );
  add2PairRow(
    "Submitted Date",
    formatDate(
      disbursement.created_at ||
        disbursement.disbursement_date ||
        item?.created_at
    ),
    resolvedCity ? "Customer City / Location" : "",
    resolvedCity || ""
  );
  addEmptyRow(8);

  // ==========================================
  // 4. SECTION 2: DSA & REFERRAL PARTNER DETAILS
  // ==========================================
  addMergedRow("2. DSA & REFERRAL PARTNER DETAILS", STYLE_SECTION_HEADER, 22);
  add2PairRow(
    "DSA Partner Name",
    dsa.name || "N/A",
    "DSA Code",
    dsa.dsa_code || "N/A"
  );
  add2PairRow(
    "DSA Email",
    dsa.email || "N/A",
    "DSA Mobile",
    resolvedDsaMobile
  );
  add2PairRow(
    "Referral Partner Type",
    resolvedSubDsa ? "Sub-DSA Partner Referral" : "Direct Partner (Self)",
    "Sub-DSA Partner Name",
    resolvedSubDsa?.name || "Direct (None)"
  );
  if (resolvedSubDsa) {
    add2PairRow(
      "Sub-DSA Code",
      resolvedSubDsa.dsa_code || "N/A",
      "Sub-DSA Mobile",
      resolvedSubDsa.mobile || resolvedSubDsa.mobile_number || "N/A"
    );
    if (resolvedSubDsa.email) {
      add2PairRow(
        "Sub-DSA Email",
        resolvedSubDsa.email,
        "",
        ""
      );
    }
  }
  addEmptyRow(8);

  // ==========================================
  // 5. SECTION 3: SANCTION & DISBURSEMENT DETAILS
  // ==========================================
  addMergedRow("3. SANCTION & DISBURSEMENT DETAILS", STYLE_SECTION_HEADER, 22);
  add2PairRow(
    "Sanction Amount",
    formatCurrency(resolvedSanctionAmount),
    "Sanction Status",
    loan_case.status || caseData.status || "Active",
    true,
    false
  );
  add2PairRow(
    "Disbursement Type",
    disbursement.disbursement_type || (resolvedPendingDisbursal > 0 ? "PART" : "FULL"),
    "Total Disbursed Amount",
    formatCurrency(resolvedDisbursedAmount),
    false,
    true
  );
  add2PairRow(
    "Pending Disbursal Balance",
    formatCurrency(resolvedPendingDisbursal),
    "Disbursal Progress",
    `${disbursalPercent}% (${resolvedPendingDisbursal === 0 ? "Fully Disbursed" : "Part Disbursed"})`,
    true,
    false
  );
  add2PairRow(
    "Disbursement Date",
    formatDate(disbursement.disbursement_date),
    "Interest Rate",
    disbursement.rate ? `${disbursement.rate}%` : "N/A"
  );
  add2PairRow(
    "Processing Fee (PF)",
    formatCurrency(disbursement.pf),
    "Loan Tenure",
    disbursement.tenure ? `${disbursement.tenure} Months` : "N/A",
    true,
    false
  );

  // Multi-Tranche Disbursement History Log (if tranches exist)
  if (Array.isArray(tranchesList) && tranchesList.length > 0) {
    addEmptyRow(4);
    // Sub-header for Tranche History
    setCell(0, curRow, {
      t: "s",
      v: `DISBURSEMENT TRANCHES HISTORY (${tranchesList.length} TRANCHE${tranchesList.length !== 1 ? "S" : ""})`,
      s: {
        fill: { fgColor: { rgb: "F5F3FF" } },
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "5B21B6" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: BORDER_SUBTLE,
      },
    });
    for (let c = 1; c < 4; c++) {
      setCell(c, curRow, { t: "s", v: "", s: { fill: { fgColor: { rgb: "F5F3FF" } }, border: BORDER_SUBTLE } });
    }
    merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 3 } });
    rowHeights[curRow] = { hpt: 20 };
    curRow++;

    // Table Column Headers
    setCell(0, curRow, { t: "s", v: "Tranche #", s: STYLE_TH });
    setCell(1, curRow, { t: "s", v: "Disbursement Date", s: STYLE_TH });
    setCell(2, curRow, { t: "s", v: "Disbursed Amount", s: STYLE_TH });
    setCell(3, curRow, { t: "s", v: "Reference / Cheque & Remarks", s: STYLE_TH });
    rowHeights[curRow] = { hpt: 20 };
    curRow++;

    tranchesList.forEach((tranche, idx) => {
      const trancheLabel = tranche.tranche_number ? `Tranche #${tranche.tranche_number}` : `Tranche #${idx + 1}`;
      const trancheDate = formatDate(tranche.disbursement_date);
      const trancheAmt = formatCurrency(tranche.amount);
      const refRemarks = [
        tranche.cheque_reference ? `Ref: ${tranche.cheque_reference}` : "",
        tranche.remarks || "",
      ].filter(Boolean).join(" — ") || "Settled";

      setCell(0, curRow, { t: "s", v: trancheLabel, s: { ...STYLE_LABEL, alignment: { horizontal: "center" } } });
      setCell(1, curRow, { t: "s", v: trancheDate, s: { ...STYLE_VALUE, alignment: { horizontal: "center" } } });
      setCell(2, curRow, { t: "s", v: trancheAmt, s: STYLE_VALUE_AMOUNT });
      setCell(3, curRow, { t: "s", v: refRemarks, s: STYLE_VALUE });
      rowHeights[curRow] = { hpt: 20 };
      curRow++;
    });
  }
  addEmptyRow(8);

  // ==========================================
  // 6. SECTION 4: PDD DETAILS & VERIFICATION DOCUMENT
  // ==========================================
  addMergedRow("4. PDD DETAILS & VERIFICATION DOCUMENT", STYLE_SECTION_HEADER, 22);
  setCell(0, curRow, { t: "s", v: "PDD Cleared Status", s: STYLE_LABEL });
  setCell(1, curRow, {
    t: "s",
    v: isPddClearedYes ? "✓ Cleared (YES)" : "Pending (NO)",
    s: {
      ...STYLE_VALUE,
      font: {
        name: "Calibri",
        sz: 10,
        bold: true,
        color: { rgb: isPddClearedYes ? "047857" : "B45309" },
      },
    },
  });
  setCell(2, curRow, { t: "s", v: "PDD Document", s: STYLE_LABEL });
  if (isPddClearedYes && pddDocUrl) {
    setCell(3, curRow, makeButtonCell(pddDocUrl, "📂 View PDD Document"));
  } else {
    setCell(3, curRow, { t: "s", v: isPddClearedYes ? pddDocName : "N/A", s: STYLE_VALUE });
  }
  rowHeights[curRow] = { hpt: 20 };
  curRow++;
  addEmptyRow(8);

  // ==========================================
  // 7. SECTION 5: SALES MANAGEMENT TEAM (SM & ASM)
  // ==========================================
  addMergedRow("5. SALES MANAGEMENT TEAM (SM & ASM)", STYLE_SECTION_HEADER, 22);
  add2PairRow(
    "Sales Manager (SM) Name",
    smAsmData?.sm?.name || "N/A",
    "Area Sales Manager (ASM) Name",
    smAsmData?.asm?.name || "N/A"
  );
  add2PairRow(
    "SM Mobile",
    smAsmData?.sm?.mobile_number || smAsmData?.sm?.mobile || "N/A",
    "ASM Mobile",
    smAsmData?.asm?.mobile_number || smAsmData?.asm?.mobile || "N/A"
  );
  add2PairRow(
    "SM Email",
    smAsmData?.sm?.email || "N/A",
    "ASM Email",
    smAsmData?.asm?.email || "N/A"
  );
  addEmptyRow(8);

  // ==========================================
  // 8. SECTION 6: DOCUMENT VERIFICATION / UPLOADED DOCUMENTS (WITH BUTTONS)
  // ==========================================
  addMergedRow("6. DOCUMENT VERIFICATION & CLOUD DOCUMENTS", STYLE_SECTION_HEADER, 22);

  // Table Headers
  setCell(0, curRow, { t: "s", v: "#", s: STYLE_TH });
  setCell(1, curRow, { t: "s", v: "Document Type", s: STYLE_TH });
  setCell(2, curRow, { t: "s", v: "Document File Name", s: STYLE_TH });
  setCell(3, curRow, { t: "s", v: "Action", s: STYLE_TH });
  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  const allDocumentsList = [];

  // 1. Sanction Letter
  if (sanctionDocUrl || sanctionDocName !== "N/A") {
    allDocumentsList.push({
      label: "Sanction Letter",
      name: sanctionDocName || "sanction_letter.pdf",
      url: sanctionDocUrl,
    });
  }

  // 2. PDD Document
  if (isPddClearedYes && (pddDocUrl || pddDocName !== "N/A")) {
    allDocumentsList.push({
      label: "PDD Document",
      name: pddDocName || "pdd_document.pdf",
      url: pddDocUrl,
    });
  }

  // 3. Other verified documents
  if (Array.isArray(verificationDocs)) {
    verificationDocs.forEach((doc) => {
      if (
        doc &&
        doc.url &&
        !allDocumentsList.some((existing) => existing.url === doc.url)
      ) {
        allDocumentsList.push({
          label: doc.label || "Document",
          name: doc.name || "document.pdf",
          url: doc.url,
        });
      }
    });
  }

  if (allDocumentsList.length === 0) {
    setCell(0, curRow, { t: "s", v: "1", s: { ...STYLE_VALUE, alignment: { horizontal: "center" } } });
    setCell(1, curRow, { t: "s", v: "Documents", s: STYLE_VALUE });
    setCell(2, curRow, { t: "s", v: "No documents uploaded for this application", s: STYLE_VALUE });
    setCell(3, curRow, { t: "s", v: "N/A", s: { ...STYLE_VALUE, alignment: { horizontal: "center" } } });
    rowHeights[curRow] = { hpt: 20 };
    curRow++;
  } else {
    allDocumentsList.forEach((doc, idx) => {
      setCell(0, curRow, {
        t: "s",
        v: String(idx + 1),
        s: { ...STYLE_VALUE, alignment: { horizontal: "center" } },
      });
      setCell(1, curRow, { t: "s", v: doc.label, s: STYLE_LABEL });
      setCell(2, curRow, { t: "s", v: doc.name, s: STYLE_VALUE });
      // Button Cell in Column D
      setCell(3, curRow, makeButtonCell(doc.url, "📂 View Document"));
      rowHeights[curRow] = { hpt: 22 };
      curRow++;
    });
  }

  addEmptyRow(12);

  // End of Application Dossier Banner
  addMergedRow(
    "End of Application Report - Lentfin Financial Services",
    {
      fill: { fgColor: { rgb: "F8FAFC" } },
      font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "94A3B8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
    18
  );

  // Set worksheet range
  ws["!ref"] = lib.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: curRow - 1, c: 3 },
  });

  // Apply merges
  ws["!merges"] = merges;

  // Set explicit column widths for beautiful layout
  ws["!cols"] = [
    { wch: 28 }, // Column A: Label 1 / Index
    { wch: 34 }, // Column B: Value 1 / Document Type
    { wch: 28 }, // Column C: Label 2 / Document Name
    { wch: 34 }, // Column D: Value 2 / Button Action
  ];

  // Set row heights
  ws["!rows"] = rowHeights;

  // Create Workbook & Write
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, "Customer Application");

  // Safe filename
  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeCaseNumber = String(caseNumber).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Customer_Application_${safeCaseNumber}_${safeCustomerName}.xlsx`;

  // Write and trigger download in browser
  lib.writeFile(wb, fileName);
}
