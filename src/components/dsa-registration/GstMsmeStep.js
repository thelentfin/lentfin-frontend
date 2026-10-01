"use client";

import React, { useEffect } from "react";
import { useWatch } from "react-hook-form";
import { FileInputField } from "./PersonalKycStep";

export default function GstMsmeStep({ register, errors, setValue, watch, control }) {
  const watchedGstToggle = useWatch({ control, name: "hasGstToggle", defaultValue: false });
  const watchedMsmeToggle = useWatch({ control, name: "hasMsmeToggle", defaultValue: false });
  const constitutionType = useWatch({ control, name: "constitutionType", defaultValue: "" });

  const isPrivateLimited = constitutionType === "Private Limited";
  const isGstToggleOn = isPrivateLimited || Boolean(watchedGstToggle);
  const isMsmeToggleOn = Boolean(watchedMsmeToggle);

  // If Private Limited, automatically ensure hasGstToggle is set to true
  useEffect(() => {
    if (isPrivateLimited && setValue) {
      setValue("hasGstToggle", true, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [isPrivateLimited, setValue]);

  const handleGstToggleChange = () => {
    // Cannot turn off toggle if Private Limited
    if (isPrivateLimited) return;

    const nextVal = !isGstToggleOn;
    if (setValue) {
      setValue("hasGstToggle", nextVal, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      if (!nextVal) {
        setValue("gstNumber", "");
        setValue("gstCertificate", null);
      }
    }
  };

  const handleMsmeToggleChange = () => {
    const nextVal = !isMsmeToggleOn;
    if (setValue) {
      setValue("hasMsmeToggle", nextVal, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      if (!nextVal) {
        setValue("msmeNumber", "");
        setValue("udyamCertificate", null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-100/80 text-[#B063FF] flex items-center justify-center text-xs font-extrabold">
            4
          </span>
          GST & MSME Details
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Provide your GST and MSME / Udyam registration details if applicable.
        </p>
      </div>

      {/* 2-Column Layout: Left side GST, Right side MSME */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* ─── LEFT COLUMN: GST DETAILS ─── */}
        <div className="space-y-4">
          {/* GST Question & Toggle Card */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              isGstToggleOn
                ? "bg-purple-50/70 border-purple-200 shadow-2xs"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 block leading-snug select-none">
                  Do you want to provide GST details?
                </span>
                {isPrivateLimited && (
                  <span className="text-[10px] font-semibold bg-purple-100 text-[#B063FF] border border-purple-200 px-2 py-0.5 rounded-md">
                    Mandatory
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight select-none">
                {isPrivateLimited
                  ? "GST details are mandatory for Private Limited."
                  : isGstToggleOn
                  ? "GST details enabled for this registration."
                  : "GST details are optional."}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              id="gst-toggle"
              aria-checked={isGstToggleOn}
              aria-label="Provide GST details"
              disabled={isPrivateLimited}
              onClick={handleGstToggleChange}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#B063FF] focus:ring-offset-2 touch-manipulation ${
                isPrivateLimited ? "cursor-not-allowed opacity-90" : "cursor-pointer active:scale-95"
              } ${isGstToggleOn ? "bg-[#B063FF]" : "bg-slate-300"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isGstToggleOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* GST TOGGLE IS OFF — Status note */}
          {!isGstToggleOn && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 text-[10px] font-bold">
                ✓
              </div>
              <span>No GST details required.</span>
            </div>
          )}

          {/* GST TOGGLE IS ON — Inputs */}
          {isGstToggleOn && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              {/* GST Number Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    {...register("gstNumber")}
                    className={`w-full uppercase bg-slate-50 border ${
                      errors?.gstNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-[#B063FF]"
                    } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  />
                </div>
                {errors?.gstNumber && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.gstNumber.message}</p>
                )}
              </div>

              {/* GST Certificate Upload */}
              <FileInputField
                label="GST Certificate"
                name="gstCertificate"
                accept=".pdf,.jpg,.jpeg,.png"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                required={true}
                fileType="identity"
              />
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: MSME / UDYAM DETAILS ─── */}
        <div className="space-y-4">
          {/* MSME Question & Toggle Card */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              isMsmeToggleOn
                ? "bg-purple-50/70 border-purple-200 shadow-2xs"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 block leading-snug select-none">
                Do you have MSME / Udyam Registration?
              </span>
              <p className="text-[11px] text-slate-500 leading-tight select-none">
                {isMsmeToggleOn
                  ? "MSME / Udyam details enabled."
                  : "MSME / Udyam details are optional."}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              id="msme-toggle"
              aria-checked={isMsmeToggleOn}
              aria-label="Provide MSME details"
              onClick={handleMsmeToggleChange}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#B063FF] focus:ring-offset-2 cursor-pointer active:scale-95 touch-manipulation ${
                isMsmeToggleOn ? "bg-[#B063FF]" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isMsmeToggleOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* MSME TOGGLE IS OFF — Status note */}
          {!isMsmeToggleOn && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 text-[10px] font-bold">
                ✓
              </div>
              <span>No MSME certificate required.</span>
            </div>
          )}

          {/* MSME TOGGLE IS ON — Inputs */}
          {isMsmeToggleOn && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              {/* MSME Number Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  MSME / Udyam Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="e.g. UDYAM-GJ-01-0012345"
                    {...register("msmeNumber")}
                    className={`w-full uppercase bg-slate-50 border ${
                      errors?.msmeNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-[#B063FF]"
                    } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  />
                </div>
                {errors?.msmeNumber && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.msmeNumber.message}</p>
                )}
              </div>

              {/* MSME Certificate Upload */}
              <FileInputField
                label="MSME / Udyam Certificate"
                name="udyamCertificate"
                accept=".pdf,.jpg,.jpeg,.png"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                required={true}
                fileType="identity"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
