import { z } from "zod";

// Helper function to validate file input safely across client and server environments
export const isFileProvided = (val) => {
  if (!val) return false;
  if (typeof window !== "undefined") {
    if (typeof FileList !== "undefined" && val instanceof FileList) {
      return val.length > 0 && val[0]?.size > 0;
    }
    if (typeof File !== "undefined" && val instanceof File) {
      return val.size > 0;
    }
  }
  if (
    typeof val === "object" &&
    (val.name || val.path) &&
    (val.size ?? 1) > 0
  ) {
    return true;
  }
  return false;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const getFileFromVal = (val) => {
  if (!val) return null;
  if (typeof window !== "undefined") {
    if (typeof FileList !== "undefined" && val instanceof FileList) {
      return val.length > 0 ? val[0] : null;
    }
    if (typeof File !== "undefined" && val instanceof File) {
      return val;
    }
  }
  if (typeof val === "object" && (val.name || val.path)) {
    return val;
  }
  return null;
};

export const isValidFileType = (val) => {
  const file = getFileFromVal(val);
  if (!file) return true;
  const fileName = file.name || "";
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (allowedExtensions.includes(ext)) return true;
  if (file.type && ALLOWED_FILE_TYPES.includes(file.type)) return true;

  return false;
};

export const isValidFileSize = (val) => {
  const file = getFileFromVal(val);
  if (!file) return true;
  const size = file.size ?? 0;
  return size <= MAX_FILE_SIZE;
};

// ─── PARTNER KYC SCHEMA (Reusable for Additional Partners) ──────────────────
export const partnerKycSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full Name is required")
    .min(2, "Full Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email ID is required")
    .email("Invalid email format"),
  mobile: z
    .string()
    .min(1, "Mobile Number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Mobile Number must be a valid 10-digit Indian number",
    ),
  panNumber: z
    .string()
    .min(1, "PAN Number is required")
    .transform((val) => (val ? val.toUpperCase().trim() : ""))
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
          "Invalid PAN format (e.g. ABCDE1234F)",
        ),
    ),
  panCardDoc: z
    .any()
    .refine((val) => isFileProvided(val), "PAN Card document is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar Number is required")
    .regex(/^\d{12}$/, "Aadhaar Number must be a 12-digit number"),
  aadhaarCardDoc: z
    .any()
    .refine((val) => isFileProvided(val), "Aadhaar Card document is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  photo: z
    .any()
    .refine((val) => isFileProvided(val), "Passport photo is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
});

export const isPartnerComplete = (partner) => {
  if (!partner) return false;
  return partnerKycSchema.safeParse(partner).success;
};

// ─── STEP 1 SCHEMA — Registration Type (Formerly Constitution) ───────────────
export const CONSTITUTION_TYPES = [
  { id: "Individual", label: "Individual" },
  { id: "Proprietorship", label: "Sole Proprietorship" },
  { id: "Partnership", label: "Partnership" },
];

export const step1BaseObject = z.object({
  constitutionType: z.string().min(1, "Please select how you are registering"),
  partnerCount: z.union([z.number(), z.string()]).optional(),
  partners: z.array(z.any()).optional(),
  partnershipDeed: z
    .any()
    .optional()
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  firmPanDoc: z
    .any()
    .optional()
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
});

export const step1Schema = step1BaseObject.superRefine((data, ctx) => {
  const type = data.constitutionType;

  if (type === "Partnership") {
    if (!isFileProvided(data.partnershipDeed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Partnership Deed is required for Partnership constitution",
        path: ["partnershipDeed"],
      });
    }
    if (!isFileProvided(data.firmPanDoc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Firm PAN Card is required for Partnership constitution",
        path: ["firmPanDoc"],
      });
    }
  }
});

// ─── STEP 2 SCHEMA — Personal & KYC (Primary DSA + Partners if Partnership) ──
export const step2BaseObject = z.object({
  fullName: z
    .string()
    .min(1, "Full Name is required")
    .min(2, "Full Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email ID is required")
    .email("Invalid email format"),
  mobile: z
    .string()
    .min(1, "Mobile Number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Mobile Number must be a valid 10-digit Indian number",
    ),
  panNumber: z
    .string()
    .min(1, "PAN Number is required")
    .transform((val) => (val ? val.toUpperCase().trim() : ""))
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
          "Invalid PAN format (e.g. ABCDE1234F)",
        ),
    ),
  panCardDoc: z
    .any()
    .refine((val) => isFileProvided(val), "PAN Card document is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar Number is required")
    .regex(/^\d{12}$/, "Aadhaar Number must be a 12-digit number"),
  aadhaarCardDoc: z
    .any()
    .refine((val) => isFileProvided(val), "Aadhaar Card document is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  photo: z
    .any()
    .refine((val) => isFileProvided(val), "Passport photo is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  constitutionType: z.string().optional(),
  partnerCount: z.union([z.number(), z.string()]).optional(),
  partners: z.array(z.any()).optional(),
});

export const step2Schema = step2BaseObject.superRefine((data, ctx) => {
  if (data.constitutionType === "Partnership") {
    const totalCount = parseInt(data.partnerCount, 10) || 2;
    const additionalCount = Math.max(1, totalCount - 1);
    const partnersList = Array.isArray(data.partners) ? data.partners : [];

    for (let i = 0; i < additionalCount; i++) {
      const partner = partnersList[i] || {};
      const partnerResult = partnerKycSchema.safeParse(partner);
      if (!partnerResult.success) {
        partnerResult.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["partners", i, ...issue.path],
          });
        });
      }
    }
  }
});

// ─── STEP 3 SCHEMA — Bank Details ────────────────────────────────────────────
export const step3Schema = z.object({
  bankAccountName: z
    .string()
    .min(1, "Name as per Bank is required")
    .min(2, "Name must be at least 2 characters"),
  accountNumber: z
    .string()
    .min(1, "Account Number is required")
    .regex(/^\d{9,18}$/, "Account Number must be between 9 and 18 digits"),
  ifscCode: z
    .string()
    .min(1, "IFSC Code is required")
    .transform((val) => (val ? val.toUpperCase().trim() : ""))
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          "Invalid IFSC code format (e.g. SBIN0001234)",
        ),
    ),
  bankName: z.string().optional().or(z.literal("")),
  branchName: z.string().optional().or(z.literal("")),
});

// ─── STEP 4 SCHEMA — GST / MSME ─────────────────────────────────────────────
export const step4BaseObject = z.object({
  hasGstToggle: z.boolean().optional(),
  gstNumber: z
    .string()
    .transform((val) => (val ? val.toUpperCase().trim() : ""))
    .optional()
    .or(z.literal("")),
  msmeCertificate: z
    .any()
    .optional()
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
  gstCertificate: z
    .any()
    .optional()
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, JPEG, and PNG files are allowed.",
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB."),
});

export const step4Schema = step4BaseObject.superRefine((data, ctx) => {
  const isToggleOn = Boolean(data.hasGstToggle);

  if (isToggleOn) {
    const gstVal = data.gstNumber ? data.gstNumber.trim() : "";
    if (!gstVal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GST Number is required when GST toggle is ON",
        path: ["gstNumber"],
      });
    } else {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid GST Number format (e.g. 22AAAAA0000A1Z5)",
          path: ["gstNumber"],
        });
      }
    }

    if (!isFileProvided(data.msmeCertificate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MSME Certificate is required when GST toggle is ON",
        path: ["msmeCertificate"],
      });
    }

    if (!isFileProvided(data.gstCertificate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GST Certificate is required when GST toggle is ON",
        path: ["gstCertificate"],
      });
    }
  }
});

// ─── STEP 5 SCHEMA — Company & Location ──────────────────────────────────────
export const COMPANY_OPTIONS = [
  "Urban Money",
  "Endurance Consultants Pvt Ltd",
  "FinWizz",
];

export const LOCATION_OPTIONS = ["Rajkot", "Baroda", "Jamnagar", "Ahmedabad"];

export const step5Schema = z.object({
  companyName: z.string().min(1, "Company selection is required"),
  companyNameText: z.string().optional(),

  location: z.string().min(1, "Location selection is required"),
  locationText: z.string().optional(),
});

// ─── FULL COMBINED FORM SCHEMA ───────────────────────────────────────────────
export const fullDsaSchema = step1BaseObject
  .merge(step2BaseObject)
  .merge(step3Schema)
  .merge(step4BaseObject)
  .merge(step5Schema)
  .superRefine((data, ctx) => {
    // 1. Constitution / Registration Type validation
    const type = data.constitutionType;
    if (type === "Partnership") {
      if (!isFileProvided(data.partnershipDeed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Partnership Deed is required for Partnership constitution",
          path: ["partnershipDeed"],
        });
      }
      if (!isFileProvided(data.firmPanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Firm PAN Card is required for Partnership constitution",
          path: ["firmPanDoc"],
        });
      }

      // Additional partners validation
      const totalCount = parseInt(data.partnerCount, 10) || 2;
      const additionalCount = Math.max(1, totalCount - 1);
      const partnersList = Array.isArray(data.partners) ? data.partners : [];

      for (let i = 0; i < additionalCount; i++) {
        const partner = partnersList[i] || {};
        const partnerResult = partnerKycSchema.safeParse(partner);
        if (!partnerResult.success) {
          partnerResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ["partners", i, ...issue.path],
            });
          });
        }
      }
    }

    // 2. GST validation
    const isToggleOn = Boolean(data.hasGstToggle);
    if (isToggleOn) {
      const gstVal = data.gstNumber ? data.gstNumber.trim() : "";
      if (!gstVal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "GST Number is required when GST toggle is ON",
          path: ["gstNumber"],
        });
      } else {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstVal)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid GST Number format (e.g. 22AAAAA0000A1Z5)",
            path: ["gstNumber"],
          });
        }
      }
      if (!isFileProvided(data.msmeCertificate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MSME Certificate is required when GST toggle is ON",
          path: ["msmeCertificate"],
        });
      }
      if (!isFileProvided(data.gstCertificate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "GST Certificate is required when GST toggle is ON",
          path: ["gstCertificate"],
        });
      }
    }
  });
