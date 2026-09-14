import { z } from "zod";

/**
 * Customer Application Support Issue Types matching backend enum values:
 * CUSTOMER_DETAILS, DOCUMENT_ERROR, BANK_DETAILS, DISBURSEMENT, OTHER
 */
export const CUSTOMER_APP_ISSUE_OPTIONS = [
  { value: "CUSTOMER_DETAILS", label: "Customer Details / Information" },
  { value: "DOCUMENT_ERROR", label: "Document Issue / Error" },
  { value: "BANK_DETAILS", label: "Bank / Financial Details" },
  { value: "DISBURSEMENT", label: "Disbursement Issue" },
  { value: "OTHER", label: "Other Issue" },
];

// Preserved for backward compatibility while providing { value, label } objects
export const CUSTOMER_APP_ISSUE_TYPES = CUSTOMER_APP_ISSUE_OPTIONS;

export const GENERAL_ISSUE_TYPES = [
  "Account / Profile",
  "Login / Access",
  "Technical Issue",
  "Payment / Financial",
  "Other",
];

export const ACCOUNT_ISSUE_TYPES = [
  "Profile Information",
  "Contact Information",
  "Login / Access Issue",
  "Account Issue",
  "Other",
];

// Allowed formats strictly matching backend multer restrictions
export const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENT_COUNT = 5;

/**
 * Validates a single file for attachment.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateSupportFile = (file) => {
  if (!file) return { valid: false, error: "File is missing" };

  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";

  if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type: "${file.name}". Allowed formats: JPG, JPEG, PNG, PDF.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File "${file.name}" (${sizeMb} MB) exceeds the 5 MB limit.`,
    };
  }

  return { valid: true };
};

/**
 * Creates a Zod schema tailored for the specific support category without Priority or Subject.
 * @param {"customer-application" | "general" | "account"} category
 */
export const createSupportTicketSchema = (category = "customer-application") => {
  const baseShape = {
    issueType: z
      .string({ required_error: "Issue type is required" })
      .min(1, "Issue type is required"),
    description: z
      .string({ required_error: "Description is required" })
      .trim()
      .min(15, "Description must be at least 15 characters")
      .max(2000, "Description cannot exceed 2000 characters"),
  };

  if (category === "customer-application") {
    return z.object({
      ...baseShape,
      selectedCaseId: z
        .union([z.string(), z.number()], {
          required_error: "Please select a customer application",
        })
        .refine(
          (val) =>
            Boolean(
              val &&
                String(val).trim().length > 0 &&
                !isNaN(Number(val)) &&
                Number(val) > 0,
            ),
          {
            message: "Please select a customer application",
          },
        ),
    });
  }

  return z.object(baseShape);
};
