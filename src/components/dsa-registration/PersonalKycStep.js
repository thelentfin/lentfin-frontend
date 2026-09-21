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
  error,
  setValue,
  watch,
  required = false,
  fileType = "auto",
}) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const watchedValue = typeof watch === "function" ? watch(name) : null;

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

  const fileRegistration = register ? register(name) : {};

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    setSelectedFileName(selectedFile.name);
    if (setValue) {
      setValue(name, selectedFile, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
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
  };

  const inputId = name ? name.replace(/[^a-zA-Z0-9_-]/g, "_") : "file_input";

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFileName("");
    if (setValue) {
      setValue(name, null, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
    const el = document.getElementById(inputId);
    if (el) el.value = "";
  };

  // Safe nested error resolver
  const getNestedError = (errObj, path) => {
    if (!errObj || !path) return undefined;
    if (errObj[path]?.message) return errObj[path].message;
    const parts = path.replace(/\[(\w+)\]/g, ".$1").split(".");
    let current = errObj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current?.message;
  };

  const errorMsg = error || getNestedError(errors, name);
  const hasFile = Boolean(selectedFileName);

  // Determine type variant if set to auto
  const resolvedType =
    fileType !== "auto"
      ? fileType
      : name?.toLowerCase().includes("photo") || name?.toLowerCase().includes("passport")
      ? "photo"
      : name?.toLowerCase().includes("pan") || name?.toLowerCase().includes("aadhaar")
      ? "identity"
      : "certificate";

  const colorStyles = {
    borderSelected: "border-2 border-[#B063FF] bg-purple-50/80 text-purple-950",
    iconBgSelected: "bg-[#B063FF] text-white",
    textSelected: "text-[#B063FF]",
    borderNormal: "border-2 border-dashed border-purple-200 bg-purple-50/20 hover:bg-purple-50/60 hover:border-[#B063FF] text-slate-700",
    iconBgNormal: "bg-purple-100/80 text-[#B063FF]",
    buttonNormal: "text-[#B063FF] bg-purple-100/80",
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5 truncate">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileChange}
        />

        {hasFile ? (
          <div
            className={`w-full p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-all ${colorStyles.borderSelected}`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${colorStyles.iconBgSelected}`}
              >
                ✓
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold truncate text-slate-900">
                  {selectedFileName}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-semibold ${colorStyles.textSelected}`}>
                  Ready to upload
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Remove file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-all cursor-pointer select-none touch-manipulation ${
              isDragging
                ? "border-2 border-[#B063FF] bg-purple-100/50"
                : errorMsg
                ? "border-2 border-dashed border-red-300 bg-red-50/20"
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
              Browse
            </span>
          </label>
        )}
      </div>
      {errorMsg && <p className="text-xs text-red-500 mt-1.5 font-medium">{errorMsg}</p>}
    </div>
  );
}

export default function PersonalKycStep({
  register,
  errors,
  setValue,
  watch,
}) {
  const constitutionType = watch ? watch("constitutionType") : "";

  // Dynamic label based on constitution type
  const applicantTitle =
    constitutionType === "Private Limited"
      ? "Director KYC Details"
      : constitutionType === "Partnership"
      ? "Partner KYC Details"
      : "Personal & KYC Details";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-100/80 text-[#B063FF] flex items-center justify-center text-xs font-extrabold">
            2
          </span>
          {applicantTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Please provide identity details and upload supporting documents.
        </p>
      </div>

      {/* Primary KYC Fields Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
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
                  errors?.fullName ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-[#B063FF]"
                } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors?.fullName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.fullName.message}</p>}
          </div>

          {/* Email ID */}
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
                  errors?.email ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-[#B063FF]"
                } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors?.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
          </div>

          {/* Mobile Number */}
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
                inputMode="numeric"
                placeholder="10-digit mobile number"
                {...register("mobile")}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
                className={`w-full bg-slate-50 border ${
                  errors?.mobile
                    ? "border-red-400 focus:ring-red-400"
                    : "border-slate-200 focus:ring-[#B063FF]"
                } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors?.mobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.mobile.message}</p>}
          </div>

          {/* PAN Number */}
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
                errors?.panNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-[#B063FF]"
              } text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
            {errors?.panNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.panNumber.message}</p>}
          </div>

          {/* Aadhaar Number */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Aadhaar Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={12}
              inputMode="numeric"
              placeholder="12-digit Aadhaar number"
              {...register("aadhaarNumber")}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
              }}
              className={`w-full bg-slate-50 border ${
                errors?.aadhaarNumber
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-200 focus:ring-[#B063FF]"
              } text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
            {errors?.aadhaarNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.aadhaarNumber.message}</p>}
          </div>

          {/* PAN Card Upload */}
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

          {/* Aadhaar Card Upload */}
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

          {/* Passport Size Photo Upload */}
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

          {/* Cancel Cheque / Bank Statement Upload */}
          <FileInputField
            label="Cheque / Bank Statement"
            name="bankStatementDoc"
            accept=".pdf,.jpg,.jpeg,.png"
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            required
            fileType="certificate"
          />
        </div>
      </div>
    </div>
  );
}
