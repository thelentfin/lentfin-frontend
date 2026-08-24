"use client";

import React from "react";
import { PAYMENT_TYPE_OPTIONS } from "@/schemas/customerRegistrationSchema";

export default function CustomerStep3({
  register,
  errors,
  watch,
  setValue,
}) {
  const selectedPaymentType = watch("paymentType");
  const activePaymentInfo = PAYMENT_TYPE_OPTIONS.find(
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
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("smMobile")}
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
              placeholder="e.g. anil.sm@bank.com"
              {...register("smEmail")}
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
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("asmMobile")}
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
              placeholder="e.g. vikram.asm@bank.com"
              {...register("asmEmail")}
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
            Payment Type
          </h4>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Select Payment Option <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              {...register("paymentType")}
              className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                errors.paymentType
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              }`}
            >
              <option value="">Select Payment Type</option>
              {PAYMENT_TYPE_OPTIONS.map((opt) => (
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
        </div>

        {/* Dynamic Payment Summary Info Box */}
        {activePaymentInfo && (
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-xs">
                {activePaymentInfo.title}
              </span>
              <span className="font-medium text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] tabular-nums">
                {activePaymentInfo.rate}
              </span>
            </div>
            <p className="text-slate-600 font-normal text-[11px]">
              {activePaymentInfo.subtext}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
