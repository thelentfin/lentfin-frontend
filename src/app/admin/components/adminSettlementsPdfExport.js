import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Format currency in Indian standard format (Rs. xx,xx,xxx)
 * Using "Rs." prevents font encoding glitches in standard PDF fonts.
 */
const formatCurrency = (val) => {
  if (val === undefined || val === null || val === "" || isNaN(val)) {
    return "Rs. 0";
  }
  const num = Number(val);
  const hasDecimals = num % 1 !== 0;
  return `Rs. ${num.toLocaleString("en-IN", {
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

/**
 * Export Admin Settlements & Earnings Ledger to a professional PDF statement
 */
export async function exportAdminSettlementsToPdf({
  cases = [],
  metrics = {},
  reportTitle = "CORPORATE SETTLEMENT & COMMISSION AUDIT STATEMENT",
  statementType = "Audited Statement",
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // 1. BRAND HEADER BANNER (LentFin Purple: #6D28D9)
  doc.setFillColor(109, 40, 217); // #6D28D9
  doc.rect(0, 0, pageWidth, 22, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LENTFIN FINANCIAL SERVICES", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(233, 213, 255); // light purple
  doc.text(reportTitle, 14, 17);

  // Statement Meta on Right
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${dateFormatted} at ${timeFormatted}`, pageWidth - 14, 10, { align: "right" });
  doc.text(`Type: ${statementType} | Total Cases: ${cases.length}`, pageWidth - 14, 16, { align: "right" });

  // 2. FINANCIAL METRICS HIGHLIGHT BOXES (Light clean theme)
  const totalVolume = Number(metrics.totalVolume || 0);
  const totalBankInflow = Number(metrics.totalBankInflow || metrics.corporateInflow || 0);
  const totalDsaOutflow = Number(metrics.totalDsaOutflow || metrics.dsaOutflow || 0);
  const totalAdminProfit = Number(metrics.totalAdminProfit || metrics.netProfit || 0);
  const avgMargin = Number(metrics.averageMargin || metrics.avgNetSpread || (totalVolume > 0 ? (totalAdminProfit / totalVolume) * 100 : 0));

  const startY = 27;
  const cardWidth = (pageWidth - 28 - 12) / 5; // 5 cards
  const cardHeight = 16;

  const kpis = [
    { label: "AUDITED CASES", val: `${cases.length} Cases`, sub: "Matching Filter Criteria", color: [100, 116, 139] },
    { label: "TOTAL VOLUME", val: formatCurrency(totalVolume), sub: "Total Disbursed Principal", color: [15, 23, 42] },
    { label: "BANK INFLOW (REC'D)", val: formatCurrency(totalBankInflow), sub: "Corporate Inflow Recovery", color: [16, 185, 129] },
    { label: "DSA PAYOUT (COMM.)", val: formatCurrency(totalDsaOutflow), sub: "Partner Commission Share", color: [245, 158, 11] },
    { label: "NET PROFIT SPREAD", val: formatCurrency(totalAdminProfit), sub: `Avg Margin: ${avgMargin.toFixed(2)}%`, color: [109, 40, 217] },
  ];

  kpis.forEach((k, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    // Background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, "FD");

    // Top accent border line for net profit
    if (idx === 4) {
      doc.setFillColor(109, 40, 217);
      doc.rect(x, startY, cardWidth, 1.2, "F");
    }

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x + 3.5, startY + 4.5);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, x + 3.5, startY + 9.5);

    // Subtext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(k.sub, x + 3.5, startY + 13.5);
  });

  // Average Rates for Totals
  const avgInflowRate = totalVolume > 0 ? (totalBankInflow / totalVolume) * 100 : 0;
  const avgDsaRate = totalVolume > 0 ? (totalDsaOutflow / totalVolume) * 100 : 0;

  // 3. CASE RECORDS TABLE
  const tableData = cases.map((c, i) => {
    const caseNum = c.case_number || `CASE-${String(c.id || i + 1).padStart(4, "0")}`;
    const date = formatDate(c.disbursement_date || c.created_at);
    const dsa = c.dsa_name || "—";
    const subDsa = c.sub_dsa?.name || c.sub_dsa_name || "";
    const customer = c.customer_name || "—";
    const bank = c.bank_name || "—";
    const product = c.product_name || "—";
    const disbursed = formatCurrency(c.baseAmount || 0);

    // 1. Corporate Bank Inflow (Amount & Rate %)
    const corpRateNum = c.corporateRate !== null && c.corporateRate !== undefined ? Number(c.corporateRate) : null;
    const corpRateStr = corpRateNum !== null ? `${corpRateNum.toFixed(2)}%` : "—";
    const corpInflow = formatCurrency(c.corporateInflowAmount || 0);

    // 2. DSA Partner Payout (Amount & Rate %)
    const dsaRateNum = Number(c.dsaCommissionRate || 0);
    const dsaRateStr = c.dsaCommissionRate !== null && c.dsaCommissionRate !== undefined ? `${dsaRateNum.toFixed(2)}%` : "0.00%";
    const dsaPayout = formatCurrency(c.dsaCommissionAmount || 0);

    // 3. LentFin Net Profit Spread (Amount & Net Margin %)
    const netProfit = formatCurrency(c.netProfitSpread || 0);
    let marginPct = "0.00%";
    if (corpRateNum !== null) {
      marginPct = `+${Math.max(0, corpRateNum - dsaRateNum).toFixed(2)}%`;
    } else if (c.baseAmount > 0 && c.netProfitSpread) {
      marginPct = `+${((Number(c.netProfitSpread) / Number(c.baseAmount)) * 100).toFixed(2)}%`;
    }

    return [
      i + 1,
      caseNum,
      date,
      dsa + (subDsa ? `\n(Sub: ${subDsa})` : ""),
      customer,
      bank,
      product,
      disbursed,
      `${corpInflow}\n(${corpRateStr})`,
      `${dsaPayout}\n(${dsaRateStr})`,
      `${netProfit}\n(${marginPct})`,
    ];
  });

  // Summary Row to append at end of table (11 columns)
  const summaryRow = [
    "",
    "TOTALS",
    "",
    "",
    "",
    "",
    `${cases.length} Cases`,
    formatCurrency(totalVolume),
    `${formatCurrency(totalBankInflow)}\n(${avgInflowRate.toFixed(2)}%)`,
    `${formatCurrency(totalDsaOutflow)}\n(${avgDsaRate.toFixed(2)}%)`,
    `${formatCurrency(totalAdminProfit)}\n(+${avgMargin.toFixed(2)}%)`,
  ];

  autoTable(doc, {
    startY: startY + cardHeight + 4,
    head: [[
      "#",
      "Case #",
      "Disb. Date",
      "DSA Partner",
      "Customer",
      "Bank",
      "Product",
      "Disbursed",
      "Corp. Inflow",
      "DSA Payout",
      "Net Profit",
    ]],
    body: [...tableData, summaryRow],
    theme: "grid",
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      overflow: "linebreak",
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },   // #
      1: { cellWidth: 22, fontStyle: "bold" }, // Case #
      2: { cellWidth: 20 },                    // Date
      3: { cellWidth: 35 },                    // DSA Partner
      4: { cellWidth: 30 },                    // Customer
      5: { cellWidth: 28 },                    // Bank
      6: { cellWidth: 26 },                    // Product
      7: { cellWidth: 28, halign: "right", fontStyle: "bold" }, // Disbursed
      8: { cellWidth: 24, halign: "right" },   // Corp Inflow (Amount & %)
      9: { cellWidth: 24, halign: "right" },   // DSA Payout (Amount & %)
      10: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: [109, 40, 217] }, // Net Profit (Amount & Margin %)
    },
    didParseCell: (data) => {
      // Style the Summary row
      if (data.row.index === tableData.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [243, 232, 255]; // light purple #F3E8FF
        data.cell.styles.textColor = [88, 28, 135]; // dark purple #581C87
        data.cell.styles.lineWidth = 0.3;
        data.cell.styles.lineColor = [192, 132, 252];
      }
    },
    margin: { left: 14, right: 14, bottom: 12 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Left footer
      doc.text(
        "CONFIDENTIAL — LentFin Financial Services Corporate Settlement & Spread Audit Statement",
        14,
        pageHeight - 5
      );

      // Right footer
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth - 14,
        pageHeight - 5,
        { align: "right" }
      );
    },
  });

  // Save/Download the PDF
  const sanitizedFileName = `LentFin_Settlement_Audit_Statement_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(sanitizedFileName);
}
