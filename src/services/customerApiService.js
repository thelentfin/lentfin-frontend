import { getFileFromVal } from "@/schemas/customerRegistrationSchema";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

// Fallback bank ID mapping for standard bank options
const BANK_NAME_TO_ID_MAP = {
  "icici bank": 1,
  "hdfc bank": 2,
  "kotak mahindra bank": 3,
  "yes bank": 4,
  "axis bank": 5,
  sbi: 6,
  "state bank of india": 6,
  other: 7,
};

export const customerApiService = {
  /**
   * Fetch bank options from backend if available
   */
  async fetchBanks() {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/bank/list`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.status && Array.isArray(data.data)) {
        return data.data;
      }
      return null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Resolve selected bank to numeric bank_id
   */
  resolveBankId(bankValue, fetchedBanks = []) {
    if (!bankValue) return 1;

    // If bankValue is already a number or numeric string
    if (!isNaN(Number(bankValue)) && Number(bankValue) > 0) {
      return Number(bankValue);
    }

    // Try finding in dynamically fetched banks
    if (Array.isArray(fetchedBanks) && fetchedBanks.length > 0) {
      const match = fetchedBanks.find(
        (b) =>
          b.bank_name &&
          b.bank_name.toLowerCase() === String(bankValue).toLowerCase()
      );
      if (match && match.id) return match.id;
    }

    // Fallback to static mapping
    const normalized = String(bankValue).toLowerCase().trim();
    return BANK_NAME_TO_ID_MAP[normalized] || 1;
  },

  /**
   * Submit full 3-step customer registration via 4 sequential API requests
   */
  async submitFullCustomerRegistration(formData, fetchedBanks = []) {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    const headersWithAuth = {
      Authorization: `Bearer ${token}`,
    };

    let caseId = null;

    // =========================================================================
    // STEP 1 — POST /api/loan-case/add (multipart/form-data)
    // =========================================================================
    try {
      const step1Body = new FormData();
      const bankId = this.resolveBankId(formData.bank, fetchedBanks);
      const sanctionLetterFile = getFileFromVal(formData.sanctionLetter);

      step1Body.append("bank_id", String(bankId));
      step1Body.append("customer_name", (formData.customerName || "").trim());
      step1Body.append("mobile_number", (formData.mobile || "").trim());
      step1Body.append("application_number", (formData.applicationNo || "").trim());
      step1Body.append("loan_account_number", (formData.loanAccountNo || "").trim());
      step1Body.append("sanction_amount", String(formData.sanctionAmount).replace(/,/g, "").trim());
      if (formData.remarks) {
        step1Body.append("remarks", formData.remarks.trim());
      }

      if (sanctionLetterFile) {
        step1Body.append("sanction_letter", sanctionLetterFile);
      }

      const resStep1 = await fetch(`${API_BASE_URL}/loan-case/add`, {
        method: "POST",
        headers: headersWithAuth,
        body: step1Body, // Do NOT set Content-Type manually
      });

      const dataStep1 = await resStep1.json().catch(() => ({}));

      if (!resStep1.ok || !dataStep1.status) {
        const msg = dataStep1?.message || "Step 1 (Loan Case) creation failed.";
        const details = dataStep1?.errors
          ? dataStep1.errors.map((e) => e.message).join(", ")
          : "";
        throw new Error(`Step 1 Failed: ${msg} ${details}`.trim());
      }

      caseId = dataStep1?.data?.case?.id || dataStep1?.data?.id;

      if (!caseId) {
        throw new Error("Step 1 Succeeded but no case_id was returned from server.");
      }
    } catch (err) {
      throw err;
    }

    // =========================================================================
    // STEP 2 — POST /api/loan-disbursement/add (multipart/form-data)
    // =========================================================================
    try {
      const step2Body = new FormData();
      const pddFile = getFileFromVal(formData.pddDocument);
      const isPddCleared = String(formData.pddCleared).toUpperCase() === "YES" ? "YES" : "NO";
      const disbursementType = String(formData.disbursementType).toUpperCase() === "FULL" ? "FULL" : "PART";

      const rawDisbursementAmount =
        disbursementType === "FULL"
          ? formData.sanctionAmount
          : formData.disbursementAmount;

      const finalDisbursementAmount = String(rawDisbursementAmount || "0")
        .replace(/,/g, "")
        .trim();

      step2Body.append("case_id", String(caseId));
      step2Body.append("disbursement_type", disbursementType);
      step2Body.append("disbursement_amount", finalDisbursementAmount);
      step2Body.append("disbursement_date", formData.disbursementDate || "");
      step2Body.append("rate", String(formData.rate || "").trim());
      step2Body.append("pf", String(formData.pf || "0").trim());
      step2Body.append("tenure", String(formData.tenure || "").trim());
      step2Body.append("insurance_amount", String(formData.insuranceAmount || "0").trim());
      step2Body.append("cheque_handover_date", formData.chequeHandoverDate || "");
      step2Body.append("pdd_cleared", isPddCleared);

      if (isPddCleared === "YES" && pddFile) {
        step2Body.append("pdd_document", pddFile);
      }

      const resStep2 = await fetch(`${API_BASE_URL}/loan-disbursement/add`, {
        method: "POST",
        headers: headersWithAuth,
        body: step2Body,
      });

      const dataStep2 = await resStep2.json().catch(() => ({}));

      if (!resStep2.ok || !dataStep2.status) {
        const msg = dataStep2?.message || "Step 2 (Disbursement Details) creation failed.";
        const details = dataStep2?.errors
          ? dataStep2.errors.map((e) => e.message).join(", ")
          : "";
        throw new Error(`Step 2 Failed: ${msg} ${details}`.trim());
      }
    } catch (err) {
      throw err;
    }

    // =========================================================================
    // STEP 3 — POST /api/loan-case-sm-asm/add (application/json)
    // =========================================================================
    try {
      const smAsmPayload = {
        case_id: Number(caseId),
        sm_name: (formData.smName || "").trim(),
        sm_mobile_number: (formData.smMobile || "").trim(),
        sm_email: (formData.smEmail || "").trim(),
        asm_name: (formData.asmName || "").trim(),
        asm_mobile_number: (formData.asmMobile || "").trim(),
        asm_email: (formData.asmEmail || "").trim(),
      };

      const resStep3SmAsm = await fetch(`${API_BASE_URL}/loan-case-sm-asm/add`, {
        method: "POST",
        headers: {
          ...headersWithAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smAsmPayload),
      });

      const dataStep3SmAsm = await resStep3SmAsm.json().catch(() => ({}));

      if (!resStep3SmAsm.ok || !dataStep3SmAsm.status) {
        const msg = dataStep3SmAsm?.message || "Step 3 (SM/ASM Details) creation failed.";
        throw new Error(`Step 3 (SM/ASM) Failed: ${msg}`);
      }
    } catch (err) {
      throw err;
    }

    // =========================================================================
    // STEP 3 — POST /api/loan-payment/add (application/json)
    // =========================================================================
    try {
      const paymentPayload = {
        case_id: Number(caseId),
        payment_option: formData.paymentType || "SPOT_48_HOURS",
      };

      const resPayment = await fetch(`${API_BASE_URL}/loan-payment/add`, {
        method: "POST",
        headers: {
          ...headersWithAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });

      const dataPayment = await resPayment.json().catch(() => ({}));

      if (!resPayment.ok || !dataPayment.status) {
        const msg = dataPayment?.message || "Step 3 (Payment Details) creation failed.";
        throw new Error(`Step 3 (Payment) Failed: ${msg}`);
      }
    } catch (err) {
      throw err;
    }

    return { success: true, caseId };
  },

  /**
   * Fetch customer loan cases from backend for Customer Management view
   */
  async fetchCustomerCases() {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const resCases = await fetch(`${API_BASE_URL}/loan-case/list`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resCases.ok) return [];

      const dataCases = await resCases.json();
      if (!dataCases.status || !Array.isArray(dataCases.data)) return [];

      // Fetch supplementary disbursement & SM/ASM info if available
      let disbursementsMap = {};
      let smAsmMap = {};
      let paymentsMap = {};

      try {
        const resDisb = await fetch(`${API_BASE_URL}/loan-disbursement/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataDisb = await resDisb.json().catch(() => ({}));
        if (dataDisb.status && Array.isArray(dataDisb.data)) {
          dataDisb.data.forEach((item) => {
            const disb = item.disbursement || item;
            if (disb.case_id) {
              disbursementsMap[disb.case_id] = {
                ...disb,
                document: item.document,
              };
            }
          });
        }
      } catch (e) {}

      try {
        const resSmAsm = await fetch(`${API_BASE_URL}/loan-case-sm-asm/list/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataSmAsm = await resSmAsm.json().catch(() => ({}));
        if (dataSmAsm.status && Array.isArray(dataSmAsm.data)) {
          dataSmAsm.data.forEach((row) => {
            if (row.case_id) {
              if (!smAsmMap[row.case_id]) smAsmMap[row.case_id] = {};
              if (row.role === "SM") smAsmMap[row.case_id].sm = row;
              if (row.role === "ASM") smAsmMap[row.case_id].asm = row;
            }
          });
        }
      } catch (e) {}

      try {
        const resPay = await fetch(`${API_BASE_URL}/loan-payment/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataPay = await resPay.json().catch(() => ({}));
        if (dataPay.status && Array.isArray(dataPay.data)) {
          dataPay.data.forEach((item) => {
            const p = item.payment || item;
            const cid = item.loan_case?.case_id || p.case_id;
            if (cid) paymentsMap[cid] = p;
          });
        }
      } catch (e) {}

      return dataCases.data.map((c) => {
        const disb = disbursementsMap[c.id];
        const smInfo = smAsmMap[c.id]?.sm;
        const asmInfo = smAsmMap[c.id]?.asm;
        const payInfo = paymentsMap[c.id];

        // Locate sanction letter document
        const sanctionDoc = Array.isArray(c.documents)
          ? c.documents.find((d) =>
              (d.document_type || "").toLowerCase().includes("sanction")
            ) || c.documents[0]
          : null;

        // Locate PDD document
        const pddDoc =
          disb?.document ||
          (Array.isArray(c.documents)
            ? c.documents.find((d) =>
                (d.document_type || "").toLowerCase().includes("pdd")
              )
            : null);

        return {
          id: c.id,
          caseNumber: c.case_number,
          customerName: c.customer_name,
          name: c.customer_name,
          mobile: c.mobile_number,
          applicationNo: c.application_number || c.case_number,
          loanAccountNo: c.loan_account_number || "—",
          bank: c.bank_name || "—",
          sanctionAmount: c.sanction_amount
            ? `₹${Number(c.sanction_amount).toLocaleString("en-IN")}`
            : "—",
          disbursementAmount: disb?.disbursement_amount
            ? `₹${Number(disb.disbursement_amount).toLocaleString("en-IN")}`
            : "—",
          status: c.status || "Approved",
          // Detailed view properties
          disbursementType: disb?.disbursement_type || "—",
          disbursementDate: disb?.disbursement_date || "—",
          rate: disb?.rate ? `${disb.rate}%` : "—",
          pf: disb?.pf ? `₹${disb.pf}` : "—",
          tenure: disb?.tenure ? `${disb.tenure} Months` : "—",
          insuranceAmount: disb?.insurance_amount ? `₹${disb.insurance_amount}` : "—",
          chequeHandoverDate: disb?.cheque_handover_date || "—",
          pddCleared: disb?.pdd_cleared === "YES",
          smName: smInfo?.name || "—",
          smNumber: smInfo?.mobile_number || "—",
          smEmail: smInfo?.email || "—",
          asmName: asmInfo?.name || "—",
          asmNumber: asmInfo?.mobile_number || "—",
          asmEmail: asmInfo?.email || "—",
          paymentType: payInfo?.payment_option || "—",

          // Document URLs & original names from Cloudinary backend response
          sanctionLetterUrl: sanctionDoc?.secure_url || sanctionDoc?.cloudinary_url || null,
          sanctionLetterName: sanctionDoc?.original_name || "sanction_letter.pdf",
          pddDocumentUrl: pddDoc?.secure_url || pddDoc?.cloudinary_url || null,
          pddDocumentName: pddDoc?.original_name || "pdd_document.pdf",
        };
      });
    } catch (err) {
      console.error("FETCH CUSTOMER CASES ERROR:", err);
      return [];
    }
  },
};
