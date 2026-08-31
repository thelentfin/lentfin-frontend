"use client";

import React from "react";
import { useWatch } from "react-hook-form";
import { getFileFromVal } from "@/schemas/customerRegistrationSchema";

export default function CustomerStep2({
  register,
  errors,
  watch,
  setValue,
  clearErrors,
  control,
  disabled = false,
}) {
  // Subscribe to form state updates via useWatch for instant re-rendering
  const watchedDisbursementType = useWatch({ control, name: "disbursementType" });
  const watchedPddCleared = useWatch({ control, name: "pddCleared" });
  const watchedPddDocument = useWatch({ control, name: "pddDocument" });

  const disbursementType = watchedDisbursementType || (typeof watch === "function" ? watch("disbursementType") : "Full");
  const pddCleared = watchedPddCleared || (typeof watch === "function" ? watch("pddCleared") : "no");
  const selectedPddDoc = watchedPddDocument || (typeof watch === "function" ? watch("pddDocument") : null);

  const pddFile = getFileFromVal(selectedPddDoc);

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

  const [isDraggingPdd, setIsDraggingPdd] = useState(false);

  const handlePddFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setValue("pddDocument", files, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }
  };

  const handlePddDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingPdd) setIsDraggingPdd(true);
  };

  const handlePddDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdd(false);
  };

  const handlePddDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdd(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setValue("pddDocument", files, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }
  };

  const handleRemovePddFile = (e) => {
    if (e) e.stopPropagation();
    setValue("pddDocument", null, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handlePddClearedChange = (val) => {
    setValue("pddCleared", val, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });

    if (val === "no") {
      setValue("pddDocument", null, { shouldValidate: true });
      if (typeof clearErrors === "function") {
        clearErrors("pddDocument");
      }
    }
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

      {/* 9. CONDITIONAL PDD DOCUMENT UPLOAD CARD */}
      {pddCleared === "yes" && (
        <div className="space-y-1 pt-1 border-t border-slate-200/80">
          <label className="block text-xs font-medium text-slate-600">
            PDD Document <span className="text-red-500">*</span>
          </label>

          {!pddFile ? (
            <label
              onDragOver={handlePddDragOver}
              onDragLeave={handlePddDragLeave}
              onDrop={handlePddDrop}
              className={`flex flex-col items-center justify-center p-5 border border-dashed rounded-md cursor-pointer transition-colors ${
                isDraggingPdd
                  ? "border-2 border-[#B063FF] bg-purple-50/60 shadow-md ring-2 ring-[#B063FF]/30"
                  : errors.pddDocument
                  ? "border-red-300 bg-red-50/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handlePddFileChange}
                disabled={disabled}
                className="hidden"
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 mb-1.5 border border-slate-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-800">
                {isDraggingPdd ? "Drop PDD Document Here" : "Upload PDD Document"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PDF, JPG, or PNG up to 5 MB
              </p>
            </label>
          ) : (
            <div
              onDragOver={handlePddDragOver}
              onDragLeave={handlePddDragLeave}
              onDrop={handlePddDrop}
              className={`flex items-center justify-between p-3 rounded-md border text-xs transition-colors ${
                isDraggingPdd
                  ? "border-2 border-[#B063FF] bg-purple-50/60 shadow-md ring-2 ring-[#B063FF]/30"
                  : "bg-emerald-50/60 border-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-white shrink-0 font-semibold text-xs">
                  ✓
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-800 block">
                    PDD Document Selected
                  </span>
                  <p className="font-medium text-slate-900 truncate mt-0.5">
                    {pddFile.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemovePddFile}
                disabled={disabled}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer shrink-0 ml-3 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )}

          {errors.pddDocument && (
            <p className="text-[11px] font-medium text-red-500">{errors.pddDocument.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
