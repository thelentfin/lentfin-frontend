import { z } from "zod";

export const BANK_OPTIONS = [
  "ICICI Bank",
  "HDFC Bank",
  "Kotak Mahindra Bank",
  "YES Bank",
  "Axis Bank",
  "SBI Bank",
  "Other",
];

export const PAYMENT_TYPE_OPTIONS = [
  {
    id: "SPOT_48_HOURS",
    label: "Spot Payment — Within 48 Hours — 0.85%",
    title: "Spot Payment",
    subtext: "Within 48 Hours",
    rate: "0.85% of Loan Amount",
  },
  {
    id: "AFTER_5_DAYS",
    label: "Payment After 5 Days — 0.90%",
    title: "Payment After 5 Days",
    subtext: "Processed after 5 business days",
    rate: "0.90% of Loan Amount",
  },
];

// Helper functions for safe file handling
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
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

// ─── STEP 1 SCHEMA — Customer & Sanction Details ─────────────────────────────
export const customerStep1Schema = z.object({
  bank: z.string().min(1, "Bank selection is required"),

  customerName: z
    .string()
    .min(1, "Customer Name is required")
    .transform((val) => val.trim())
    .pipe(z.string().min(2, "Customer Name must be at least 2 characters")),

  mobile: z
    .string()
    .min(1, "Mobile Number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Mobile Number must be a valid 10-digit Indian mobile number"
    ),

  applicationNo: z
    .string()
    .min(1, "Application Number is required")
    .transform((val) => val.trim()),

  loanAccountNo: z
    .string()
    .min(1, "Loan Account Number is required")
    .transform((val) => val.trim()),

  sanctionAmount: z
    .string()
    .min(1, "Sanction Amount is required")
    .refine((val) => {
      const cleaned = String(val).replace(/,/g, "").trim();
      const num = Number(cleaned);
      return !isNaN(num) && num > 0;
    }, "Sanction Amount must be a positive number"),

  sanctionLetter: z
    .any()
    .refine((val) => isFileProvided(val), "Sanction Letter document is required")
    .refine(
      (val) => isValidFileType(val),
      "Only PDF, JPG, and PNG files are allowed"
    )
    .refine((val) => isValidFileSize(val), "File size must not exceed 5 MB"),
});

// ─── STEP 2 SCHEMA — Disbursement Details ────────────────────────────────────
export const customerStep2BaseSchema = z.object({
  disbursementType: z.string().min(1, "Disbursement Type is required"),

  disbursementAmount: z.string().optional(),

  disbursementDate: z.string().min(1, "Disbursement Date is required"),

  rate: z
    .string()
    .min(1, "Rate (%) is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, "Rate must be a positive number"),

  pf: z
    .string()
    .min(1, "Processing Fee (PF) is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    }, "PF cannot be negative"),

  tenure: z
    .string()
    .min(1, "Tenure is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, "Tenure must be a positive number"),

  insuranceAmount: z
    .string()
    .min(1, "Insurance Amount is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    }, "Insurance Amount cannot be negative"),

  chequeHandoverDate: z.string().min(1, "Cheque Handover Date is required"),

  pddCleared: z.string().min(1, "Please select PDD Cleared status"),

  pddDocument: z.any().optional(),
});

const validatePartDisbursementAmount = (data, ctx) => {
  const isPart = String(data.disbursementType || "").toUpperCase() === "PART";
  if (isPart) {
    const disbAmtStr = String(data.disbursementAmount || "").replace(/,/g, "").trim();
    const disbAmtNum = Number(disbAmtStr);
    const sancAmtStr = String(data.sanctionAmount || "").replace(/,/g, "").trim();
    const sancAmtNum = Number(sancAmtStr);

    if (!disbAmtStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Disbursement Amount is required for Part Disbursement",
        path: ["disbursementAmount"],
      });
    } else if (isNaN(disbAmtNum) || disbAmtNum <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Disbursement Amount must be a positive number greater than 0",
        path: ["disbursementAmount"],
      });
    } else if (!isNaN(sancAmtNum) && sancAmtNum > 0 && disbAmtNum >= sancAmtNum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Disbursement amount must be less than sanction amount (₹${sancAmtNum.toLocaleString("en-IN")})`,
        path: ["disbursementAmount"],
      });
    }
  }
};

export const customerStep2Schema = customerStep2BaseSchema.superRefine((data, ctx) => {
  validatePartDisbursementAmount(data, ctx);

  if (data.pddCleared === "yes") {
    if (!isFileProvided(data.pddDocument)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PDD Document is required when PDD Cleared is Yes",
        path: ["pddDocument"],
      });
    } else if (!isValidFileType(data.pddDocument)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only PDF, JPG, and PNG files are allowed",
        path: ["pddDocument"],
      });
    } else if (!isValidFileSize(data.pddDocument)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File size must not exceed 5 MB",
        path: ["pddDocument"],
      });
    }
  }
});

// ─── STEP 3 SCHEMA — Payment & Contact Details ───────────────────────────────
export const customerStep3Schema = z.object({
  smName: z
    .string()
    .min(1, "SM Name is required")
    .transform((val) => val.trim())
    .pipe(z.string().min(2, "SM Name must be at least 2 characters")),

  smMobile: z
    .string()
    .min(1, "SM Mobile Number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "SM Mobile Number must be a valid 10-digit Indian mobile number"
    ),

  smEmail: z
    .string()
    .min(1, "SM Email ID is required")
    .email("Invalid SM Email format"),

  asmName: z
    .string()
    .min(1, "ASM Name is required")
    .transform((val) => val.trim())
    .pipe(z.string().min(2, "ASM Name must be at least 2 characters")),

  asmMobile: z
    .string()
    .min(1, "ASM Mobile Number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "ASM Mobile Number must be a valid 10-digit Indian mobile number"
    ),

  asmEmail: z
    .string()
    .min(1, "ASM Email ID is required")
    .email("Invalid ASM Email format"),

  paymentType: z.string().min(1, "Payment Type selection is required"),
});

// ─── COMBINED 3-STEP REGISTRATION SCHEMA ─────────────────────────────────────
export const fullCustomerRegistrationSchema = customerStep1Schema
  .merge(customerStep2BaseSchema)
  .merge(customerStep3Schema)
  .superRefine((data, ctx) => {
    validatePartDisbursementAmount(data, ctx);

    if (data.pddCleared === "yes") {
      if (!isFileProvided(data.pddDocument)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PDD Document is required when PDD Cleared is Yes",
          path: ["pddDocument"],
        });
      } else if (!isValidFileType(data.pddDocument)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only PDF, JPG, and PNG files are allowed",
          path: ["pddDocument"],
        });
      } else if (!isValidFileSize(data.pddDocument)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File size must not exceed 5 MB",
          path: ["pddDocument"],
        });
      }
    }
  });
