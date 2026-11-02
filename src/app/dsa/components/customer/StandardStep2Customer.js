"use client";

import React, { useRef } from "react";
import { useWatch } from "react-hook-form";
import { getFileFromVal } from "@/schemas/customerRegistrationSchema";

export default function StandardStep2Customer({
  register,
  errors,
  control,
  watch,
  setValue,
  clearErrors,
  disabled = false,
  selectedPayoutOption = null,
  isDraggingSanction = false,
  handleSanctionDragOver,
  handleSanctionDragLeave,
  handleSanctionDrop,
  handleRemoveFile,
}) {
  const sanctionInputRef = useRef(null);

  // useWatch subscribes to form updates for instant re-rendering on upload/remove
  const watchedSanctionLetter = useWatch({
    control,
    name: "sanctionLetter",
  });
  const selectedSanctionLetter =
    watchedSanctionLetter !== undefined
      ? watchedSanctionLetter
      : watch
      ? watch("sanctionLetter")
      : null;
  const sanctionFile = getFileFromVal(selectedSanctionLetter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Customer Name */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
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

        {/* 2. Application Number */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Application Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
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

        {/* 3. Loan Account Number */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Loan Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
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

        {/* 4. Sanction Amount */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">
            Sanction Amount (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              ₹
            </span>
            <input
              type="text"
              disabled={disabled}
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

          {/* Commission preview indicator */}
          {selectedPayoutOption && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded bg-purple-50/70 border border-purple-200/70 text-[11px] text-purple-800 flex items-center justify-between">
              <span>
                Payout Slab: <strong>{selectedPayoutOption.option_label} ({Number(selectedPayoutOption.payout_percentage).toFixed(2)}%)</strong>
              </span>
              <span className="text-purple-600 font-medium">
                Calculated on Disbursed Amount in Step 3
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 6. Sanction Letter File Upload */}
      <div className="space-y-1 pt-1">
        <label className="block text-xs font-medium text-slate-600">
          Sanction Letter <span className="text-slate-400 font-normal">(Optional)</span>
        </label>

        {!sanctionFile ? (
          <label
            onDragOver={handleSanctionDragOver}
            onDragLeave={handleSanctionDragLeave}
            onDrop={handleSanctionDrop}
            className={`flex flex-col items-center justify-center p-5 border border-dashed rounded-md cursor-pointer transition-colors ${
              isDraggingSanction
                ? "border-2 border-[#B063FF] bg-purple-50/60 shadow-md ring-2 ring-[#B063FF]/30"
                : errors.sanctionLetter
                ? "border-red-300 bg-red-50/20"
                : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400"
            }`}
          >
            <input
              ref={sanctionInputRef}
              type="file"
              accept=".pdf, .jpg, .jpeg, .png"
              disabled={disabled}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setValue("sanctionLetter", e.target.files[0], {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  if (errors.sanctionLetter) {
                    clearErrors("sanctionLetter");
                  }
                }
              }}
            />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <p className="text-xs font-semibold text-slate-800">
              Drag & Drop Sanction Letter here, or{" "}
              <span className="text-blue-600 underline">Browse File</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports PDF, JPG, PNG (Max 5MB)
            </p>
          </label>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 text-blue-700 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="truncate text-xs">
                <span className="font-semibold text-slate-700 block">
                  Sanction Document Attached
                </span>
                <p className="font-medium text-slate-900 truncate mt-0.5">
                  {sanctionFile.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                if (e) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                if (sanctionInputRef.current) {
                  sanctionInputRef.current.value = "";
                }
                setValue("sanctionLetter", null, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                if (typeof handleRemoveFile === "function") {
                  handleRemoveFile(e);
                }
              }}
              disabled={disabled}
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
  );
}
