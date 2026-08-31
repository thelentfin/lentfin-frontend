"use client";

import React from "react";
import { useWatch } from "react-hook-form";
import { FileInputField } from "./PersonalKycStep";

export default function GstMsmeStep({ register, errors, setValue, watch, control }) {
  const watchedToggle = useWatch({ control, name: "hasGstToggle", defaultValue: false });
  const isGstToggleOn = Boolean(watchedToggle);

  const handleToggleChange = () => {
    const nextVal = !isGstToggleOn;
    if (setValue) {
      setValue("hasGstToggle", nextVal, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">
            3
          </span>
          GST & MSME Details
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Provide your GST registration and MSME certification if applicable.
        </p>
      </div>

      {/* Question & Toggle Card */}
      <div
        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          isGstToggleOn
            ? "bg-blue-50/70 border-blue-300 shadow-2xs"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="space-y-0.5 min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-900 block leading-snug select-none">
            Do you want to provide GST details?
          </span>
          <p className="text-[11px] text-slate-500 leading-tight select-none">
            {isGstToggleOn
              ? "GST details enabled for this registration."
              : "GST details are optional."}
          </p>
        </div>

        {/* ONLY THIS TOGGLE SWITCH IS CLICKABLE */}
        <button
          type="button"
          role="switch"
          id="gst-toggle"
          aria-checked={isGstToggleOn}
          aria-label="Provide GST details"
          onClick={handleToggleChange}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation active:scale-95 ${
            isGstToggleOn ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isGstToggleOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* TOGGLE IS OFF — Simple explanation */}
      {!isGstToggleOn && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 text-xs font-bold">
            ✓
          </div>
          <span>No GST details required. You can continue to the next step.</span>
        </div>
      )}

      {/* TOGGLE IS ON — Show GST Fields */}
      {isGstToggleOn && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          <p className="text-xs font-semibold text-slate-700">
            Please provide your GST information:
          </p>

          {/* 1. GST Number Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. GST Number <span className="text-red-500">*</span>
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
                  errors.gstNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
                } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors.gstNumber && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errors.gstNumber.message}</p>
            )}
          </div>

          {/* 2 & 3. Certificate Uploads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2. GST Certificate */}
            <FileInputField
              label="2. GST Certificate"
              name="gstCertificate"
              accept=".pdf,.jpg,.jpeg,.png"
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              required={true}
              fileType="certificate"
            />

            {/* 3. MSME Certificate */}
            <FileInputField
              label="3. MSME Certificate"
              name="msmeCertificate"
              accept=".pdf,.jpg,.jpeg,.png"
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              required={true}
              fileType="certificate"
            />
          </div>
        </div>
      )}
    </div>
  );
}
