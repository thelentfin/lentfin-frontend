import { z } from "zod";

// Helper function to validate file input safely across client and server environments
const isFileProvided = (val) => {
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

const getFileFromVal = (val) => {
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

const isValidFileType = (val) => {
  const file = getFileFromVal(val);
  if (!file) return true;
  const fileName = file.name || "";
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  if (allowedExtensions.includes(ext)) return true;
  if (file.type && ALLOWED_FILE_TYPES.includes(file.type)) return true;

  return false;
};

const isValidFileSize = (val) => {
  const file = getFileFromVal(val);
  if (!file) return true;
  const size = file.size ?? 0;
  return size <= MAX_FILE_SIZE;
};

// ─── STEP 1 SCHEMA — Personal & KYC ─────────────────────────────────────────
export const step1Schema = z.object({
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
    .transform((val) => val.toUpperCase().trim())
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

// ─── STEP 2 SCHEMA — Bank Details ────────────────────────────────────────────
export const step2Schema = z.object({
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
    .transform((val) => val.toUpperCase().trim())
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          "Invalid IFSC code format (e.g. SBIN0001234)",
        ),
    ),
});

// ─── STEP 3 SCHEMA — GST / MSME ─────────────────────────────────────────────
const step3BaseObject = z.object({
  hasGstToggle: z.boolean().optional(),
  gstNumber: z
    .string()
    .transform((val) => val.toUpperCase().trim())
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

export const step3Schema = step3BaseObject.superRefine((data, ctx) => {
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

// ─── STEP 4 SCHEMA — Constitution Documents ─────────────────────────────────
export const CONSTITUTION_TYPES = [
  { id: "Individual", label: "Individual" },
  { id: "Proprietorship", label: "Sole Proprietorship" },
  { id: "Partnership", label: "Partnership" },
];

const step4BaseObject = z.object({
  constitutionType: z.string().min(1, "Please select a Constitution Type"),
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

export const step4Schema = step4BaseObject.superRefine((data, ctx) => {
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

// ─── STEP 5 SCHEMA — Company & Location ──────────────────────────────────────
export const COMPANY_OPTIONS = [
  "Urban Money",
  "Endurance Consultants Pvt Ltd",
  "FinWizz",
];

export const LOCATION_OPTIONS = ["Rajkot", "Baroda", "Jamnagar", "Ahmedabad"];

// NOTE: companyName / location hold the SELECTED ID (sent to backend
// as company_id / location_id). companyNameText / locationText hold
// the human-readable label (sent to backend as company_name / location,
// which the backend now requires). They are set together in
// CompanyLocationStep.jsx whenever a dropdown changes.
//
// They MUST be declared here (even as optional) — otherwise zodResolver
// strips them out of the parsed data, and onSubmit(data) would never
// see companyNameText/locationText even though they exist in the
// form's internal state.
export const step5Schema = z.object({
  companyName: z.string().min(1, "Company selection is required"),
  companyNameText: z.string().optional(),

  location: z.string().min(1, "Location selection is required"),
  locationText: z.string().optional(),
});

// ─── FULL COMBINED FORM SCHEMA ───────────────────────────────────────────────
export const fullDsaSchema = step1Schema
  .merge(step2Schema)
  .merge(step3BaseObject)
  .merge(step4BaseObject)
  .merge(step5Schema)
  .superRefine((data, ctx) => {
    // GST validation
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

    // Constitution validation
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
