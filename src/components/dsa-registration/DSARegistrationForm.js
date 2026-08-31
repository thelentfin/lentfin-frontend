"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  fullDsaSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
} from "@/schemas/dsaSchema";
import { dsaService } from "@/services/dsaService";

import PersonalKycStep from "./PersonalKycStep";
import BankDetailsStep from "./BankDetailsStep";
import GstMsmeStep from "./GstMsmeStep";
import ConstitutionDocumentsStep from "./ConstitutionDocumentsStep";
import CompanyLocationStep from "./CompanyLocationStep";

const STEP_TITLES = [
  { id: 1, label: "Personal & KYC" },
  { id: 2, label: "Bank Details" },
  { id: 3, label: "GST / MSME" },
  { id: 4, label: "Constitution" },
  { id: 5, label: "Company & Location" },
];

export default function DSARegistrationForm({ onSuccessState }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    getValues,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(fullDsaSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      panNumber: "",
      panCardDoc: null,
      aadhaarNumber: "",
      aadhaarCardDoc: null,
      photo: null,

      bankAccountName: "",
      accountNumber: "",
      ifscCode: "",

      hasGstToggle: false,
      gstNumber: "",
      msmeCertificate: null,
      gstCertificate: null,

      constitutionType: "",
      partnershipDeed: null,
      firmPanDoc: null,

      companyName: "",
      companyNameText: "",
      location: "",
      locationText: "",
    },
  });

  // Validate only the active step before moving to Next step
  const handleNextStep = async () => {
    setSubmitError("");
    const currentValues = getValues();
    let isStepValid = false;

    try {
      if (currentStep === 1) {
        step1Schema.parse(currentValues);
        isStepValid = true;
      } else if (currentStep === 2) {
        step2Schema.parse(currentValues);
        isStepValid = true;
      } else if (currentStep === 3) {
        step3Schema.parse(currentValues);
        isStepValid = true;
      } else if (currentStep === 4) {
        step4Schema.parse(currentValues);
        isStepValid = true;
      }
    } catch (err) {
      // Trigger RHF field validation so error messages render on current step fields
      if (currentStep === 1) {
        await trigger([
          "fullName",
          "email",
          "mobile",
          "panNumber",
          "panCardDoc",
          "aadhaarNumber",
          "aadhaarCardDoc",
          "photo",
        ]);
      } else if (currentStep === 2) {
        await trigger(["bankAccountName", "accountNumber", "ifscCode"]);
      } else if (currentStep === 3) {
        await trigger(["hasGstToggle", "gstNumber", "msmeCertificate", "gstCertificate"]);
      } else if (currentStep === 4) {
        await trigger([
          "constitutionType",
          "partnershipDeed",
          "firmPanDoc",
        ]);
      }
      return;
    }

    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handlePrevStep = () => {
    setSubmitError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data) => {
    setSubmitError("");

    // Validate step 5
    try {
      step5Schema.parse({
        companyName: data.companyName,
        companyNameText: data.companyNameText,
        location: data.location,
        locationText: data.locationText,
      });
    } catch (err) {
      await trigger(["companyName", "location"]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await dsaService.registerDSA(data);

      if (response && response.status) {
        setIsSuccess(true);
        if (typeof onSuccessState === "function") {
          onSuccessState(true);
        }
        setSuccessData(response);
        toast.success("DSA Registration submitted successfully!");
      } else {
        const errMsg =
          response?.message ||
          "Failed to complete registration. Please try again.";
        setSubmitError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg =
        err?.message || "An unexpected error occurred during registration.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // SUCCESS SCREEN — REDESIGNED FINTECH CONFIRMATION VIEW (Clean #F8FAFC Layout Fit)
  if (isSuccess) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-3.5 text-slate-800 animate-fadeIn my-auto py-1 px-1 sm:px-2">
        {/* 1. SUCCESS HERO & HEADINGS */}
        <div className="text-center space-y-1">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-md animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-emerald-100">
              <svg
                className="w-6 h-6 stroke-[2.5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            You're All Set! 🎉
          </h2>

          <div className="inline-block">
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-0.5 rounded-full shadow-2xs">
              Your DSA registration has been successfully submitted.
            </p>
          </div>

          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed font-normal">
            Thank you for completing your registration. Your application is now with our Corporate DSA team for verification.
          </p>
        </div>

        {/* 2. APPLICATION STATUS TRACKER CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
              Application Progress Tracker
            </h3>
            <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
              Under Review
            </span>
          </div>

          {/* Timeline Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative">
            {/* Stage 1: Submitted (Green) */}
            <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-2xs">
                  ✓
                </div>
                <span className="text-xs font-bold text-slate-900">1. Submitted</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight font-normal">
                Your application has been received
              </p>
            </div>

            {/* Stage 2: Under Review */}
            <div className="bg-white rounded-xl p-2.5 border border-slate-900 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] shrink-0 shadow-2xs">
                  <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-900">2. Under Review</span>
              </div>
              <p className="text-[11px] text-slate-600 font-normal leading-tight">
                Our team is reviewing your application
              </p>
            </div>

            {/* Stage 3: Approved */}
            <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-200/80 flex flex-col justify-between opacity-75">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-bold shrink-0">
                  3
                </div>
                <span className="text-xs font-semibold text-slate-500">3. Approved</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight font-normal">
                You will be notified once approved
              </p>
            </div>
          </div>
        </div>

        {/* 3. WHAT HAPPENS NEXT? SECTION */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
            What Happens Next?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Card 01 */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  01
                </span>
                <span className="text-base">📥</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Application Submitted
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-normal">
                Your details and documents have been securely received.
              </p>
            </div>

            {/* Card 02 */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  02
                </span>
                <span className="text-base">🛡️</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Document Verification
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-normal">
                Our Corporate DSA team will carefully review your application.
              </p>
            </div>

            {/* Card 03 */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  03
                </span>
                <span className="text-base">🔑</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Account Activation
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-normal">
                Once approved, your DSA login credentials will be sent to your registered email.
              </p>
            </div>
          </div>
        </div>

        {/* 4. EMAIL NOTIFICATION BANNER */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3.5 text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs text-sm">
            📧
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 text-xs">
              Keep an eye on your email
            </h4>
            <p className="text-slate-600 text-[11px] leading-snug font-normal">
              We will notify you about your application status or if any additional information is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:h-full overflow-visible md:overflow-hidden">
      {/* Step Indicator Header */}
      <div className="mb-3 sm:mb-4 shrink-0 px-0.5 sm:px-1.5">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Step {currentStep} of 5
          </span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-none text-right">
            {STEP_TITLES[currentStep - 1].label}
          </span>
        </div>

        {/* Progress Bar (5-Segment Active Track representing current step) */}
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 h-1.5 sm:h-2 w-full mb-2.5 sm:mb-3">
          {STEP_TITLES.map((step) => {
            const isActive = step.id <= currentStep;
            return (
              <div
                key={step.id}
                className={`h-full rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-blue-600 shadow-xs shadow-blue-500/20"
                    : "bg-slate-100"
                }`}
              />
            );
          })}
        </div>

        {/* Step Badges (Hidden on mobile, visible on sm desktop) */}
        <div className="hidden sm:grid grid-cols-5 gap-1 sm:gap-2 mt-2 sm:mt-3 text-center">
          {STEP_TITLES.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                        ? "bg-blue-600 text-white ring-2 sm:ring-4 ring-blue-100 shadow-md shadow-blue-500/20"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`hidden sm:block text-[11px] font-medium mt-1 truncate max-w-[110px] ${
                    isCurrent
                      ? "text-blue-600 font-bold"
                      : isCompleted
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div className="mb-3 mx-0.5 sm:mx-1.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 shrink-0">
          <svg
            className="w-4 h-4 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{submitError}</span>
        </div>
      )}

      {/* Main Multi-Step Form Content Area with Comfortable Left & Right Padding */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="flex flex-col md:flex-1 md:justify-between overflow-visible md:overflow-hidden"
      >
        <div className="md:flex-1 overflow-y-visible md:overflow-y-auto custom-scrollbar px-0 sm:px-3.5 py-1 space-y-3.5 sm:space-y-4">
          {currentStep === 1 && (
            <PersonalKycStep
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
            />
          )}

          {currentStep === 2 && (
            <BankDetailsStep register={register} errors={errors} />
          )}

          {currentStep === 3 && (
            <GstMsmeStep
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              control={control}
            />
          )}

          {currentStep === 4 && (
            <ConstitutionDocumentsStep
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              control={control}
            />
          )}

          {currentStep === 5 && (
            <CompanyLocationStep
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              control={control}
            />
          )}
        </div>

        {/* Navigation Buttons (Pinned at Bottom) */}
        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 gap-2 sm:gap-3 shrink-0 px-0.5 sm:px-1.5">
          {/* Previous Button */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>
          ) : (
            <div /> // Placeholder to keep Next right aligned
          )}

          {/* Next / Register Button */}
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 sm:px-6 py-2 sm:py-2.5 btn-primary text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              <span>Next</span>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className={`px-6 sm:px-8 py-2 sm:py-2.5 btn-primary text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] ${
                isLoading
                  ? "opacity-75 cursor-not-allowed"
                  : ""
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
