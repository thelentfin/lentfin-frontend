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
  company: z.string().min(1, "Company selection is required"),

  subDsaId: z.string().optional().nullable(),

  bank: z.string().min(1, "Bank selection is required"),

  product: z.string().min(1, "Loan Product selection is required"),

  payoutOption: z.string().optional(),

  customerName: z
    .string()
    .min(1, "Customer Name is required")
    .transform((val) => val.trim())
    .pipe(z.string().min(2, "Customer Name must be at least 2 characters")),

  mobile: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
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
    .optional()
    .refine(
      (val) => !isFileProvided(val) || isValidFileType(val),
      "Only PDF, JPG, and PNG files are allowed"
    )
    .refine(
      (val) => !isFileProvided(val) || isValidFileSize(val),
      "File size must not exceed 5 MB"
    ),
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
});

// ─── STEP 3 SCHEMA — Payment & Contact Details ───────────────────────────────
export const customerStep3BaseSchema = z.object({
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

  subDsaPercentage: z.string().optional().nullable(),
});

export const validateSmAsmDistinct = (data, ctx) => {
  const smMobile = (data.smMobile || "").trim();
  const asmMobile = (data.asmMobile || "").trim();
  if (smMobile && asmMobile && smMobile === asmMobile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ASM mobile number cannot be the same as SM mobile number",
      path: ["asmMobile"],
    });
  }

  const smEmail = (data.smEmail || "").trim().toLowerCase();
  const asmEmail = (data.asmEmail || "").trim().toLowerCase();
  if (smEmail && asmEmail && smEmail === asmEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ASM email cannot be the same as SM email",
      path: ["asmEmail"],
    });
  }
};

export const customerStep3Schema = customerStep3BaseSchema.superRefine((data, ctx) => {
  validateSmAsmDistinct(data, ctx);
});

// ─── COMBINED 4-STEP / CAR LOAN REGISTRATION SCHEMA ─────────────────────────
export const fullCustomerRegistrationSchema = z
  .object({
    // Step 1: Allocation
    company: z.string().min(1, "Company selection is required"),
    subDsaId: z.string().optional().nullable(),
    bank: z.string().min(1, "Bank selection is required"),
    product: z.string().min(1, "Loan Product selection is required"),
    payoutOption: z.string().optional(),
    isCarLoan: z.boolean().optional(),

    // Step 2: Customer basic
    customerName: z
      .string()
      .min(1, "Customer Name is required")
      .transform((val) => val.trim())
      .pipe(z.string().min(2, "Customer Name must be at least 2 characters")),

    mobile: z.string().optional().nullable().or(z.literal("")),

    // Standard Step 2 fields (validated when !isCarLoan)
    applicationNo: z.string().optional(),
    loanAccountNo: z.string().optional(),
    sanctionAmount: z.string().optional(),
    sanctionLetter: z.any().optional(),

    // Car Loan Step 2 fields (validated when isCarLoan)
    carPhotos: z.any().optional(),
    invoiceCopy: z.any().optional(),
    insuranceCopy: z.any().optional(),
    paymentAdvice: z.any().optional(),
    bankerName: z.string().optional(),
    bankerMobile: z.string().optional(),

    // Standard Step 3 fields
    disbursementType: z.string().optional(),
    disbursementAmount: z.string().optional(),
    disbursementDate: z.string().optional(),
    rate: z.string().optional(),
    pf: z.string().optional(),
    tenure: z.string().optional(),
    insuranceAmount: z.string().optional(),
    chequeHandoverDate: z.string().optional(),
    pddCleared: z.string().optional(),
    pddDocument: z.any().optional(),

    // Standard Step 4 fields
    smName: z.string().optional(),
    smMobile: z.string().optional(),
    smEmail: z.string().optional(),
    asmName: z.string().optional(),
    asmMobile: z.string().optional(),
    asmEmail: z.string().optional(),
    paymentType: z.string().optional(),
    subDsaPercentage: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.isCarLoan) {
      // Customer Mobile is compulsory for Car Loan
      if (!data.mobile || !/^[6-9]\d{9}$/.test(String(data.mobile).trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Customer Mobile Number is required for Car Loan (10 digits)",
          path: ["mobile"],
        });
      }
      // Car Loan specific validations
      if (!data.bankerName || !data.bankerName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Banker / Executive Name is required",
          path: ["bankerName"],
        });
      }
      if (!data.bankerMobile || !/^[6-9]\d{9}$/.test(data.bankerMobile)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Banker Mobile must be a valid 10-digit number",
          path: ["bankerMobile"],
        });
      }
      if (!data.carPhotos || !Array.isArray(data.carPhotos) || data.carPhotos.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least 1 car photo with number plate (front view) is compulsory",
          path: ["carPhotos"],
        });
      }
      if (!isFileProvided(data.invoiceCopy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invoice Copy is required",
          path: ["invoiceCopy"],
        });
      }
      if (!isFileProvided(data.insuranceCopy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insurance Copy is required",
          path: ["insuranceCopy"],
        });
      }
      if (!isFileProvided(data.paymentAdvice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank Payment Advice or Sanction Letter is required",
          path: ["paymentAdvice"],
        });
      }
    } else {
      // Standard Loan validations
      if (!data.applicationNo || !data.applicationNo.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Application Number is required",
          path: ["applicationNo"],
        });
      }
      if (!data.loanAccountNo || !data.loanAccountNo.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Loan Account Number is required",
          path: ["loanAccountNo"],
        });
      }
      if (!data.sanctionAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sanction Amount is required",
          path: ["sanctionAmount"],
        });
      } else {
        const cleaned = String(data.sanctionAmount).replace(/,/g, "").trim();
        const num = Number(cleaned);
        if (isNaN(num) || num <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Sanction Amount must be a positive number",
            path: ["sanctionAmount"],
          });
        }
      }
      if (!data.disbursementType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Disbursement Type is required",
          path: ["disbursementType"],
        });
      }
      if (!data.disbursementDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Disbursement Date is required",
          path: ["disbursementDate"],
        });
      }
      if (!data.rate || isNaN(Number(data.rate)) || Number(data.rate) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate must be a positive number",
          path: ["rate"],
        });
      }
      if (
        data.pf === undefined ||
        data.pf === "" ||
        isNaN(Number(data.pf)) ||
        Number(data.pf) < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PF cannot be negative",
          path: ["pf"],
        });
      }
      if (!data.tenure || isNaN(Number(data.tenure)) || Number(data.tenure) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tenure must be a positive number",
          path: ["tenure"],
        });
      }
      if (
        data.insuranceAmount === undefined ||
        data.insuranceAmount === "" ||
        isNaN(Number(data.insuranceAmount)) ||
        Number(data.insuranceAmount) < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insurance Amount cannot be negative",
          path: ["insuranceAmount"],
        });
      }
      if (!data.chequeHandoverDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cheque Handover Date is required",
          path: ["chequeHandoverDate"],
        });
      }
      if (!data.pddCleared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select PDD Cleared status",
          path: ["pddCleared"],
        });
      }
      if (!data.smName || data.smName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SM Name must be at least 2 characters",
          path: ["smName"],
        });
      }
      if (!data.smMobile || !/^[6-9]\d{9}$/.test(data.smMobile)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SM Mobile Number must be a valid 10-digit Indian mobile number",
          path: ["smMobile"],
        });
      }
      if (!data.smEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.smEmail)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid SM Email format",
          path: ["smEmail"],
        });
      }
      if (!data.asmName || data.asmName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ASM Name must be at least 2 characters",
          path: ["asmName"],
        });
      }
      if (!data.asmMobile || !/^[6-9]\d{9}$/.test(data.asmMobile)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ASM Mobile Number must be a valid 10-digit Indian mobile number",
          path: ["asmMobile"],
        });
      }
      if (!data.asmEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.asmEmail)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid ASM Email format",
          path: ["asmEmail"],
        });
      }
      if (!data.paymentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payment Type selection is required",
          path: ["paymentType"],
        });
      }
      validatePartDisbursementAmount(data, ctx);
      validateSmAsmDistinct(data, ctx);
    }
  });
