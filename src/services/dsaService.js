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
    const compId = formData.company_id || formData.companyName || 1;
    let locId = Number(formData.location_id);
    if (!locId || isNaN(locId) || locId <= 0) {
      if (Number.isInteger(Number(formData.location)) && Number(formData.location) > 0) {
        locId = Number(formData.location);
      } else {
        locId = 1;
      }
    }
    const compName =
      formData.companyNameText ||
      formData.company_name ||
      "digiva";
    const dsaLoc =
      formData.dsa_location ||
      formData.locationText ||
      formData.city ||
      (typeof formData.location === "string" ? formData.location : "") ||
      "surat";

    body.append("dsa_location", dsaLoc);
    body.append("company_id", compId);
    body.append("location_id", locId);
    body.append("company_name", compName);
    body.append("location", dsaLoc);
    if (formData.city || dsaLoc) {
      body.append("city", formData.city || dsaLoc);
    }

    body.append("name", formData.fullName);
    if (formData.firmName || formData.firm_name) {
      body.append(
        "firm_name",
        (formData.firmName || formData.firm_name).trim()
      );
    }
    if (formData.referralCode || formData.referral_code) {
      body.append(
        "referral_code",
        (formData.referralCode || formData.referral_code).trim()
      );
    }
    body.append("email", formData.email);
    body.append("mobile", formData.mobile);
    body.append("pan_number", formData.panNumber || "");
    body.append("aadhaar_number", formData.aadhaarNumber || "");
    body.append("gst_number", formData.gstNumber || "");
    if (formData.msmeNumber) {
      body.append("msme_number", formData.msmeNumber);
      body.append("udyam_number", formData.msmeNumber);
    }

    let backendConstitution = formData.constitutionType || "";
    if (backendConstitution === "Partnership") {
      backendConstitution = "Partnership/LLP";
    }
    body.append("constitution_type", backendConstitution);

    body.append("account_holder_name", formData.bankAccountName || "");
    body.append("account_number", formData.accountNumber || "");
    body.append("ifsc_code", formData.ifscCode || "");
    body.append("bank_name", formData.bankName || "");
    body.append("branch_name", formData.branchName || "");

    // ── PERSONAL KYC & BANK FILES (Step 2) ──
    const panFile = extractFile(formData.panCardDoc);
    if (panFile) {
      body.append("pan_file", panFile);
      body.append("card_file", panFile); // Backward compatibility
    }

    const aadhaarFile = extractFile(formData.aadhaarCardDoc);
    if (aadhaarFile) {
      body.append("aadhaar_file", aadhaarFile);
    }

    const passportFile = extractFile(formData.photo);
    if (passportFile) {
      body.append("photo_file", passportFile);
      body.append("passport_file", passportFile); // Backward compatibility
    }

    const bankFile = extractFile(formData.bankStatementDoc);
    if (bankFile) {
      body.append("bank_file", bankFile);
    }

    // ── GST & UDYAM FILES (Step 4) ──
    if (formData.gstCertificate) {
      const gstFile = extractFile(formData.gstCertificate);
      if (gstFile) body.append("gst_file", gstFile);
    }
    if (formData.udyamCertificate) {
      const udyamFile = extractFile(formData.udyamCertificate);
      if (udyamFile) body.append("udyam_file", udyamFile);
    }

    // ── CONSTITUTION-CONDITIONAL FILES & DETAILS (Step 1) ──
    const additionalPartners = Array.isArray(formData.additionalPartners)
      ? formData.additionalPartners
      : [];

    if (backendConstitution === "Partnership/LLP") {
      if (formData.partnershipDeed) {
        const deedFile = extractFile(formData.partnershipDeed);
        if (deedFile) body.append("partnership_deed_file", deedFile);
      }
      if (formData.firmPanDoc) {
        const firmPanFile = extractFile(formData.firmPanDoc);
        if (firmPanFile) body.append("firm_pan_file", firmPanFile);
      }

      if (additionalPartners.length > 0) {
        const partnerPayload = additionalPartners.map((partner, index) => ({
          partner_number: index + 2,
          name: (partner.fullName || "").trim(),
          email: (partner.email || "").trim(),
          mobile: (partner.mobile || "").trim(),
          pan_number: (partner.panNumber || "").trim().toUpperCase(),
          aadhaar_number: (partner.aadhaarNumber || "").trim(),
        }));
        body.append("partners", JSON.stringify(partnerPayload));

        additionalPartners.forEach((partner, index) => {
          const pNum = index + 2;
          const pPhoto = extractFile(partner.photo);
          if (pPhoto) body.append(`partner_${pNum}_photo`, pPhoto);

          const pPan = extractFile(partner.panCardDoc);
          if (pPan) body.append(`partner_${pNum}_pan`, pPan);

          const pAadhaar = extractFile(partner.aadhaarCardDoc);
          if (pAadhaar) body.append(`partner_${pNum}_aadhaar`, pAadhaar);

          const pBank = extractFile(partner.bankStatementDoc);
          if (pBank) body.append(`partner_${pNum}_bank`, pBank);
        });
      } else {
        // Fallback partner KYC details mapped for backend schema requirement
        const partner2 = {
          partner_number: 2,
          name: (formData.fullName || "").trim(),
          email: (formData.email || "").trim(),
          mobile: (formData.mobile || "").trim(),
          pan_number: (formData.panNumber || "").trim().toUpperCase(),
          aadhaar_number: (formData.aadhaarNumber || "").trim(),
        };
        body.append("partners", JSON.stringify([partner2]));
      }
    } else if (backendConstitution === "Private Limited") {
      if (formData.firmPanDoc) {
        const firmPanFile = extractFile(formData.firmPanDoc);
        if (firmPanFile) body.append("firm_pan_file", firmPanFile);
      }
      if (formData.incorporationDoc) {
        const incFile = extractFile(formData.incorporationDoc);
        if (incFile) body.append("incorporation_certificate_file", incFile);
      }

      // Director 1 (Main Applicant) documents required by backend
      if (panFile) {
        body.append("director_1_pan", panFile);
      }
      if (aadhaarFile) {
        body.append("director_1_aadhaar", aadhaarFile);
      }
      if (passportFile) {
        body.append("director_1_passport", passportFile);
      }

      // Directors required by backend schema for Private Limited (minimum 1 director)
      const directorsList = [
        {
          director_number: 1,
          name: (formData.fullName || "").trim(),
          email: (formData.email || "").trim(),
          mobile: (formData.mobile || "").trim(),
          pan_number: (formData.panNumber || "").trim().toUpperCase(),
          aadhaar_number: (formData.aadhaarNumber || "").trim(),
        },
        ...additionalPartners.map((partner, index) => ({
          director_number: index + 2,
          name: (partner.fullName || "").trim(),
          email: (partner.email || "").trim(),
          mobile: (partner.mobile || "").trim(),
          pan_number: (partner.panNumber || "").trim().toUpperCase(),
          aadhaar_number: (partner.aadhaarNumber || "").trim(),
        })),
      ];
      body.append("directors", JSON.stringify(directorsList));

      // Append additional director documents for Private Limited
      if (additionalPartners.length > 0) {
        additionalPartners.forEach((partner, index) => {
          const dNum = index + 2;
          const dPhoto = extractFile(partner.photo);
          if (dPhoto) {
            body.append(`director_${dNum}_passport`, dPhoto);
            body.append(`partner_${dNum}_photo`, dPhoto);
          }

          const dPan = extractFile(partner.panCardDoc);
          if (dPan) {
            body.append(`director_${dNum}_pan`, dPan);
            body.append(`partner_${dNum}_pan`, dPan);
          }

          const dAadhaar = extractFile(partner.aadhaarCardDoc);
          if (dAadhaar) {
            body.append(`director_${dNum}_aadhaar`, dAadhaar);
            body.append(`partner_${dNum}_aadhaar`, dAadhaar);
          }
        });
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
   * Validate Referral Code via backend
   */
  async validateReferralCode(code) {
    if (!code || !code.trim()) {
      return { status: false, message: "Referral code is required" };
    }
    const cleanCode = code.trim();
    try {
      const response = await fetch(
        `${API_BASE_URL}/dsa/check-referral/${encodeURIComponent(cleanCode)}`
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn("Referral validation error:", err);
      return { status: false, message: "Unable to reach server to validate referral code" };
    }
  },

  /**
   * Fetch DSAs who registered under the logged-in DSA
   */
  async getMyReferrals() {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_BASE_URL}/dsa/my-referrals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (err) {
      console.warn("Fetch referrals error:", err);
      return { status: false, message: "Failed to fetch referrals" };
    }
  },

  /**
   * Fetch referral network with business metrics (cases, volume, status breakdown)
   */
  async getReferralNetwork() {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_BASE_URL}/dsa/referral-network`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (err) {
      console.warn("Fetch referral network error:", err);
      return { status: false, message: "Failed to fetch referral network" };
    }
  },

  /**
   * Fetch cases submitted by a specific referred partner
   */
  async getReferralPartnerCases(partnerId) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_BASE_URL}/dsa/referral-network/${partnerId}/cases`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (err) {
      console.warn("Fetch partner cases error:", err);
      return { status: false, message: "Failed to fetch partner cases" };
    }
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
