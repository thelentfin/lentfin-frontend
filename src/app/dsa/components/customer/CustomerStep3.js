"use client";

import React, { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { PAYMENT_TYPE_OPTIONS } from "@/schemas/customerRegistrationSchema";

export default function CustomerStep3({
  register,
  errors,
  watch,
  setValue,
  trigger,
  control,
  disabled = false,
  selectedCompany = null,
  selectedSubDsa = null,
  disbursedAmount = 0,
}) {
  const watchedPaymentType = useWatch({ control, name: "paymentType" });
  const watchedSubDsaPct = useWatch({ control, name: "subDsaPercentage" });
  const watchedSubDsaIdVal = useWatch({ control, name: "subDsaId" });

  const selectedPaymentType =
    watchedPaymentType !== undefined
      ? watchedPaymentType
      : typeof watch === "function"
      ? watch("paymentType")
      : "";

  const watchedSubDsaPercentage =
    watchedSubDsaPct !== undefined
      ? watchedSubDsaPct
      : typeof watch === "function"
      ? watch("subDsaPercentage")
      : "";

  const watchedSubDsaId =
    watchedSubDsaIdVal !== undefined
      ? watchedSubDsaIdVal
      : typeof watch === "function"
      ? watch("subDsaId")
      : "";

  const paymentOptions = useMemo(() => {
    const spotRate =
      selectedCompany?.spot_payment_percentage != null &&
      !isNaN(Number(selectedCompany.spot_payment_percentage))
        ? Number(selectedCompany.spot_payment_percentage)
        : 0.85;

    const standardDays =
      selectedCompany?.standard_payment_days != null &&
      !isNaN(Number(selectedCompany.standard_payment_days))
        ? Number(selectedCompany.standard_payment_days)
        : 5;

    const fiveDaysRate =
      selectedCompany?.five_days_payment_percentage != null &&
      !isNaN(Number(selectedCompany.five_days_payment_percentage))
        ? Number(selectedCompany.five_days_payment_percentage)
        : 0.90;

    return [
      {
        id: "SPOT_48_HOURS",
        label: `Spot Payment — Within 48 Hours — ${spotRate}%`,
        title: "Spot Payment",
        subtext: "Within 48 Hours",
        rate: `${spotRate}% of Loan Amount`,
      },
      {
        id: "AFTER_5_DAYS",
        label: `Payment After ${standardDays} Days — ${fiveDaysRate}%`,
        title: `Payment After ${standardDays} Days`,
        subtext: `Processed after ${standardDays} business days`,
        rate: `${fiveDaysRate}% of Loan Amount`,
      },
    ];
  }, [selectedCompany]);

  const activePaymentInfo = paymentOptions.find(
    (opt) => opt.id === selectedPaymentType
  );

  return (
    <div className="space-y-4">
      {/* SECTION 1 — Sales Manager (SM) Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            1
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Sales Manager (SM)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SM Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              SM Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              placeholder="e.g. Anil Kumar"
              {...register("smName")}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.smName
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.smName && (
              <p className="text-[11px] font-medium text-red-500">{errors.smName.message}</p>
            )}
          </div>

          {/* SM Mobile */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              SM Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("smMobile", {
                onChange: () => {
                  if (typeof trigger === "function" && watch("asmMobile")) {
                    trigger(["asmMobile"]);
                  }
                },
              })}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
              }}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                errors.smMobile
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.smMobile && (
              <p className="text-[11px] font-medium text-red-500">{errors.smMobile.message}</p>
            )}
          </div>

          {/* SM Email */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              SM Email ID <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              disabled={disabled}
              placeholder="e.g. anil.sm@bank.com"
              {...register("smEmail", {
                onChange: () => {
                  if (typeof trigger === "function" && watch("asmEmail")) {
                    trigger(["asmEmail"]);
                  }
                },
              })}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.smEmail
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.smEmail && (
              <p className="text-[11px] font-medium text-red-500">{errors.smEmail.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 — Area Sales Manager (ASM) Details */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            2
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Area Sales Manager (ASM)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ASM Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              ASM Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              placeholder="e.g. Vikram Mehta"
              {...register("asmName")}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.asmName
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.asmName && (
              <p className="text-[11px] font-medium text-red-500">{errors.asmName.message}</p>
            )}
          </div>

          {/* ASM Mobile */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              ASM Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("asmMobile", {
                onChange: () => {
                  if (typeof trigger === "function" && watch("smMobile")) {
                    trigger(["asmMobile"]);
                  }
                },
              })}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
              }}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                errors.asmMobile
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.asmMobile && (
              <p className="text-[11px] font-medium text-red-500">{errors.asmMobile.message}</p>
            )}
          </div>

          {/* ASM Email */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              ASM Email ID <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              disabled={disabled}
              placeholder="e.g. vikram.asm@bank.com"
              {...register("asmEmail", {
                onChange: () => {
                  if (typeof trigger === "function" && watch("smEmail")) {
                    trigger(["asmEmail"]);
                  }
                },
              })}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.asmEmail
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            />
            {errors.asmEmail && (
              <p className="text-[11px] font-medium text-red-500">{errors.asmEmail.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3 — Spot Payment / Payment Type Selection */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            3
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Payment Type & Commission
          </h4>
        </div>

        {(() => {
          const hasSubDsa = Boolean(selectedSubDsa || watchedSubDsaId);
          const subDsaName = selectedSubDsa?.name || "Referral Partner";

          const baseRate =
            selectedPaymentType === "SPOT_48_HOURS"
              ? selectedCompany?.spot_payment_percentage != null
                ? Number(selectedCompany.spot_payment_percentage)
                : 0.85
              : selectedPaymentType === "AFTER_5_DAYS"
              ? selectedCompany?.five_days_payment_percentage != null
                ? Number(selectedCompany.five_days_payment_percentage)
                : 0.90
              : 0;

          const cleanDisbursedAmt = (() => {
            const raw = String(disbursedAmount || 0).replace(/,/g, "").trim();
            const num = Number(raw);
            return !isNaN(num) && num > 0 ? num : 0;
          })();

          const subDsaRateNum = Number(watchedSubDsaPercentage) || 0;
          const grossCommission =
            cleanDisbursedAmt > 0 && baseRate > 0
              ? (cleanDisbursedAmt * baseRate) / 100
              : 0;
          const subDsaAmount =
            cleanDisbursedAmt > 0 && subDsaRateNum > 0
              ? (cleanDisbursedAmt * subDsaRateNum) / 100
              : 0;
          const overrideRate =
            baseRate > 0
              ? Math.max(0, Math.round((baseRate - subDsaRateNum) * 100) / 100)
              : 0;
          const overrideAmount =
            hasSubDsa
              ? Math.max(0, Math.round((grossCommission - subDsaAmount) * 100) / 100)
              : grossCommission;

          const formatCurrency = (val) => {
            const n = Number(val) || 0;
            return `₹${n.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
            })}`;
          };

          if (hasSubDsa) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* 1st Field (Left Column): Base Payment Option Dropdown */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    Select Base Payment Option <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register("paymentType")}
                      disabled={disabled}
                      className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                        errors.paymentType
                          ? "border-red-400 focus:border-red-500"
                          : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      }`}
                    >
                      <option value="">Select Payment Type</option>
                      {paymentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.paymentType && (
                    <p className="text-[11px] font-medium text-red-500">{errors.paymentType.message}</p>
                  )}

                  {/* Under Dropdown: DSA Commission in plain text */}
                  {selectedPaymentType && cleanDisbursedAmt > 0 && (
                    <p className="text-xs text-slate-700 font-normal pt-1">
                      DSA Commission: <span className="font-semibold text-slate-900">{formatCurrency(overrideAmount)}</span>
                      {baseRate > 0 && subDsaRateNum > 0 && (
                        <span className="text-slate-500 ml-1 text-[11px]">({overrideRate}% net)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* 2nd Field (Right Column): Sub-DSA Commission % Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">
                      Referral Agent Share (%) —{" "}
                      <span className="text-purple-700 font-semibold">{subDsaName}</span>{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    {baseRate > 0 && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        Base: {baseRate}%
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={baseRate || undefined}
                      disabled={disabled}
                      placeholder="e.g. 0.85"
                      onWheel={(e) => e.target.blur()}
                      {...register("subDsaPercentage")}
                      className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        errors.subDsaPercentage
                          ? "border-red-400 focus:border-red-500"
                          : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      }`}
                    />
                  </div>
                  {errors.subDsaPercentage && (
                    <p className="text-[11px] font-medium text-red-500">
                      {errors.subDsaPercentage.message}
                    </p>
                  )}

                  {/* Under Input Field: Sub-DSA Amount in plain text */}
                  {subDsaRateNum > 0 && cleanDisbursedAmt > 0 && (
                    <p className="text-xs text-slate-700 font-normal pt-1">
                      Sub-DSA Amount: <span className="font-semibold text-purple-700">{formatCurrency(subDsaAmount)}</span>
                      <span className="text-slate-500 ml-1 text-[11px]">({subDsaRateNum}%)</span>
                    </p>
                  )}

                  {subDsaRateNum > baseRate && baseRate > 0 && (
                    <p className="text-[11px] text-red-600 font-medium pt-0.5">
                      Cannot exceed base rate ({baseRate}%)
                    </p>
                  )}
                </div>
              </div>
            );
          }

          {/* Direct Application (Single Field) */}
          return (
            <div className="space-y-1 max-w-md">
              <label className="block text-xs font-medium text-slate-600">
                Select Base Payment Option <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  {...register("paymentType")}
                  disabled={disabled}
                  className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                    errors.paymentType
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  }`}
                >
                  <option value="">Select Payment Type</option>
                  {paymentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.paymentType && (
                <p className="text-[11px] font-medium text-red-500">{errors.paymentType.message}</p>
              )}

              {/* Under Dropdown: DSA Commission in plain text */}
              {selectedPaymentType && cleanDisbursedAmt > 0 && (
                <p className="text-xs text-slate-700 font-normal pt-1">
                  DSA Commission: <span className="font-semibold text-slate-900">{formatCurrency(grossCommission)}</span>
                  <span className="text-slate-500 ml-1 text-[11px]">({baseRate}%)</span>
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
