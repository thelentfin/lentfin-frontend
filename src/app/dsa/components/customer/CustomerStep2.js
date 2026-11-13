"use client";

import React from "react";
import { useWatch } from "react-hook-form";

export default function CustomerStep2({
  register,
  errors,
  watch,
  setValue,
  clearErrors,
  control,
  disabled = false,
  selectedPayoutOption = null,
  sanctionAmount = "",
}) {
  // Subscribe to form state updates via useWatch for instant re-rendering
  const watchedDisbursementType = useWatch({ control, name: "disbursementType" });
  const watchedDisbursementAmount = useWatch({ control, name: "disbursementAmount" });
  const watchedPddCleared = useWatch({ control, name: "pddCleared" });

  const disbursementType = watchedDisbursementType || (typeof watch === "function" ? watch("disbursementType") : "Full");
  const pddCleared = watchedPddCleared || (typeof watch === "function" ? watch("pddCleared") : "no");

  const effectiveDisbursedAmount =
    String(disbursementType).toUpperCase() === "FULL"
      ? Number(String(sanctionAmount || "0").replace(/,/g, ""))
      : Number(String(watchedDisbursementAmount || "0").replace(/,/g, ""));

  const payoutRate = selectedPayoutOption?.payout_percentage
    ? parseFloat(selectedPayoutOption.payout_percentage)
    : 0;

  const calculatedCommission =
    effectiveDisbursedAmount > 0 && payoutRate > 0
      ? (effectiveDisbursedAmount * payoutRate) / 100
      : 0;

  const handleDisbursementTypeChange = (type) => {
    setValue("disbursementType", type, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });

    if (String(type).toUpperCase() === "FULL") {
      setValue("disbursementAmount", "", { shouldValidate: true });
      if (typeof clearErrors === "function") {
        clearErrors("disbursementAmount");
      }
    }
  };


  const handlePddClearedChange = (val) => {
    setValue("pddCleared", val, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const isPartDisbursement = String(disbursementType).toUpperCase() === "PART";

  return (
    <div className="space-y-4">
      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Disbursement Type (Full / Part) */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">
            Disbursement Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5 max-w-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleDisbursementTypeChange("Full")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-medium border transition-colors cursor-pointer ${
                String(disbursementType).toUpperCase() === "FULL"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Full Disbursement
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleDisbursementTypeChange("Part")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-medium border transition-colors cursor-pointer ${
                String(disbursementType).toUpperCase() === "PART"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Part Disbursement
            </button>
          </div>
          {errors.disbursementType && (
            <p className="text-[11px] font-medium text-red-500">{errors.disbursementType.message}</p>
          )}
        </div>

        {/* 1b. Conditional Partial Disbursement Amount Input */}
        {isPartDisbursement && (
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">
              Disbursement Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                ₹
              </span>
              <input
                type="text"
                disabled={disabled}
                inputMode="numeric"
                placeholder="Enter partial disbursement amount"
                {...register("disbursementAmount")}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^\d]/g, "");
                }}
                className={`w-full rounded-md border bg-white pl-7 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                  errors.disbursementAmount
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                }`}
              />
            </div>
            {errors.disbursementAmount && (
              <p className="text-[11px] font-medium text-red-500">
                {errors.disbursementAmount.message}
              </p>
            )}
          </div>
        )}

        {/* Live Commission Auto-Calculation Card (Counted on Disbursed Amount) */}
        {selectedPayoutOption && (
          <div className="md:col-span-2 rounded-lg border border-purple-200/90 bg-gradient-to-r from-purple-50/90 via-purple-50/50 to-white p-3.5 sm:p-4 flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-purple-900">
                  Commission Auto-Calculation
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                  {selectedPayoutOption.option_label || "Standard"} — {payoutRate.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Counted on Disbursed Amount:{" "}
                <strong className="text-slate-800 font-semibold font-mono">
                  {effectiveDisbursedAmount > 0
                    ? `₹ ${effectiveDisbursedAmount.toLocaleString("en-IN")}`
                    : "₹ 0"}
                </strong>
                <span className="text-slate-400 ml-1">
                  ({String(disbursementType).toUpperCase() === "FULL" ? "Full Disbursement" : "Part Disbursement"})
                </span>
              </p>
            </div>
            <div className="text-right shrink-0 pl-3">
              <span className="text-[10px] uppercase font-semibold text-purple-600 block tracking-wider">
                Payout Amount
              </span>
              <span className="text-base sm:text-lg font-bold text-purple-900 font-mono">
                ₹ {calculatedCommission.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* 2. Disbursement Date */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Disbursement Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            disabled={disabled}
            {...register("disbursementDate")}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors tabular-nums ${
              errors.disbursementDate
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.disbursementDate && (
            <p className="text-[11px] font-medium text-red-500">{errors.disbursementDate.message}</p>
          )}
        </div>

        {/* 3. Rate (%) */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Rate (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            inputMode="decimal"
            placeholder="e.g. 8.50"
            {...register("rate")}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
              errors.rate
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.rate && (
            <p className="text-[11px] font-medium text-red-500">{errors.rate.message}</p>
          )}
        </div>

        {/* 4. Processing Fee (PF) */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            PF (Processing Fee) ₹ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            placeholder="e.g. 5000"
            {...register("pf")}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^\d]/g, "");
            }}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
              errors.pf
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.pf && (
            <p className="text-[11px] font-medium text-red-500">{errors.pf.message}</p>
          )}
        </div>

        {/* 5. Tenure (Months) */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Tenure (Months) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            placeholder="e.g. 60"
            {...register("tenure")}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^\d]/g, "");
            }}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
              errors.tenure
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.tenure && (
            <p className="text-[11px] font-medium text-red-500">{errors.tenure.message}</p>
          )}
        </div>

        {/* 6. Insurance Amount */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Insurance Amount ₹ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            placeholder="e.g. 12000"
            {...register("insuranceAmount")}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^\d]/g, "");
            }}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
              errors.insuranceAmount
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.insuranceAmount && (
            <p className="text-[11px] font-medium text-red-500">{errors.insuranceAmount.message}</p>
          )}
        </div>

        {/* 7. Cheque Handover Date */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Cheque Handover Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            disabled={disabled}
            {...register("chequeHandoverDate")}
            className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors tabular-nums ${
              errors.chequeHandoverDate
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            }`}
          />
          {errors.chequeHandoverDate && (
            <p className="text-[11px] font-medium text-red-500">{errors.chequeHandoverDate.message}</p>
          )}
        </div>

        {/* 8. PDD Cleared (Yes / No) Radio Selection */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">
            PDD Cleared <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-5 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="pddCleared"
                value="yes"
                checked={pddCleared === "yes"}
                onChange={() => handlePddClearedChange("yes")}
                disabled={disabled}
                className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800">Yes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="pddCleared"
                value="no"
                checked={pddCleared === "no"}
                onChange={() => handlePddClearedChange("no")}
                disabled={disabled}
                className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800">No</span>
            </label>
          </div>
          {errors.pddCleared && (
            <p className="text-[11px] font-medium text-red-500">{errors.pddCleared.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
