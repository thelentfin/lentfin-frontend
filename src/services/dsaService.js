/**
 * DSA Registration Service Layer
 * Talks to POST /api/signup (multipart/form-data)
 *
 * NOTE: dsaRoutes is mounted in app.js as: app.use("/api", dsaRoutes)
 * so router.post("/signup", ...) resolves to /api/signup — NOT /api/dsa/signup.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const dsaService = {
  async registerDSA(formData) {
    const body = new FormData();

    // ── TEXT FIELDS ──
    body.append("company_id", formData.companyName);
    body.append("location_id", formData.location);

    // company_name / location are REQUIRED text fields on the backend
    // (validations/dsaValidation.js). They are captured separately in
    // CompanyLocationStep.jsx (companyNameText / locationText) because
    // the dropdown "value" is the numeric id, not the display label.
    body.append("company_name", formData.companyNameText || "");
    body.append("location", formData.locationText || "");

    body.append("name", formData.fullName);
    body.append("email", formData.email);
    body.append("mobile", formData.mobile);
    body.append("pan_number", formData.panNumber || "");
    body.append("aadhaar_number", formData.aadhaarNumber || "");
    body.append("gst_number", formData.gstNumber || "");
    body.append("constitution_type", formData.constitutionType || "");
    body.append("account_holder_name", formData.bankAccountName || "");
    body.append("account_number", formData.accountNumber || "");
    body.append("ifsc_code", formData.ifscCode || "");
    body.append("bank_name", formData.bankName || "");
    body.append("branch_name", formData.branchName || "");

    // ── ALWAYS-REQUIRED FILES (Step 1) ──
    if (formData.panCardDoc) body.append("card_file", formData.panCardDoc);
    if (formData.aadhaarCardDoc)
      body.append("aadhaar_file", formData.aadhaarCardDoc);
    if (formData.photo) body.append("passport_file", formData.photo);

    // ── GST-CONDITIONAL FILES (Step 3) ──
    if (formData.msmeCertificate)
      body.append("msme_file", formData.msmeCertificate);
    if (formData.gstCertificate)
      body.append("gst_file", formData.gstCertificate);

    // ── CONSTITUTION-CONDITIONAL FILES (Step 4) ──
    if (formData.constitutionType === "Partnership") {
      if (formData.partnershipDeed)
        body.append("partnership_deed_file", formData.partnershipDeed);
      if (formData.firmPanDoc) body.append("pan_file", formData.firmPanDoc);
    }

    // ── SEND REQUEST ──
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        body, // Do NOT set Content-Type manually — browser sets multipart boundary
      });
    } catch (networkErr) {
      throw new Error("Unable to reach server. Please check your connection.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(
        data?.message || "Registration failed. Please try again.",
      );
      err.status = response.status;
      err.details = data;
      throw err;
    }

    return data;
  },

  /**
   * IFSC lookup via backend proxy route with direct fallback
   */
  async lookupIFSC(ifscCode) {
    if (!ifscCode) return { success: false, message: "IFSC code is required" };
    const cleanCode = ifscCode.trim().toUpperCase();

    // 1. Try Backend Proxy first
    try {
      const response = await fetch(
        `${API_BASE_URL}/dsa/ifsc/${encodeURIComponent(cleanCode)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.data) {
          return data;
        }
      }
    } catch (backendErr) {
      console.warn("Backend IFSC proxy error, falling back to direct Razorpay API:", backendErr);
    }

    // 2. Robust fallback directly to Razorpay public IFSC API
    try {
      const directRes = await fetch(
        `https://ifsc.razorpay.com/${encodeURIComponent(cleanCode)}`
      );
      if (directRes.ok) {
        const d = await directRes.json();

        // Intelligent branch name resolution & formatting
        let rawBranch = (d.BRANCH || "").trim();
        const rawCentre = (d.CENTRE || "").trim();
        const rawDist = (d.DISTRICT || "").trim();
        const rawCity = (d.CITY || "").trim();

        // If branch is literally "BRANCH", "MAIN", "MAIN BRANCH" or empty, fallback to CENTRE or DISTRICT
        if (!rawBranch || /^branch$/i.test(rawBranch) || /^main$/i.test(rawBranch) || /^main branch$/i.test(rawBranch)) {
          rawBranch = rawCentre || rawDist || rawCity || "Main Branch";
        }

        // Fix merged words without spaces (e.g. ICICI "MUMBAINARIMAN POINT" -> "Mumbai - Nariman Point")
        if (rawCentre && rawBranch.toUpperCase().startsWith(rawCentre.toUpperCase())) {
          const charAfter = rawBranch[rawCentre.length];
          if (charAfter && /[A-Za-z]/.test(charAfter)) {
            rawBranch = rawCentre + " - " + rawBranch.slice(rawCentre.length).trim();
          }
        }

        let resolvedBranch = rawBranch.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();

        if (resolvedBranch === resolvedBranch.toUpperCase() && resolvedBranch.length > 2) {
          resolvedBranch = resolvedBranch
            .toLowerCase()
            .split(" ")
            .map((word) => {
              if (!word) return "";
              if (["and", "of", "the", "in", "at"].includes(word)) return word;
              return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
        }

        return {
          success: true,
          data: {
            bank: d.BANK || "",
            branch: resolvedBranch || d.BRANCH || "",
            city: d.CITY || "",
            state: d.STATE || "",
            address: d.ADDRESS || "",
            ifsc: d.IFSC || cleanCode,
          },
        };
      }
      return { success: false, message: "Invalid IFSC code" };
    } catch (fallbackErr) {
      return { success: false, message: "Network error looking up IFSC" };
    }
  },
};
