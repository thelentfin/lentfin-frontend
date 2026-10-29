import XLSX from "xlsx-js-style";

/**
 * Format timestamp to Indian Standard Time formatted string (e.g., 29-Oct-2026, 01:15 PM)
 */
const formatDateTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return String(timestamp);
  }
};

// Subtle border style
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

export async function exportAuditLogsToExcel({ logs = [], filterModule = "ALL", filterRole = "ALL" }) {
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

  const TOTAL_COLS = 11; // Col A to Col K

  // 1. TOP BRAND BANNER (LentFin Brand Purple #6D28D9)
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "LENTFIN FINANCIAL SERVICES — SYSTEM AUDIT & ACTIVITY REGISTER",
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
    hour12: true,
  });

  const scopeText = `Scope: Module: [${filterModule}] • Role: [${filterRole}]`;

  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: `Enterprise Security Audit Trail  |  Generated on: ${dateFormatted} at ${timeFormatted}  |  ${scopeText}  |  Total Events: ${logs.length}`,
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

  // 3. EXECUTIVE KPI CARDS (4 Cards Grid)
  const authEventsCount = logs.filter(
    (l) => l.module === "Authentication" || (l.actionType && (l.actionType.includes("LOGIN") || l.actionType.includes("LOGOUT")))
  ).length;

  const dataMutationCount = logs.filter(
    (l) => l.changes && (l.changes.previousValue || l.changes.newValue)
  ).length;

  const uniqueActors = new Set(logs.map((l) => l.actorName).filter(Boolean)).size;

  const kpis = [
    {
      title: "TOTAL AUDIT EVENTS",
      val: `${logs.length} Records`,
      sub: "Verified platform activity trail",
      bg: "F8FAFC",
      titleCol: "475569",
      valCol: "0F172A",
    },
    {
      title: "AUTHENTICATION SESSIONS",
      val: `${authEventsCount} Actions`,
      sub: "Login & manual logout events",
      bg: "F5F3FF",
      titleCol: "6D28D9",
      valCol: "6D28D9",
    },
    {
      title: "FIELD MUTATIONS",
      val: `${dataMutationCount} Changes`,
      sub: "Records with old/new values",
      bg: "FFFBEB",
      titleCol: "B45309",
      valCol: "D97706",
    },
    {
      title: "UNIQUE OPERATORS",
      val: `${uniqueActors} Identities`,
      sub: "Distinct administrative actors",
      bg: "ECFDF5",
      titleCol: "047857",
      valCol: "059669",
    },
  ];

  // Merge columns for 4 KPI cards: [0..1], [2..4], [5..7], [8..10]
  const cardSpans = [
    { s: 0, e: 1 },
    { s: 2, e: 4 },
    { s: 5, e: 7 },
    { s: 8, e: 10 },
  ];

  // Titles row
  cardSpans.forEach((span, idx) => {
    merges.push({ s: { r: curRow, c: span.s }, e: { r: curRow, c: span.e } });
    setCell(span.s, curRow, {
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
  cardSpans.forEach((span, idx) => {
    merges.push({ s: { r: curRow, c: span.s }, e: { r: curRow, c: span.e } });
    setCell(span.s, curRow, {
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
  cardSpans.forEach((span, idx) => {
    merges.push({ s: { r: curRow, c: span.s }, e: { r: curRow, c: span.e } });
    setCell(span.s, curRow, {
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
    v: "ACTIVITY CHRONICLE & COMPLIANCE LOG (IST TIMELINE)",
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
    { title: "LOG ID", align: "center" },
    { title: "DATE & TIME (IST)", align: "center" },
    { title: "OPERATOR", align: "left" },
    { title: "ROLE", align: "center" },
    { title: "MODULE", align: "left" },
    { title: "ACTION TYPE", align: "left" },
    { title: "TARGET / ENTITY", align: "left" },
    { title: "ACTIVITY SUMMARY & DETAILS", align: "left" },
    { title: "FIELD CHANGED", align: "center" },
    { title: "CHANGE AUDIT (OLD ➔ NEW)", align: "left" },
    { title: "IP ADDRESS", align: "center" },
  ];

  headers.forEach((h, colIdx) => {
    setCell(colIdx, curRow, {
      t: "s",
      v: h.title,
      s: {
        fill: { fgColor: { rgb: "6D28D9" } }, // Brand Purple
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: h.align, vertical: "center", wrapText: true },
        border: BORDER_SUBTLE,
      },
    });
  });
  rowHeights[curRow] = { hpt: 24 };
  curRow++;

  // 6. TABLE DATA ROWS
  logs.forEach((log, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "FBFBFE";

    // Format changes representation
    let changeText = "—";
    if (log.changes && (log.changes.previousValue || log.changes.newValue)) {
      const prev = log.changes.previousValue || "None";
      const next = log.changes.newValue || "None";
      changeText = `${prev}  ➔  ${next}`;
    } else if (log.details && log.details !== log.summary) {
      changeText = log.details;
    }

    // Dynamic Action Type color styling
    let actionColor = "0F172A";
    const actUpper = String(log.actionType || "").toUpperCase();
    if (actUpper.includes("LOGIN") || actUpper.includes("LOGOUT") || actUpper.includes("AUTH")) {
      actionColor = "6D28D9"; // Purple
    } else if (actUpper.includes("CREATE") || actUpper.includes("APPROVED") || actUpper.includes("DISBURSED") || actUpper.includes("INFLOW")) {
      actionColor = "059669"; // Green
    } else if (actUpper.includes("STATUS") || actUpper.includes("UPDATE") || actUpper.includes("CHANGE")) {
      actionColor = "D97706"; // Amber
    } else if (actUpper.includes("DELETE") || actUpper.includes("REJECT") || actUpper.includes("INACTIVE")) {
      actionColor = "DC2626"; // Red
    }

    // Col 0: Log ID
    setCell(0, curRow, {
      t: "s",
      v: String(log.id || `LOG-${index + 1}`),
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 1: Date & Time (IST)
    setCell(1, curRow, {
      t: "s",
      v: formatDateTime(log.timestamp),
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "334155" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 2: Operator
    setCell(2, curRow, {
      t: "s",
      v: log.actorName || "System",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 3: Role
    setCell(3, curRow, {
      t: "s",
      v: log.actorRole || "—",
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 4: Module
    setCell(4, curRow, {
      t: "s",
      v: log.module || "System",
      s: {
        font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "6D28D9" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 5: Action Type
    setCell(5, curRow, {
      t: "s",
      v: log.actionType || "ACTION",
      s: {
        font: { name: "Calibri", sz: 8.5, bold: true, color: { rgb: actionColor } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 6: Target / Entity
    setCell(6, curRow, {
      t: "s",
      v: log.entity || log.entityId || "—",
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 7: Activity Summary & Details
    const fullSummary = log.details && log.details !== log.summary
      ? `${log.summary}\n${log.details}`
      : log.summary || "—";

    setCell(7, curRow, {
      t: "s",
      v: fullSummary,
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "334155" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 8: Field Changed
    setCell(8, curRow, {
      t: "s",
      v: log.changes?.field || "—",
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    // Col 9: Change Audit (Old -> New)
    setCell(9, curRow, {
      t: "s",
      v: changeText,
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
        border: BORDER_SUBTLE,
      },
    });

    // Col 10: IP Address
    setCell(10, curRow, {
      t: "s",
      v: log.ipAddress || "—",
      s: {
        font: { name: "Calibri", sz: 8.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: rowBg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_SUBTLE,
      },
    });

    rowHeights[curRow] = { hpt: fullSummary.length > 80 ? 32 : 20 };
    curRow++;
  });

  // 7. TOTAL SUMMARY FOOTER ROW
  merges.push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 4 } });
  setCell(0, curRow, {
    t: "s",
    v: "TOTAL AUDIT TRAIL SUMMARY",
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "right", vertical: "center", indent: 1 },
      border: BORDER_TOTAL,
    },
  });

  setCell(5, curRow, {
    t: "s",
    v: `${logs.length} Events Logged`,
    s: {
      font: { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "6D28D9" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
      border: BORDER_TOTAL,
    },
  });

  for (let c = 6; c < TOTAL_COLS; c++) {
    setCell(c, curRow, {
      t: "s",
      v: "—",
      s: {
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_TOTAL,
      },
    });
  }
  rowHeights[curRow] = { hpt: 20 };
  curRow++;

  addEmptyRow(10);

  // 8. LEGAL & COMPLIANCE FOOTER
  merges.push({
    s: { r: curRow, c: 0 },
    e: { r: curRow, c: TOTAL_COLS - 1 },
  });
  setCell(0, curRow, {
    t: "s",
    v: "Confidential LentFin Corporate Audit Document. All records are cryptographically timestamped and immutable. Unauthorized distribution or tampering is strictly prohibited.",
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
    { wch: 14 }, // Log ID
    { wch: 21 }, // Timestamp IST
    { wch: 18 }, // Operator
    { wch: 14 }, // Role
    { wch: 22 }, // Module
    { wch: 24 }, // Action Type
    { wch: 22 }, // Target / Entity
    { wch: 48 }, // Activity Summary & Details
    { wch: 16 }, // Field Changed
    { wch: 34 }, // Change Audit
    { wch: 18 }, // IP Address
  ];

  // Create workbook and trigger download
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, "Audit Trail");

  const fileName = `LentFin_Audit_Logs_${now.toISOString().slice(0, 10)}.xlsx`;
  lib.writeFile(wb, fileName);
}

