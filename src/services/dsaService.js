/**
 * DSA Registration Service Layer
 * Talks to POST /api/signup (multipart/form-data)
 *
 * NOTE: dsaRoutes is mounted in app.js as: app.use("/api", dsaRoutes)
 * so router.post("/signup", ...) resolves to /api/signup — NOT /api/dsa/signup.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function extractFile(val) {
  if (!val) return null;
  if (typeof FileList !== "undefined" && val instanceof FileList) {
    return val.length > 0 ? val[0] : null;
  }
  if (typeof File !== "undefined" && val instanceof File) {
    return val;
  }
  if (Array.isArray(val) && val.length > 0) {
    return extractFile(val[0]);
  }
  return val;
}

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
    const cardFile = extractFile(formData.panCardDoc);
    if (cardFile) body.append("card_file", cardFile);

    const aadhaarFile = extractFile(formData.aadhaarCardDoc);
    if (aadhaarFile) body.append("aadhaar_file", aadhaarFile);

    const passportFile = extractFile(formData.photo);
    if (passportFile) body.append("passport_file", passportFile);

    // ── GST-CONDITIONAL FILES (Step 3) ──
    if (formData.msmeCertificate) {
      const msmeFile = extractFile(formData.msmeCertificate);
      if (msmeFile) body.append("msme_file", msmeFile);
    }
    if (formData.gstCertificate) {
      const gstFile = extractFile(formData.gstCertificate);
      if (gstFile) body.append("gst_file", gstFile);
    }

    // ── CONSTITUTION-CONDITIONAL FILES & PARTNERS (Step 2 & 4) ──
    if (formData.constitutionType === "Partnership") {
      if (formData.partnershipDeed) {
        const deedFile = extractFile(formData.partnershipDeed);
        if (deedFile) body.append("partnership_deed_file", deedFile);
      }
      if (formData.firmPanDoc) {
        const firmPanFile = extractFile(formData.firmPanDoc);
        if (firmPanFile) body.append("pan_file", firmPanFile);
      }

      // Additional partners (Partner 2, 3, etc.)
      const totalCount = parseInt(formData.partnerCount, 10) || 2;
      const additionalCount = Math.max(1, totalCount - 1);
      const partnersList = Array.isArray(formData.partners) ? formData.partners : [];

      const partnersPayload = [];

      for (let i = 0; i < additionalCount; i++) {
        const partner = partnersList[i];
        if (!partner) continue;

        const partnerNumber = i + 2;

        partnersPayload.push({
          partner_number: partnerNumber,
          name: (partner.fullName || "").trim(),
          email: (partner.email || "").trim(),
          mobile: (partner.mobile || "").trim(),
          pan_number: (partner.panNumber || "").trim().toUpperCase(),
          aadhaar_number: (partner.aadhaarNumber || "").trim(),
        });

        // ── PARTNER KYC FILES ──
        const partnerPan = extractFile(partner.panCardDoc);
        if (partnerPan) {
          body.append(`partner_${partnerNumber}_pan`, partnerPan);
        }

        const partnerAadhaar = extractFile(partner.aadhaarCardDoc);
        if (partnerAadhaar) {
          body.append(`partner_${partnerNumber}_aadhaar`, partnerAadhaar);
        }

        const partnerPassport = extractFile(partner.photo);
        if (partnerPassport) {
          body.append(`partner_${partnerNumber}_passport`, partnerPassport);
        }
      }

      if (partnersPayload.length > 0) {
        body.append("partners", JSON.stringify(partnersPayload));
      }
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
