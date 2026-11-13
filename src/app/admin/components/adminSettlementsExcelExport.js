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

/**
 * Format date to standard readable string (e.g., 24-Sep-2026)
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
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

// Border styles
const BORDER_SUBTLE = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

const BORDER_TOTAL = {
  top: { style: "double", color: { rgb: "475569" } },
  bottom: { style: "thin", color: { rgb: "475569" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

export async function exportAdminSettlementsToExcel({
  cases = [],
  metrics = {},
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

  const addEmptyRow = (h = 10) => {
    rowHeights[curRow] = { hpt: h };
    curRow++;
  };

  const TOTAL_COLS = 15; // Col A to Col O

  // 1. TOP BRAND BANNER (LENTFIN PURPLE)
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "LENTFIN FINANCIAL SERVICES — CORPORATE SETTLEMENT & PROFIT SPREAD STATEMENT",
    s: {
      fill: { fgColor: { rgb: "6D28D9" } }, // Brand Purple
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  });
  rowHeights[curRow] = { hpt: 26 };
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
    v: `Corporate Revenue Ledger  |  Generated on: ${dateFormatted} at ${timeFormatted}  |  Official Admin Audit Record`,
    s: {
      fill: { fgColor: { rgb: "F5F3FF" } }, // Soft purple tint
      font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "6D28D9" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "DDD6FE" } } },
    },
  });
  rowHeights[curRow] = { hpt: 18 };
  curRow++;

  addEmptyRow(12);

  // 3. EXECUTIVE KPI CARDS (2x2 Grid)
  const totalVolume = Number(metrics.totalVolume || 0);
  const totalBankInflow = Number(metrics.totalBankInflow || 0);
  const totalDsaOutflow = Number(metrics.totalDsaOutflow || 0);
  const totalAdminProfit = Number(metrics.totalAdminProfit || 0);

  const kpis = [
    {
      title: "TOTAL DISBURSED VOLUME",
      val: formatCurrency(totalVolume),
      sub: `${cases.length} Total Registered Files`,
      bg: "F8FAFC",
      titleCol: "475569",
      valCol: "0F172A",
    },
    {
      title: "GROSS BANK INFLOW (1.50%)",
      val: formatCurrency(totalBankInflow),
      sub: "Lender Corporate Commissions",
      bg: "F5F3FF",
      titleCol: "6D28D9",
      valCol: "6D28D9",
    },
    {
      title: "DSA COMMISSION OUTFLOW",
      val: formatCurrency(totalDsaOutflow),
      sub: "Disbursed Partner Commissions",
      bg: "FFFBEB",
      titleCol: "B45309",
      valCol: "D97706",
    },
    {
      title: "PLATFORM NET PROFIT SPREAD",
      val: formatCurrency(totalAdminProfit),
      sub: "Net Retained Platform Margin (Spread)",
      bg: "ECFDF5",
      titleCol: "047857",
      valCol: "059669",
    },
  ];

  // First Row of KPIs
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 2 } });
  merges.push({ s: { r: curRow, c: 4 }, e: { r: curRow, c: 6 } });
  merges.push({ s: { r: curRow, c: 8 }, e: { r: curRow, c: 10 } });
  merges.push({ s: { r: curRow, c: 11 }, e: { r: curRow, c: 13 } });

  [0, 4, 8, 11].forEach((col, idx) => {
    setCell(col, curRow, {
      t: "s",
      v: kpis[idx].title,
      s: {
        font: { name: "Calibri", sz: 8.5, bold: true, color: { rgb: kpis[idx].titleCol } },
        fill: { fgColor: { rgb: kpis[idx].bg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      },
    });
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  // Values row
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 2 } });
  merges.push({ s: { r: curRow, c: 4 }, e: { r: curRow, c: 6 } });
  merges.push({ s: { r: curRow, c: 8 }, e: { r: curRow, c: 10 } });
  merges.push({ s: { r: curRow, c: 11 }, e: { r: curRow, c: 13 } });

  [0, 4, 8, 11].forEach((col, idx) => {
    setCell(col, curRow, {
      t: "s",
      v: kpis[idx].val,
      s: {
        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: kpis[idx].valCol } },
        fill: { fgColor: { rgb: kpis[idx].bg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      },
    });
  });
  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  // Subtitles row
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 2 } });
  merges.push({ s: { r: curRow, c: 4 }, e: { r: curRow, c: 6 } });
  merges.push({ s: { r: curRow, c: 8 }, e: { r: curRow, c: 10 } });
  merges.push({ s: { r: curRow, c: 11 }, e: { r: curRow, c: 13 } });

  [0, 4, 8, 11].forEach((col, idx) => {
    setCell(col, curRow, {
      t: "s",
      v: kpis[idx].sub,
      s: {
        font: { name: "Calibri", sz: 8, italic: true, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: kpis[idx].bg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } },
      },
    });
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  addEmptyRow(12);

  // 4. TABLE SECTION HEADER
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "SETTLEMENT AUDIT REGISTER (CASE-BY-CASE REVENUE SPREAD)",
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1E293B" } },
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
      border: {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      },
    },
  });
  rowHeights[curRow] = { hpt: 20 };
  curRow++;

  // 5. TABLE COLUMN HEADERS
  const headers = [
    { title: "CASE #", align: "center" },
    { title: "DATE", align: "center" },
    { title: "CORPORATE CO.", align: "left" },
    { title: "DSA PARTNER", align: "left" },
    { title: "CUSTOMER", align: "left" },
    { title: "LENDER / BANK", align: "left" },
    { title: "DISBURSED AMT (₹)", align: "right" },
    { title: "CORP RATE %", align: "center" },
    { title: "CORP INFLOW (₹)", align: "right" },
    { title: "DSA PLAN", align: "center" },
    { title: "DSA RATE", align: "center" },
    { title: "DSA PAYOUT (₹)", align: "right" },
    { title: "NET PROFIT (₹)", align: "right" },
    { title: "NET MARGIN", align: "center" },
    { title: "SETTLEMENT STATUS", align: "center" },
  ];

  headers.forEach((h, colIdx) => {
    setCell(colIdx, curRow, {
      t: "s",
      v: h.title,
      s: {
        fill: { fgColor: { rgb: "6D28D9" } }, // Brand Purple Header
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: h.align, vertical: "center", wrapText: true },
        border: BORDER_SUBTLE,
      },
    });
  });
  rowHeights[curRow] = { hpt: 24 };
  curRow++;

  // 6. TABLE DATA ROWS
  let sumDisbursed = 0;
  let sumBankInflow = 0;
  let sumDsaPayout = 0;
  let sumNetProfit = 0;

  cases.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "FBFBFE";

    const disbAmt = Number(item.disbursedAmount || item.baseAmount || 0);
    const bankInflowAmt = Number(item.bankInflowAmount || 0);
    const dsaPayoutAmt = Number(item.dsaCommissionAmount || 0);
    const netProfitAmt = Number(item.netProfitSpread || 0);

    sumDisbursed += disbAmt;
    sumBankInflow += bankInflowAmt;
    sumDsaPayout += dsaPayoutAmt;
    sumNetProfit += netProfitAmt;

    const isPaid = item.isAccepted;
    const statusText = isPaid ? "PAID / UNLOCKED" : "PENDING";
    const statusBg = isPaid ? "ECFDF5" : "FFFBEB";
    const statusColor = isPaid ? "059669" : "D97706";

    // Row cells
    // Col 0: Case #
    setCell(0, curRow, {
      t: "s",
      v: item.case_number || "—",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "6D28D9" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 1: Date
    setCell(1, curRow, {
      t: "s",
      v: formatDate(item.disbursement_date || item.created_at),
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 2: Corporate Company
    setCell(2, curRow, {
      t: "s",
      v: item.corporateCompanyName || item.company_name || "Corporate DSA",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "6D28D9" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 3: DSA Partner
    setCell(3, curRow, {
      t: "s",
      v: item.dsa_name || "Partner DSA",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 4: Customer
    setCell(4, curRow, {
      t: "s",
      v: item.customer_name || "—",
      s: {
        font: { name: "Calibri", sz: 9, color: { rgb: "334155" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 5: Lender Bank
    setCell(5, curRow, {
      t: "s",
      v: item.bank_name || "—",
      s: {
        font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 6: Disbursed Amount
    setCell(6, curRow, {
      t: "n",
      v: disbAmt,
      z: "₹#,##,##0",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 7: Corporate Rate %
    const corpRateStr = item.hasCorporateRate || (item.corporateRate !== null && item.corporateRate !== undefined)
      ? `${item.corporateRate}%`
      : "Pending";
    setCell(7, curRow, {
      t: "s",
      v: corpRateStr,
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "6D28D9" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 8: Corporate Inflow (₹)
    setCell(8, curRow, {
      t: "n",
      v: bankInflowAmt,
      z: "₹#,##,##0",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "6D28D9" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 9: DSA Plan
    setCell(9, curRow, {
      t: "s",
      v: item.isSpot ? "Spot 48h" : "Standard 5d",
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 10: DSA Rate
    setCell(10, curRow, {
      t: "s",
      v: `${(Number(item.dsaCommissionRate || 0)).toFixed(2)}%`,
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 11: DSA Payout
    setCell(11, curRow, {
      t: "n",
      v: dsaPayoutAmt,
      z: "₹#,##,##0",
      s: {
        font: { name: "Calibri", sz: 9, color: { rgb: "D97706" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 12: Net Profit Spread
    setCell(12, curRow, {
      t: "n",
      v: netProfitAmt,
      z: "₹#,##,##0",
      s: {
        font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "059669" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 13: Net Margin %
    const marginPct = disbAmt > 0 && netProfitAmt > 0 ? ((netProfitAmt / disbAmt) * 100).toFixed(2) : "0.00";
    setCell(13, curRow, {
      t: "s",
      v: `+${marginPct}%`,
      s: {
        font: { name: "Calibri", sz: 8.5, bold: true, color: { rgb: "059669" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 14: Two-Legged Settlement Status
    const dsaStatusStr = isPaid ? "DSA Paid" : "DSA Pending";
    const corpStatusStr = item.corporatePaymentStatus === "RECEIVED" ? "Corp Recv" : "Corp Pend";
    const combinedStatus = `${dsaStatusStr} | ${corpStatusStr}`;
    setCell(14, curRow, {
      t: "s",
      v: combinedStatus,
      s: {
        font: { name: "Calibri", sz: 8, bold: true, color: { rgb: statusColor } },
        fill: { fgColor: { rgb: statusBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    rowHeights[curRow] = { hpt: 20 };
    curRow++;
  });

  // 7. TOTAL SUMMARY ROW
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 5 } });
  setCell(0, curRow, {
    t: "s",
    v: "TOTAL PORTFOLIO SUMMARY",
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "right", vertical: "center", indent: 1 },
      border: BORDER_TOTAL,
    },
  });

  setCell(6, curRow, {
    t: "n",
    v: sumDisbursed,
    z: "₹#,##,##0",
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(7, curRow, {
    t: "s",
    v: "—",
    s: {
      font: { name: "Calibri", sz: 9, color: { rgb: "64748B" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(8, curRow, {
    t: "n",
    v: sumBankInflow,
    z: "₹#,##,##0",
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "6D28D9" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(9, curRow, {
    t: "s",
    v: "—",
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      border: BORDER_TOTAL,
    },
  });

  setCell(10, curRow, {
    t: "s",
    v: "—",
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      border: BORDER_TOTAL,
    },
  });

  setCell(11, curRow, {
    t: "n",
    v: sumDsaPayout,
    z: "₹#,##,##0",
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "D97706" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(12, curRow, {
    t: "n",
    v: sumNetProfit,
    z: "₹#,##,##0",
    s: {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "059669" } },
      fill: { fgColor: { rgb: "ECFDF5" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(13, curRow, {
    t: "s",
    v: sumDisbursed > 0 ? `+${((sumNetProfit / sumDisbursed) * 100).toFixed(2)}%` : "+0.00%",
    s: {
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "059669" } },
      fill: { fgColor: { rgb: "ECFDF5" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  setCell(14, curRow, {
    t: "s",
    v: "AUDITED",
    s: {
      font: { name: "Calibri", sz: 8, bold: true, color: { rgb: "475569" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  addEmptyRow(14);

  // 8. FOOTER NOTE
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "Confidential LentFin Corporate Accounting Document. LentFin Net Spread = Corporate Company Inflow (Dynamic %) - DSA Commission Outflow (0.85% / 0.90%). 100% of loans originated via registered partner DSAs.",
    s: {
      font: { name: "Calibri", sz: 8, italic: true, color: { rgb: "94A3B8" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  // Set worksheet bounds & column widths
  ws["!ref"] = lib.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: TOTAL_COLS - 1, r: curRow },
  });
  ws["!merges"] = merges;
  ws["!rows"] = Object.keys(rowHeights).map((r) => rowHeights[r]);

  ws["!cols"] = [
    { wch: 14 }, // Case #
    { wch: 13 }, // Date
    { wch: 18 }, // Corporate Co.
    { wch: 22 }, // DSA Partner
    { wch: 20 }, // Customer
    { wch: 18 }, // Bank
    { wch: 17 }, // Disbursed
    { wch: 14 }, // Corp Rate %
    { wch: 16 }, // Corp Inflow ₹
    { wch: 15 }, // DSA Plan
    { wch: 11 }, // DSA Rate
    { wch: 16 }, // DSA Payout
    { wch: 16 }, // Net Profit
    { wch: 13 }, // Net Margin
    { wch: 22 }, // Status
  ];

  // Create workbook and trigger download
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, "Settlement & Spread");

  const fileName = `LentFin_Admin_Settlement_Ledger_${now.toISOString().slice(0, 10)}.xlsx`;
  lib.writeFile(wb, fileName);
}
