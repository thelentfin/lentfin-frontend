import XLSX from "xlsx-js-style";

/**
 * Format currency in Indian Rupees format (₹ xx,xx,xxx)
 */
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === "" || isNaN(amount)) {
    return "₹0";
  }
  const numericAmount = Number(amount);
  const hasDecimals = numericAmount % 1 !== 0;
  return `₹${numericAmount.toLocaleString("en-IN", {
    maximumFractionDigits: hasDecimals ? 2 : 0,
    minimumFractionDigits: hasDecimals ? 2 : 0,
  })}`;
};

// Standard borders
const BORDER_SUBTLE = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

const BORDER_TOTAL = {
  top: { style: "double", color: { rgb: "334155" } },
  bottom: { style: "double", color: { rgb: "334155" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

/**
 * Export DSA & Sub-DSA Pending Payments to a simplified, compact Excel spreadsheet.
 * Designed to fit comfortably on standard screens without horizontal scrolling.
 */
export async function exportDsaPendingPaymentsToExcel({
  items = [],
  activeTab = "general",
}) {
  const lib = XLSX.default || XLSX;
  const ws = {};
  const merges = [];
  const rowHeights = {};
  let curRow = 0;

  const setCell = (colIdx, rowIdx, cellObj) => {
    const cellRef = lib.utils.encode_cell({ c: colIdx, r: rowIdx });
    ws[cellRef] = cellObj;
  };

  const addEmptyRow = (h = 8) => {
    rowHeights[curRow] = { hpt: h };
    curRow++;
  };

  // Only 10 focused columns (Col A to Col J) to completely eliminate horizontal scrolling
  const TOTAL_COLS = 10;

  // 1. TOP BRAND BANNER
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "LENTFIN — PARTNER PENDING COMMISSION PAYOUT STATEMENT",
    s: {
      fill: { fgColor: { rgb: "047857" } }, // Emerald 700
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  });
  rowHeights[curRow] = { hpt: 24 };
  curRow++;

  // 2. METADATA SUB-BANNER
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: `Bank Transfer Payout Sheet  |  Generated on: ${dateFormatted} at ${timeFormatted}  |  Category: ${activeTab === "car_loan" ? "Car Loans" : "General Loans"}`,
    s: {
      fill: { fgColor: { rgb: "ECFDF5" } },
      font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "065F46" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "A7F3D0" } } },
    },
  });
  rowHeights[curRow] = { hpt: 18 };
  curRow++;

  addEmptyRow(8);

  // 3. PARSE ITEMS INTO INDIVIDUAL PAYEE ROWS (Master DSA and Sub-DSA separately)
  const payeeRows = [];
  let totalPendingPayoutSum = 0;
  let masterDsaCount = 0;
  let subDsaCount = 0;

  items.forEach((item, itemIdx) => {
    const { dsa = {}, loan_case = {}, disbursement = {}, payment = {}, sub_dsa = null } = item;

    // Disbursed amount reference
    const disbursedAmt = Number(
      disbursement.disbursement_amount || loan_case.sanction_amount || item.sanction_amount || 0
    );

    // Total commission for this case
    const totalCaseCommission =
      payment.payment_amount !== null && payment.payment_amount !== undefined
        ? Number(payment.payment_amount)
        : (loan_case.calculated_commission !== null && loan_case.calculated_commission !== undefined
            ? Number(loan_case.calculated_commission)
            : (disbursedAmt > 0 ? Math.round(((disbursedAmt * 0.90) / 100) * 100) / 100 : 0));

    const caseNumber = loan_case.case_number || item.case_number || `CASE-${item.id || itemIdx + 1}`;
    const customerName = loan_case.customer_name || item.customer_name || "N/A";
    const caseReference = `${caseNumber} · ${customerName}`;

    // Check if case was introduced by a Sub-DSA
    const hasSubDsa = Boolean(sub_dsa && (sub_dsa.id || sub_dsa.name || item.sub_dsa_name));

    if (hasSubDsa) {
      // Sub-DSA commission share
      let subDsaAmt = 0;
      if (payment.sub_dsa_amount !== null && payment.sub_dsa_amount !== undefined) {
        subDsaAmt = Number(payment.sub_dsa_amount);
      } else if (payment.sub_dsa_percentage !== null && payment.sub_dsa_percentage !== undefined && disbursedAmt > 0) {
        subDsaAmt = Math.round(((disbursedAmt * Number(payment.sub_dsa_percentage)) / 100) * 100) / 100;
      } else {
        // Fallback: If no override split entered yet, assign total case commission to Sub-DSA
        subDsaAmt = totalCaseCommission;
      }

      // Master DSA override share
      let masterDsaAmt = 0;
      if (payment.dsa_override_amount !== null && payment.dsa_override_amount !== undefined) {
        masterDsaAmt = Number(payment.dsa_override_amount);
      } else if (totalCaseCommission >= subDsaAmt) {
        masterDsaAmt = Math.round((totalCaseCommission - subDsaAmt) * 100) / 100;
      }

      // 1. PUSH SUB-DSA ROW
      const subDsaName = sub_dsa.name || item.sub_dsa_name || "Sub-DSA Partner";
      const subDsaCode = sub_dsa.dsa_code || item.sub_dsa_code || "—";
      const subDsaBank = sub_dsa.bank_name || "—";
      const subDsaAccount = sub_dsa.account_number ? String(sub_dsa.account_number).trim() : "—";
      const subDsaIfsc = sub_dsa.ifsc_code ? String(sub_dsa.ifsc_code).trim().toUpperCase() : "—";
      const subDsaPan = sub_dsa.pan_number ? String(sub_dsa.pan_number).trim().toUpperCase() : "—";

      payeeRows.push({
        payeeType: "Sub DSA",
        partnerName: subDsaName,
        dsaCode: subDsaCode,
        bankName: subDsaBank,
        accountNumber: subDsaAccount,
        ifscCode: subDsaIfsc,
        panNumber: subDsaPan,
        caseReference,
        payoutAmount: subDsaAmt,
      });
      totalPendingPayoutSum += subDsaAmt;
      subDsaCount++;

      // 2. PUSH MASTER DSA ROW (Only if they have an overriding margin > 0)
      if (masterDsaAmt > 0) {
        const masterDsaName = dsa.name || "Master DSA";
        const masterDsaCode = dsa.dsa_code || "—";
        const masterDsaBank = dsa.bank_name || "—";
        const masterDsaAccount = dsa.account_number ? String(dsa.account_number).trim() : "—";
        const masterDsaIfsc = dsa.ifsc_code ? String(dsa.ifsc_code).trim().toUpperCase() : "—";
        const masterDsaPan = dsa.pan_number ? String(dsa.pan_number).trim().toUpperCase() : "—";

        payeeRows.push({
          payeeType: "Master DSA",
          partnerName: masterDsaName,
          dsaCode: masterDsaCode,
          bankName: masterDsaBank,
          accountNumber: masterDsaAccount,
          ifscCode: masterDsaIfsc,
          panNumber: masterDsaPan,
          caseReference,
          payoutAmount: masterDsaAmt,
        });
        totalPendingPayoutSum += masterDsaAmt;
        masterDsaCount++;
      }
    } else {
      // DIRECT CASE (NO SUB-DSA) -> 1 Row for Master DSA with full commission
      const masterDsaName = dsa.name || "Master DSA";
      const masterDsaCode = dsa.dsa_code || "—";
      const masterDsaBank = dsa.bank_name || "—";
      const masterDsaAccount = dsa.account_number ? String(dsa.account_number).trim() : "—";
      const masterDsaIfsc = dsa.ifsc_code ? String(dsa.ifsc_code).trim().toUpperCase() : "—";
      const masterDsaPan = dsa.pan_number ? String(dsa.pan_number).trim().toUpperCase() : "—";

      payeeRows.push({
        payeeType: "Master DSA",
        partnerName: masterDsaName,
        dsaCode: masterDsaCode,
        bankName: masterDsaBank,
        accountNumber: masterDsaAccount,
        ifscCode: masterDsaIfsc,
        panNumber: masterDsaPan,
        caseReference,
        payoutAmount: totalCaseCommission,
      });
      totalPendingPayoutSum += totalCaseCommission;
      masterDsaCount++;
    }
  });

  // 4. SUMMARY KPI CARDS (Spread cleanly across 10 columns)
  // Card 1: Total Payees / Transfers (Col A to Col C)
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow + 1, c: 2 } });
  setCell(0, curRow, {
    t: "s",
    v: `TOTAL TRANSFERS TO MAKE\n${payeeRows.length} Payees (${masterDsaCount} Master, ${subDsaCount} Sub)`,
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "334155" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER_SUBTLE,
    },
  });

  // Card 2: Total Cases Handled (Col D to Col F)
  merges.push({ s: { r: curRow, c: 3 }, e: { r: curRow + 1, c: 5 } });
  setCell(3, curRow, {
    t: "s",
    v: `TOTAL LOAN CASES\n${items.length} Cases Pending Payment`,
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER_SUBTLE,
    },
  });

  // Card 3: Total Pending Outflow Amount (Col G to Col J)
  merges.push({ s: { r: curRow, c: 6 }, e: { r: curRow + 1, c: TOTAL_COLS - 1 } });
  setCell(6, curRow, {
    t: "s",
    v: `TOTAL PENDING OUTFLOW\n${formatCurrency(totalPendingPayoutSum)}`,
    s: {
      fill: { fgColor: { rgb: "D1FAE5" } }, // Soft emerald
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "065F46" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "10B981" } },
        bottom: { style: "medium", color: { rgb: "10B981" } },
        left: { style: "medium", color: { rgb: "10B981" } },
        right: { style: "medium", color: { rgb: "10B981" } },
      },
    },
  });

  rowHeights[curRow] = { hpt: 18 };
  rowHeights[curRow + 1] = { hpt: 18 };
  curRow += 2;

  addEmptyRow(10);

  // 5. COMPACT 10 TABLE HEADERS (Row 8)
  const HEADERS = [
    { label: "Sr.", colWidth: 5 },
    { label: "Payee Type", colWidth: 13 },
    { label: "Partner Name", colWidth: 20 },
    { label: "DSA Code", colWidth: 13 },
    { label: "Bank Name", colWidth: 20 },
    { label: "Bank Account No.", colWidth: 22 },
    { label: "IFSC Code", colWidth: 13 },
    { label: "PAN No.", colWidth: 13 },
    { label: "Case & Customer", colWidth: 25 },
    { label: "Net Payout (₹)", colWidth: 16 },
  ];

  HEADERS.forEach((h, colIdx) => {
    setCell(colIdx, curRow, {
      t: "s",
      v: h.label,
      s: {
        fill: { fgColor: { rgb: "0F172A" } }, // Slate 900
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        alignment: {
          horizontal: ["Sr.", "Payee Type", "DSA Code", "IFSC Code", "PAN No."].includes(h.label)
            ? "center"
            : h.label === "Net Payout (₹)"
            ? "right"
            : "left",
          vertical: "center",
          wrapText: true,
        },
        border: BORDER_SUBTLE,
      },
    });
  });
  rowHeights[curRow] = { hpt: 24 };
  curRow++;

  // 6. DATA ROWS
  payeeRows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    const bgRgb = isEven ? "FFFFFF" : "F8FAFC";

    const commonStyle = (align = "left", bold = false, colorRgb = "1E293B") => ({
      fill: { fgColor: { rgb: bgRgb } },
      font: { name: "Calibri", sz: 9.5, bold, color: { rgb: colorRgb } },
      alignment: { horizontal: align, vertical: "center" },
      border: BORDER_SUBTLE,
    });

    // 0: Sr. No.
    setCell(0, curRow, { t: "n", v: idx + 1, s: commonStyle("center", false, "64748B") });

    // 1: Payee Type (Strictly 2 values: "Master DSA" or "Sub DSA")
    const isSub = row.payeeType === "Sub DSA";
    setCell(1, curRow, {
      t: "s",
      v: row.payeeType,
      s: {
        fill: { fgColor: { rgb: isSub ? "F3E8FF" : "F1F5F9" } }, // Purple tint for Sub DSA, Slate for Master DSA
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: isSub ? "6B21A8" : "334155" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // 2: Partner Name
    setCell(2, curRow, { t: "s", v: row.partnerName, s: commonStyle("left", true, "0F172A") });

    // 3: DSA Code
    setCell(3, curRow, { t: "s", v: row.dsaCode, s: commonStyle("center", true, "475569") });

    // 4: Bank Name
    setCell(4, curRow, { t: "s", v: row.bankName, s: commonStyle("left", false, "334155") });

    // 5: Bank Account No. (Formatted as string with Consolas monospace)
    setCell(5, curRow, {
      t: "s",
      v: row.accountNumber,
      s: {
        ...commonStyle("left", true, "0F172A"),
        font: { name: "Consolas", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
      },
    });

    // 6: IFSC Code (Consolas monospace)
    setCell(6, curRow, {
      t: "s",
      v: row.ifscCode,
      s: {
        ...commonStyle("center", true, "334155"),
        font: { name: "Consolas", sz: 9.5, bold: true, color: { rgb: "334155" } },
      },
    });

    // 7: PAN Number
    setCell(7, curRow, { t: "s", v: row.panNumber, s: commonStyle("center", false, "475569") });

    // 8: Case & Customer Reference
    setCell(8, curRow, { t: "s", v: row.caseReference, s: commonStyle("left", false, "475569") });

    // 9: Net Payout (₹) - Highlighted in soft emerald with bold green text
    setCell(9, curRow, {
      t: "s",
      v: formatCurrency(row.payoutAmount),
      s: {
        fill: { fgColor: { rgb: isEven ? "ECFDF5" : "E6FBF2" } },
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "047857" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    rowHeights[curRow] = { hpt: 20 };
    curRow++;
  });

  // 7. TOTALS ROW
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 8 } });
  setCell(0, curRow, {
    t: "s",
    v: "TOTAL PENDING BANK PAYOUT OUTFLOW",
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  // Net Payout Total Cell (Column 9)
  setCell(9, curRow, {
    t: "s",
    v: formatCurrency(totalPendingPayoutSum),
    s: {
      fill: { fgColor: { rgb: "D1FAE5" } },
      font: { name: "Calibri", sz: 10.5, bold: true, color: { rgb: "047857" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  addEmptyRow(10);

  // 8. FOOTER NOTE
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: TOTAL_COLS - 1 } });
  setCell(0, curRow, {
    t: "s",
    v: `* This document is generated from the LentFin Portal for offline NEFT/RTGS bank commission payouts. Verify beneficiary account numbers before initiating bank transfers.`,
    s: {
      font: { name: "Calibri", sz: 8.5, italic: true, color: { rgb: "94A3B8" } },
      alignment: { horizontal: "left", vertical: "center" },
    },
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  // 9. WORKSHEET PROPERTIES
  ws["!merges"] = merges;
  ws["!rows"] = Object.keys(rowHeights).map((k) => rowHeights[k]);
  ws["!cols"] = HEADERS.map((h) => ({ wch: h.colWidth }));
  ws["!ref"] = lib.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: curRow - 1, c: TOTAL_COLS - 1 },
  });

  // 10. WRITE FILE & DOWNLOAD
  const wb = lib.utils.book_new();
  const sheetName = activeTab === "car_loan" ? "CarLoan_Payouts" : "DSA_Pending_Payouts";
  lib.utils.book_append_sheet(wb, ws, sheetName);

  const safeDate = now.toISOString().slice(0, 10);
  const fileName = `LentFin_Pending_Payouts_${activeTab === "car_loan" ? "CarLoans_" : ""}${safeDate}.xlsx`;
  lib.writeFile(wb, fileName);

  return {
    totalCases: items.length,
    totalPayees: payeeRows.length,
    totalPayout: totalPendingPayoutSum,
    fileName,
  };
}
