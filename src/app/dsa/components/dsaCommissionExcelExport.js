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
 * Format date to standard readable string (e.g., 23-Sep-2026)
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

// ==========================================
// COLOR PALETTE & BORDER DEFINITIONS
// ==========================================
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

export async function exportCommissionStatementToExcel({
  cases = [],
  profile = {},
  metrics = {},
}) {
  const lib = XLSX.default || XLSX;
  const ws = {};
  const merges = [];
  const rowHeights = {};
  let curRow = 0;

  // Helper to set cell value and style
  const setCell = (colIdx, rowIdx, cellObj) => {
    const cellRef = lib.utils.encode_cell({ c: colIdx, r: rowIdx });
    ws[cellRef] = cellObj;
  };

  // Helper to add empty row
  const addEmptyRow = (h = 10) => {
    rowHeights[curRow] = { hpt: h };
    curRow++;
  };

  const TOTAL_COLS = 11; // Col A to Col K

  // ==========================================
  // 1. TOP BRAND BANNER (LENTFIN PURPLE)
  // ==========================================
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "LENTFIN FINANCIAL SERVICES — COMMISSION & SETTLEMENT STATEMENT",
    s: {
      fill: { fgColor: { rgb: "6D28D9" } }, // Brand Purple 700
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  });
  rowHeights[curRow] = { hpt: 26 };
  curRow++;

  // ==========================================
  // 2. METADATA SUB-BANNER
  // ==========================================
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const partnerName = profile?.name || "DSA Partner";
  const partnerCode = profile?.dsa_code || profile?.id || "DSA";

  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: `Partner: ${partnerName}  •  Code: ${partnerCode}  •  Statement Generated: ${dateStr}`,
    s: {
      fill: { fgColor: { rgb: "F5F3FF" } }, // Purple 50
      font: { name: "Calibri", sz: 9, bold: false, italic: true, color: { rgb: "6B21A8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  rowHeights[curRow] = { hpt: 18 };
  curRow++;

  addEmptyRow(8);

  // ==========================================
  // 3. EXECUTIVE KPI CARDS BLOCK
  // ==========================================
  // Card Headers Row
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 2 } });
  merges.push({ s: { r: curRow, c: 3 }, e: { r: curRow, c: 5 } });
  merges.push({ s: { r: curRow, c: 6 }, e: { r: curRow, c: 8 } });
  merges.push({ s: { r: curRow, c: 9 }, e: { r: curRow, c: 10 } });

  setCell(0, curRow, {
    t: "s",
    v: "UNLOCKED COMMISSION",
    s: {
      fill: { fgColor: { rgb: "ECFDF5" } }, // Emerald 50
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "065F46" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(3, curRow, {
    t: "s",
    v: "IN-REVIEW PIPELINE",
    s: {
      fill: { fgColor: { rgb: "FFFBEB" } }, // Amber 50
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "92400E" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(6, curRow, {
    t: "s",
    v: "SPOT 48H PLAN (0.85%)",
    s: {
      fill: { fgColor: { rgb: "F5F3FF" } }, // Purple 50
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "5B21B6" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(9, curRow, {
    t: "s",
    v: "STANDARD 5-DAYS (0.90%)",
    s: {
      fill: { fgColor: { rgb: "F0F9FF" } }, // Sky 50
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "0369A1" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  // Card Values Row
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 2 } });
  merges.push({ s: { r: curRow, c: 3 }, e: { r: curRow, c: 5 } });
  merges.push({ s: { r: curRow, c: 6 }, e: { r: curRow, c: 8 } });
  merges.push({ s: { r: curRow, c: 9 }, e: { r: curRow, c: 10 } });

  setCell(0, curRow, {
    t: "s",
    v: formatCurrency(metrics.unlockedCommission),
    s: {
      fill: { fgColor: { rgb: "FFFFFF" } },
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "047857" } }, // Emerald 700
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(3, curRow, {
    t: "s",
    v: formatCurrency(metrics.pendingCommission),
    s: {
      fill: { fgColor: { rgb: "FFFFFF" } },
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "B45309" } }, // Amber 700
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(6, curRow, {
    t: "s",
    v: `${metrics.spot?.count || 0} Cases • ${formatCurrency(metrics.spot?.volume || 0)}`,
    s: {
      fill: { fgColor: { rgb: "FFFFFF" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "7C3AED" } }, // Purple 600
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  setCell(9, curRow, {
    t: "s",
    v: `${metrics.standard?.count || 0} Cases • ${formatCurrency(metrics.standard?.volume || 0)}`,
    s: {
      fill: { fgColor: { rgb: "FFFFFF" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0284C7" } }, // Sky 600
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  addEmptyRow(12);

  // ==========================================
  // 4. TRANSACTION TABLE HEADERS
  // ==========================================
  const headers = [
    { label: "#", wch: 5, align: "center" },
    { label: "Voucher ID", wch: 17, align: "center" },
    { label: "Date", wch: 14, align: "center" },
    { label: "Case Number", wch: 18, align: "center" },
    { label: "Customer Name", wch: 22, align: "left" },
    { label: "Bank Partner", wch: 20, align: "left" },
    { label: "Base Volume", wch: 17, align: "right" },
    { label: "Payout Model", wch: 22, align: "center" },
    { label: "Rate (%)", wch: 10, align: "center" },
    { label: "Commission (INR)", wch: 18, align: "right" },
    { label: "Settlement Status", wch: 16, align: "center" },
  ];

  headers.forEach((h, idx) => {
    setCell(idx, curRow, {
      t: "s",
      v: h.label,
      s: {
        fill: { fgColor: { rgb: "4C1D95" } }, // Deep Brand Purple
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: h.align, vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });
  });
  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  // ==========================================
  // 5. TRANSACTION DATA ROWS (DECORATED WITH COLORS)
  // ==========================================
  let totalBaseVolume = 0;
  let totalCommissionEarned = 0;

  cases.forEach((c, idx) => {
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC"; // Subtle zebra striping
    const baseAmount = Number(c.base_amount || 0);
    const commAmount = Number(c.commission_amount || 0);
    totalBaseVolume += baseAmount;
    if (c.isAccepted) {
      totalCommissionEarned += commAmount;
    }

    // Determine status styling
    let statusBg = "FEF3C7"; // Amber 100
    let statusColor = "92400E"; // Amber 800
    let statusLabel = "IN REVIEW";

    if (c.isAccepted) {
      statusBg = "DEF7EC"; // Emerald 100
      statusColor = "03543F"; // Emerald 800
      statusLabel = "UNLOCKED";
    } else if (c.isRejected) {
      statusBg = "FDE8E8"; // Rose 100
      statusColor = "9B1C1C"; // Rose 800
      statusLabel = "REJECTED";
    }

    // Col 0: # (Index)
    setCell(0, curRow, {
      t: "s",
      v: String(idx + 1),
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, color: { rgb: "64748B" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 1: Voucher ID
    setCell(1, curRow, {
      t: "s",
      v: c.voucherId || "—",
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "6D28D9" } }, // Purple
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 2: Date
    setCell(2, curRow, {
      t: "s",
      v: formatDate(c.created_at),
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, color: { rgb: "475569" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 3: Case Number
    setCell(3, curRow, {
      t: "s",
      v: c.case_number || `#${c.id}`,
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "0F172A" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 4: Customer Name
    setCell(4, curRow, {
      t: "s",
      v: c.customer_name || "—",
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 5: Bank Partner
    setCell(5, curRow, {
      t: "s",
      v: c.bank_name || "Direct Partner Bank",
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, color: { rgb: "334155" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 6: Base Volume
    setCell(6, curRow, {
      t: "s",
      v: formatCurrency(baseAmount),
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1E293B" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 7: Payout Model
    setCell(7, curRow, {
      t: "s",
      v: c.isSpot ? "⚡ Spot 48h (0.85%)" : "📅 Standard 5-Days (0.90%)",
      s: {
        fill: { fgColor: { rgb: c.isSpot ? "FAF5FF" : "F0F9FF" } },
        font: {
          name: "Calibri",
          sz: 9,
          bold: true,
          color: { rgb: c.isSpot ? "6B21A8" : "0369A1" },
        },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 8: Rate (%)
    setCell(8, curRow, {
      t: "s",
      v: `${c.commission_rate}%`,
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "475569" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 9: Commission Amount
    setCell(9, curRow, {
      t: "s",
      v: formatCurrency(commAmount),
      s: {
        fill: { fgColor: { rgb: rowBg } },
        font: {
          name: "Calibri",
          sz: 10,
          bold: true,
          color: { rgb: c.isAccepted ? "047857" : "6D28D9" },
        },
        alignment: { horizontal: "right", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 10: Status (Decorated Badge Cell)
    setCell(10, curRow, {
      t: "s",
      v: statusLabel,
      s: {
        fill: { fgColor: { rgb: statusBg } },
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: statusColor } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    rowHeights[curRow] = { hpt: 20 };
    curRow++;
  });

  // ==========================================
  // 6. TOTAL SUMMARY ROW
  // ==========================================
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 5 } });

  setCell(0, curRow, {
    t: "s",
    v: "TOTALS (ALL LISTED CASES):",
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } }, // Slate 100
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  // Total Base Volume in Col 6
  setCell(6, curRow, {
    t: "s",
    v: formatCurrency(totalBaseVolume),
    s: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  // Col 7 & 8 empty with total styling
  setCell(7, curRow, {
    t: "s",
    v: "",
    s: { fill: { fgColor: { rgb: "F1F5F9" } }, border: BORDER_TOTAL },
  });
  setCell(8, curRow, {
    t: "s",
    v: "",
    s: { fill: { fgColor: { rgb: "F1F5F9" } }, border: BORDER_TOTAL },
  });

  // Total Unlocked Commission in Col 9
  setCell(9, curRow, {
    t: "s",
    v: formatCurrency(metrics.unlockedCommission || totalCommissionEarned),
    s: {
      fill: { fgColor: { rgb: "ECFDF5" } }, // Emerald 50
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "047857" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  // Col 10 Status Summary
  setCell(10, curRow, {
    t: "s",
    v: "NET ACCRUED",
    s: {
      fill: { fgColor: { rgb: "ECFDF5" } },
      font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "065F46" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_TOTAL,
    },
  });

  rowHeights[curRow] = { hpt: 22 };
  curRow++;

  addEmptyRow(12);

  // Footer Disclaimer
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: TOTAL_COLS - 1 } });
  setCell(0, curRow, {
    t: "s",
    v: "Confidential settlement dossier prepared for authorized channel partners. All payments processed via RTGS/NEFT to registered account.",
    s: {
      fill: { fgColor: { rgb: "F8FAFC" } },
      font: { name: "Calibri", sz: 8, italic: true, color: { rgb: "94A3B8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_SUBTLE,
    },
  });
  rowHeights[curRow] = { hpt: 16 };
  curRow++;

  // Apply range & column widths
  ws["!ref"] = lib.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: curRow - 1, c: TOTAL_COLS - 1 },
  });
  ws["!merges"] = merges;
  ws["!cols"] = headers.map((h) => ({ wch: h.wch }));
  ws["!rows"] = rowHeights;

  // Append sheet and download
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, "Commission Ledger");

  const safePartner = String(partnerName).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `LentFin_Commission_Statement_${safePartner}_${now.toISOString().slice(0, 10)}.xlsx`;

  lib.writeFile(wb, fileName);
}
