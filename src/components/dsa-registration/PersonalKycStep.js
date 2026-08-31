"use client";

import React, { useState, useEffect } from "react";

/**
 * Helper component for file inputs with preview and clear options
 */
export function FileInputField({
  label,
  name,
  accept = ".pdf,.jpg,.jpeg,.png",
  register,
  errors,
  setValue,
  watch,
  required = false,
  fileType = "auto",
}) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const watchedValue = watch(name);

  // Sync selectedFileName with watched value
  useEffect(() => {
    if (watchedValue) {
      if (
        typeof window !== "undefined" &&
        typeof FileList !== "undefined" &&
        watchedValue instanceof FileList &&
        watchedValue[0]
      ) {
        setSelectedFileName(watchedValue[0].name);
      } else if (
        typeof window !== "undefined" &&
        typeof File !== "undefined" &&
        watchedValue instanceof File
      ) {
        setSelectedFileName(watchedValue.name);
      } else if (typeof watchedValue === "object" && watchedValue.name) {
        setSelectedFileName(watchedValue.name);
      } else if (typeof watchedValue === "string") {
        setSelectedFileName(watchedValue);
      }
    } else {
      setSelectedFileName("");
    }
  }, [watchedValue]);

  const fileRegistration = register(name);

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    setSelectedFileName(selectedFile.name);
    setValue(name, selectedFile, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleFileChange = (e) => {
    if (fileRegistration && typeof fileRegistration.onChange === "function") {
      fileRegistration.onChange(e);
    }
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFileName("");
    setValue(name, null, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    const el = document.getElementById(name);
    if (el) el.value = "";
  };

  const errorMsg = errors[name]?.message;
  const hasFile = Boolean(selectedFileName);

  // Determine type variant if set to auto
  const resolvedType =
    fileType !== "auto"
      ? fileType
      : name.toLowerCase().includes("photo") || name.toLowerCase().includes("passport")
      ? "photo"
      : name.toLowerCase().includes("pan") || name.toLowerCase().includes("aadhaar")
      ? "identity"
      : "certificate";

  const colorStyles =
    resolvedType === "photo"
      ? {
          borderSelected: "border-2 border-indigo-500 bg-indigo-50/80 text-indigo-950",
          iconBgSelected: "bg-indigo-600 text-white",
          textSelected: "text-indigo-700",
          borderNormal: "border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/60 hover:border-indigo-400 text-slate-700",
          iconBgNormal: "bg-indigo-100 text-indigo-600",
          buttonNormal: "text-indigo-600 bg-indigo-100/80",
        }
      : resolvedType === "certificate"
      ? {
          borderSelected: "border-2 border-emerald-500 bg-emerald-50/80 text-emerald-950",
          iconBgSelected: "bg-emerald-600 text-white",
          textSelected: "text-emerald-700",
          borderNormal: "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-700 hover:bg-emerald-50/30 hover:border-emerald-400",
          iconBgNormal: "bg-emerald-100 text-emerald-700",
          buttonNormal: "text-emerald-700 bg-emerald-100/80",
        }
      : {
          borderSelected: "border-2 border-blue-500 bg-blue-50/80 text-blue-950",
          iconBgSelected: "bg-blue-600 text-white",
          textSelected: "text-blue-700",
          borderNormal: "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-700 hover:bg-blue-50/40 hover:border-blue-400",
          iconBgNormal: "bg-blue-100 text-blue-600",
          buttonNormal: "text-blue-600 bg-blue-100/80",
        };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="file"
          id={name}
          accept={accept}
          name={fileRegistration.name}
          ref={fileRegistration.ref}
          onBlur={fileRegistration.onBlur}
          onChange={handleFileChange}
          className="hidden"
        />

        {hasFile ? (
          /* SELECTED FILE CONTAINER — Separate div so Remove button click doesn't re-trigger label/file picker */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 w-full rounded-xl sm:rounded-2xl transition-all shadow-2xs ${
              isDragging
                ? "border-2 border-dashed border-[#B063FF] bg-purple-50/60 shadow-md ring-2 ring-[#B063FF]/30"
                : errorMsg
                ? "border-2 border-red-400 bg-red-50/60 text-red-700"
                : colorStyles.borderSelected
            }`}
          >
            {/* Clickable Area to change file */}
            <div
              onClick={() => document.getElementById(name)?.click()}
              className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1 cursor-pointer"
              title="Click to change file"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${colorStyles.iconBgSelected}`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {selectedFileName}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-semibold truncate flex items-center gap-1.5 ${colorStyles.textSelected}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  Selected file attached
                </span>
              </div>
            </div>

            {/* Remove Action Button */}
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] sm:text-xs text-red-600 hover:text-red-700 active:text-red-800 font-semibold px-2.5 py-1 sm:py-1.5 rounded-lg bg-red-100/80 hover:bg-red-100 border border-red-200/80 transition-all shrink-0 flex items-center gap-1 cursor-pointer touch-manipulation active:scale-[0.98]"
              title="Remove file"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Remove</span>
            </button>
          </div>
        ) : (
          /* UNSELECTED STATE — Standard label wrapping input */
          <label
            htmlFor={name}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 w-full rounded-xl sm:rounded-2xl cursor-pointer transition-all touch-manipulation ${
              isDragging
                ? "border-2 border-dashed border-[#B063FF] bg-purple-50/60 shadow-md ring-2 ring-[#B063FF]/30"
                : errorMsg
                ? "border-2 border-dashed border-red-300 bg-red-50/60 text-red-700"
                : colorStyles.borderNormal
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${colorStyles.iconBgNormal}`}
              >
                {resolvedType === "photo" ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : resolvedType === "identity" ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold truncate text-slate-800">
                  {resolvedType === "photo"
                    ? "Upload Applicant Photo"
                    : label
                    ? `Upload ${label.replace(" Document", "")}`
                    : "Upload Document"}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                  {isDragging ? "Drop file here to upload" : resolvedType === "photo" ? "Clear front-facing photo (JPG, PNG)" : "PDF, JPG or PNG (Max 5MB)"}
                </span>
              </div>
            </div>

            <span className={`text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shrink-0 ${colorStyles.buttonNormal}`}>
              {resolvedType === "certificate" ? "Upload" : "Browse"}
            </span>
          </label>
        )}
      </div>
      {errorMsg && <p className="text-xs text-red-500 mt-1.5 font-medium">{errorMsg}</p>}
    </div>
  );
}

export default function PersonalKycStep({ register, errors, setValue, watch }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">
            1
          </span>
          Personal & KYC Details
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Please provide your identity details and upload supporting documents.
        </p>
      </div>

      {/* 2-Column Grid Container (Desktop) / 1-Column (Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ROW 1 — Left: Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Enter full legal name"
              {...register("fullName")}
              className={`w-full bg-slate-50 border ${
                errors.fullName ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.fullName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.fullName.message}</p>}
        </div>

        {/* ROW 1 — Right: Email ID */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email ID <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={`w-full bg-slate-50 border ${
                errors.email ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
        </div>

        {/* ROW 2 — Left: Mobile Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <input
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("mobile")}
              className={`w-full bg-slate-50 border ${
                errors.mobile ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.mobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.mobile.message}</p>}
        </div>

        {/* ROW 2 — Right: PAN Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="ABCDE1234F"
            {...register("panNumber")}
            className={`w-full uppercase bg-slate-50 border ${
              errors.panNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
            } text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
          />
          {errors.panNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.panNumber.message}</p>}
        </div>

        {/* ROW 3 — Left: Aadhaar Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Aadhaar Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={12}
            inputMode="numeric"
            placeholder="12-digit Aadhaar number"
            {...register("aadhaarNumber")}
            className={`w-full bg-slate-50 border ${
              errors.aadhaarNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
            } text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
          />
          {errors.aadhaarNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.aadhaarNumber.message}</p>}
        </div>

        {/* ROW 3 — Right: PAN Card Upload */}
        <FileInputField
          label="PAN Card Document"
          name="panCardDoc"
          accept=".pdf,.jpg,.jpeg,.png"
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          required
          fileType="identity"
        />

        {/* ROW 4 — Left: Aadhaar Card Upload */}
        <FileInputField
          label="Aadhaar Card Document"
          name="aadhaarCardDoc"
          accept=".pdf,.jpg,.jpeg,.png"
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          required
          fileType="identity"
        />

        {/* ROW 4 — Right: Passport Size Photo Upload */}
        <FileInputField
          label="Passport Size Photo"
          name="photo"
          accept=".pdf,.jpg,.jpeg,.png"
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          required
          fileType="photo"
        />
      </div>
    </div>
  );
}
