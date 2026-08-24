"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  fullCustomerRegistrationSchema,
  getFileFromVal,
} from "@/schemas/customerRegistrationSchema";
import { customerApiService } from "@/services/customerApiService";
import { bankApiService } from "@/services/bankApiService";
import CustomerStep2 from "./CustomerStep2";
import CustomerStep3 from "./CustomerStep3";

export default function CustomerRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [fetchedBanks, setFetchedBanks] = useState([]);
  const [isBanksLoading, setIsBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");

  // Fetch active banks from Bank Master API on modal open
  const loadActiveBanks = async () => {
    setIsBanksLoading(true);
    setBanksError("");
    const res = await bankApiService.getBanks();
    if (res && res.status && Array.isArray(res.data)) {
      // Filter ONLY Active banks for new customer applications
      const activeBanks = res.data.filter(
        (b) => String(b.status || "").toLowerCase() === "active"
      );
      setFetchedBanks(activeBanks);
    } else {
      setBanksError(res?.message || "Failed to load bank options.");
      setFetchedBanks([]);
    }
    setIsBanksLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadActiveBanks();
    }
  }, [isOpen]);

  // Single React Hook Form instance for all 3 steps with complete Zod resolver
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    clearErrors,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(fullCustomerRegistrationSchema),
    mode: "onTouched",
    defaultValues: {
      // Step 1
      bank: "",
      customerName: "",
      mobile: "",
      applicationNo: "",
      loanAccountNo: "",
      sanctionAmount: "",
      sanctionLetter: null,
      // Step 2
      disbursementType: "Full",
      disbursementAmount: "",
      disbursementDate: "",
      rate: "",
      pf: "",
      tenure: "",
      insuranceAmount: "",
      chequeHandoverDate: "",
      pddCleared: "no",
      pddDocument: null,
      // Step 3
      smName: "",
      smMobile: "",
      smEmail: "",
      asmName: "",
      asmMobile: "",
      asmEmail: "",
      paymentType: "",
    },
  });

  const selectedSanctionLetter = watch("sanctionLetter");
  const sanctionFile = getFileFromVal(selectedSanctionLetter);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setValue("sanctionLetter", files, { shouldValidate: true });
    }
  };

  const handleRemoveFile = (e) => {
    if (e) e.stopPropagation();
    setValue("sanctionLetter", null, { shouldValidate: true });
  };

  // Validate Step 1 fields before advancing
  const handleNextStep1 = async () => {
    setSubmitError(null);
    const isStep1Valid = await trigger([
      "bank",
      "customerName",
      "mobile",
      "applicationNo",
      "loanAccountNo",
      "sanctionAmount",
      "sanctionLetter",
    ]);

    if (isStep1Valid) {
      setCurrentStep(2);
    }
  };

  // Validate Step 2 fields before advancing
  const handleNextStep2 = async () => {
    setSubmitError(null);
    const isStep2Valid = await trigger([
      "disbursementType",
      "disbursementAmount",
      "disbursementDate",
      "rate",
      "pf",
      "tenure",
      "insuranceAmount",
      "chequeHandoverDate",
      "pddCleared",
      "pddDocument",
    ]);

    if (isStep2Valid) {
      setCurrentStep(3);
    }
  };

  // Called when RHF full-form validation succeeds
  const onFinalSubmit = async (formData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Execute sequential 4-step API calls (stops immediately if any request fails)
      await customerApiService.submitFullCustomerRegistration(
        formData,
        fetchedBanks
      );

      // Success sequence
      setIsSubmittedSuccess(true);
      toast.success("Customer application registered successfully!");
      if (typeof onSuccess === "function") {
        onSuccess(formData);
      }

      // Reset and close ONLY after complete success across all 4 APIs
      setTimeout(() => {
        setIsSubmittedSuccess(false);
        setIsSubmitting(false);
        reset();
        setCurrentStep(1);
        onClose();
      }, 2000);
    } catch (err) {
      // Preserves form data and keeps modal open on API failure
      setIsSubmitting(false);
      const errMsg = err.message || "Failed to submit application to server. Please try again.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    }
  };

  // Called when RHF full-form validation fails before any API call is made
  const onInvalid = (formErrors) => {
    setSubmitError("Please fill in all required fields accurately across all steps.");
    
    // Auto-navigate to the step that has validation errors
    const step1Fields = [
      "bank",
      "customerName",
      "mobile",
      "applicationNo",
      "loanAccountNo",
      "sanctionAmount",
      "sanctionLetter",
    ];
    const step2Fields = [
      "disbursementType",
      "disbursementAmount",
      "disbursementDate",
      "rate",
      "pf",
      "tenure",
      "insuranceAmount",
      "chequeHandoverDate",
      "pddCleared",
      "pddDocument",
    ];

    const hasStep1Error = step1Fields.some((field) => formErrors[field]);
    const hasStep2Error = step2Fields.some((field) => formErrors[field]);

    if (hasStep1Error) {
      setCurrentStep(1);
    } else if (hasStep2Error) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while API submission is in progress
    reset();
    setCurrentStep(1);
    setIsSubmittedSuccess(false);
    setSubmitError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg bg-white border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 sm:px-6 py-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                New Customer Application
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Step {currentStep} of 3 —{" "}
                {currentStep === 1
                  ? "Customer & Sanction Details"
                  : currentStep === 2
                  ? "Disbursement Details"
                  : "Payment & Contact Details"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-sm disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-slate-50/50">
          {/* Submission / Validation Error Banner */}
          {submitError && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-start gap-2.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-[10px] shrink-0 mt-0.5">
                !
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Submission Alert</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {isSubmittedSuccess ? (
            /* Backend Submission Success Banner */
            <div className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 font-bold text-xl">
                ✓
              </div>
              <h4 className="text-base font-semibold text-slate-900">
                Application Submitted Successfully!
              </h4>
              <p className="text-xs text-slate-500 font-normal max-w-md mx-auto">
                All 4 application registration steps have been saved and verified by the server.
              </p>
            </div>
          ) : (
            <form
              id="customer-registration-form"
              onSubmit={handleSubmit(onFinalSubmit, onInvalid)}
            >
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Bank Selection */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          {...register("bank")}
                          disabled={isSubmitting || isBanksLoading}
                          className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                            errors.bank
                              ? "border-red-400 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        >
                          {isBanksLoading ? (
                            <option value="">Loading banks...</option>
                          ) : banksError ? (
                            <option value="">Failed to load banks</option>
                          ) : fetchedBanks.length === 0 ? (
                            <option value="">No banks available</option>
                          ) : (
                            <>
                              <option value="">Select Bank</option>
                              {fetchedBanks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bank_name}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {banksError && (
                        <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center justify-between">
                          <span>⚠️ {banksError}</span>
                          <button
                            type="button"
                            onClick={loadActiveBanks}
                            className="underline cursor-pointer text-slate-900 ml-2"
                          >
                            Retry
                          </button>
                        </p>
                      )}
                      {errors.bank && (
                        <p className="text-[11px] font-medium text-red-500">{errors.bank.message}</p>
                      )}
                    </div>

                    {/* 2. Customer Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        placeholder="e.g. Rajesh Kumar"
                        {...register("customerName")}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                          errors.customerName
                            ? "border-red-400 focus:border-red-500"
                            : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        }`}
                      />
                      {errors.customerName && (
                        <p className="text-[11px] font-medium text-red-500">{errors.customerName.message}</p>
                      )}
                    </div>

                    {/* 3. Mobile Number */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        {...register("mobile")}
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        }}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                          errors.mobile
                            ? "border-red-400 focus:border-red-500"
                            : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        }`}
                      />
                      {errors.mobile && (
                        <p className="text-[11px] font-medium text-red-500">{errors.mobile.message}</p>
                      )}
                    </div>

                    {/* 4. Application Number */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Application Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        placeholder="e.g. APP-10293"
                        {...register("applicationNo")}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                          errors.applicationNo
                            ? "border-red-400 focus:border-red-500"
                            : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        }`}
                      />
                      {errors.applicationNo && (
                        <p className="text-[11px] font-medium text-red-500">{errors.applicationNo.message}</p>
                      )}
                    </div>

                    {/* 5. Loan Account Number */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Loan Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        placeholder="e.g. LA-4839201"
                        {...register("loanAccountNo")}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                          errors.loanAccountNo
                            ? "border-red-400 focus:border-red-500"
                            : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        }`}
                      />
                      {errors.loanAccountNo && (
                        <p className="text-[11px] font-medium text-red-500">{errors.loanAccountNo.message}</p>
                      )}
                    </div>

                    {/* 6. Sanction Amount */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Sanction Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          ₹
                        </span>
                        <input
                          type="text"
                          disabled={isSubmitting}
                          inputMode="numeric"
                          placeholder="e.g. 500000"
                          {...register("sanctionAmount")}
                          onInput={(e) => {
                            e.target.value = e.target.value.replace(/[^\d]/g, "");
                          }}
                          className={`w-full rounded-md border bg-white pl-7 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                            errors.sanctionAmount
                              ? "border-red-400 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        />
                      </div>
                      {errors.sanctionAmount && (
                        <p className="text-[11px] font-medium text-red-500">{errors.sanctionAmount.message}</p>
                      )}
                    </div>
                  </div>

                  {/* 7. Sanction Letter File Upload */}
                  <div className="space-y-1 pt-1">
                    <label className="block text-xs font-medium text-slate-600">
                      Sanction Letter <span className="text-red-500">*</span>
                    </label>

                    {!sanctionFile ? (
                      <label
                        className={`flex flex-col items-center justify-center p-5 border border-dashed rounded-md cursor-pointer transition-colors ${
                          errors.sanctionLetter
                            ? "border-red-300 bg-red-50/20"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          className="hidden"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 mb-1.5 border border-slate-200">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-slate-800">
                          Upload Sanction Letter
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          PDF, JPG, or PNG up to 5 MB
                        </p>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50/60 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-white shrink-0 font-semibold text-xs">
                            ✓
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-800 block">
                              Sanction Letter Selected
                            </span>
                            <p className="font-medium text-slate-900 truncate mt-0.5">
                              {sanctionFile.name}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer shrink-0 ml-3 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {errors.sanctionLetter && (
                      <p className="text-[11px] font-medium text-red-500">{errors.sanctionLetter.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <CustomerStep2
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  clearErrors={clearErrors}
                  control={control}
                  disabled={isSubmitting}
                />
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <CustomerStep3
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  disabled={isSubmitting}
                />
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!isSubmittedSuccess && (
          <div className="flex items-center justify-between border-t border-slate-200/80 px-5 sm:px-6 py-3.5 bg-slate-50/50 shrink-0">
            <div className="text-xs font-medium text-slate-500">
              Step {currentStep} of 3
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Previous
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleNextStep1}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleNextStep2}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="submit"
                  form="customer-registration-form"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
