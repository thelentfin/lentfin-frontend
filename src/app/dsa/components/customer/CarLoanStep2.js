"use client";

import React, { useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import {
  getFileFromVal,
  isValidFileSize,
  isValidFileType,
} from "@/schemas/customerRegistrationSchema";

export default function CarLoanStep2({
  register,
  errors,
  control,
  setValue,
  clearErrors,
  disabled = false,
}) {
  // useWatch subscribes to form updates and triggers immediate re-renders
  const watchedCarPhotos = useWatch({ control, name: "carPhotos" }) || [];
  const watchedInvoiceCopy = useWatch({ control, name: "invoiceCopy" });
  const watchedInsuranceCopy = useWatch({ control, name: "insuranceCopy" });
  const watchedPaymentAdvice = useWatch({ control, name: "paymentAdvice" });

  const invoiceFile = getFileFromVal(watchedInvoiceCopy);
  const insuranceFile = getFileFromVal(watchedInsuranceCopy);
  const paymentAdviceFile = getFileFromVal(watchedPaymentAdvice);

  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Separate refs for the 3 document file inputs to allow immediate reset
  const invoiceInputRef = useRef(null);
  const insuranceInputRef = useRef(null);
  const paymentAdviceInputRef = useRef(null);

  // Handle adding car photos (up to 5 photos)
  const handleAddPhotos = (incomingFiles) => {
    setPhotoError("");
    if (!incomingFiles || incomingFiles.length === 0) return;

    const currentList = Array.isArray(watchedCarPhotos) ? [...watchedCarPhotos] : [];
    const validFiles = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      if (!isValidFileType(file)) {
        setPhotoError("Only JPG, JPEG, and PNG images are allowed for car photos.");
        return;
      }
      if (!isValidFileSize(file)) {
        setPhotoError("Each photo must not exceed 5 MB in size.");
        return;
      }
      validFiles.push(file);
    }

    if (currentList.length + validFiles.length > 5) {
      setPhotoError("Maximum 5 photos allowed. You can upload up to 5 photos only.");
      return;
    }

    const updated = [...currentList, ...validFiles];
    setValue("carPhotos", updated, { shouldValidate: true, shouldDirty: true });
    if (errors.carPhotos) {
      clearErrors("carPhotos");
    }
  };

  // Remove individual photo
  const handleRemovePhoto = (indexToRemove) => {
    const currentList = Array.isArray(watchedCarPhotos) ? [...watchedCarPhotos] : [];
    const updated = currentList.filter((_, idx) => idx !== indexToRemove);
    setValue("carPhotos", updated, { shouldValidate: true, shouldDirty: true });
  };

  // Generic single file handler (Invoice, Insurance, Payment Advice)
  const handleSingleFileUpload = (fieldKey, file, inputRef) => {
    if (!file) return;
    if (!isValidFileType(file)) {
      return;
    }
    if (!isValidFileSize(file)) {
      return;
    }
    setValue(fieldKey, file, { shouldValidate: true, shouldDirty: true });
    if (errors[fieldKey]) {
      clearErrors(fieldKey);
    }
    if (inputRef && inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveSingleFile = (fieldKey, inputRef) => {
    setValue(fieldKey, null, { shouldValidate: true, shouldDirty: true });
    if (inputRef && inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Customer Details & Banker / Executive Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information Card */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <div className="h-5 w-5 rounded bg-purple-50 text-[#7A1CAC] flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h5 className="text-xs font-semibold text-slate-800">Customer Details</h5>
          </div>

          {/* Customer Full Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600">
              Customer Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              placeholder="e.g. Ramesh Patel"
              {...register("customerName")}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.customerName
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-[#7A1CAC] focus:ring-1 focus:ring-[#7A1CAC]"
              }`}
            />
            {errors.customerName && (
              <p className="text-[11px] font-medium text-red-500">{errors.customerName.message}</p>
            )}
          </div>

          {/* Customer Mobile */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600">
              Customer Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("mobile")}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
              }}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                errors.mobile
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-[#7A1CAC] focus:ring-1 focus:ring-[#7A1CAC]"
              }`}
            />
            {errors.mobile && (
              <p className="text-[11px] font-medium text-red-500">{errors.mobile.message}</p>
            )}
          </div>
        </div>

        {/* Banker / Executive Contact Card */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <div className="h-5 w-5 rounded bg-purple-50 text-[#7A1CAC] flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h5 className="text-xs font-semibold text-slate-800">Banker / Executive Contact</h5>
          </div>

          {/* Banker Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600">
              Banker / Executive Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              placeholder="e.g. Amit Sharma (Branch Manager)"
              {...register("bankerName")}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                errors.bankerName
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-[#7A1CAC] focus:ring-1 focus:ring-[#7A1CAC]"
              }`}
            />
            {errors.bankerName && (
              <p className="text-[11px] font-medium text-red-500">{errors.bankerName.message}</p>
            )}
          </div>

          {/* Banker Mobile */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600">
              Banker / Executive Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("bankerMobile")}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
              }}
              className={`w-full rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors tabular-nums ${
                errors.bankerMobile
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-[#7A1CAC] focus:ring-1 focus:ring-[#7A1CAC]"
              }`}
            />
            {errors.bankerMobile && (
              <p className="text-[11px] font-medium text-red-500">{errors.bankerMobile.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Car Photo Upload Section (Front Photo Compulsory + Optional Photos up to 5) */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-purple-100 text-[#7A1CAC] flex items-center justify-center">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-semibold text-slate-800">
                  Car Photos with Number Plate
                </h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-[#7A1CAC] border border-purple-200">
                  ★ Front Photo Compulsory
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Front view photo with number plate is compulsory. You can also upload up to 4 additional car photos if you wish (max 5 photos total).
              </p>
            </div>
          </div>
        </div>

        {/* Upload Dropzone */}
        {watchedCarPhotos.length < 5 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(true);
            }}
            onDragLeave={() => setIsDraggingPhotos(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(false);
              if (e.dataTransfer.files) {
                handleAddPhotos(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDraggingPhotos
                ? "border-[#7A1CAC] bg-purple-50/60 ring-2 ring-purple-300"
                : errors.carPhotos || photoError
                ? "border-red-300 bg-red-50/20 hover:border-red-400"
                : "border-slate-300 bg-slate-50/50 hover:bg-purple-50/30 hover:border-[#7A1CAC] hover:shadow-xs"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                if (e.target.files) {
                  handleAddPhotos(e.target.files);
                  e.target.value = "";
                }
              }}
            />

            {/* Car Icon graphic in Purple theme */}
            <div className="relative mb-2 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-purple-100 text-[#7A1CAC] flex items-center justify-center shadow-xs">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7A1CAC] text-white text-[10px] font-bold shadow-xs">
                +
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-800">
              Click to browse or drag & drop car photos here
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 text-center">
              Front photo with number plate is mandatory • Other photos are optional (Up to 5 total, PNG/JPG up to 5MB each)
            </p>
          </div>
        )}

        {photoError && (
          <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
            <span>⚠️</span> {photoError}
          </p>
        )}
        {errors.carPhotos && (
          <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
            <span>⚠️</span> {errors.carPhotos.message}
          </p>
        )}

        {/* Uploaded Car Photos Gallery Grid */}
        {watchedCarPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
            {watchedCarPhotos.map((photo, idx) => {
              const previewUrl =
                photo instanceof File || photo instanceof Blob
                  ? URL.createObjectURL(photo)
                  : typeof photo === "string"
                  ? photo
                  : null;

              return (
                <div
                  key={idx}
                  className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shadow-xs flex flex-col"
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Car Photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">Image File</span>
                    )}

                    {/* Badge for Photo #1: Front Photo (Compulsory) */}
                    {idx === 0 ? (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#7A1CAC] text-white shadow-xs">
                        ★ Front Photo
                      </span>
                    ) : (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/60 text-white backdrop-blur-xs">
                        Photo #{idx + 1}
                      </span>
                    )}

                    {/* Delete Photo Button */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(idx);
                      }}
                      title="Remove this photo"
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Photo Caption */}
                  <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="truncate max-w-[90px] font-medium text-slate-700">
                      {photo.name || `Photo ${idx + 1}`}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {photo.size ? `${(photo.size / (1024 * 1024)).toFixed(1)}MB` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: The 3 Required Vehicle Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Document 1: Invoice Copy */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between space-y-2 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                Invoice Copy <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-slate-400">PDF / Image</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Vehicle purchase invoice from dealer
            </p>
          </div>

          {!invoiceFile ? (
            <label className="border border-dashed border-slate-300 rounded-md p-3.5 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50/40 hover:border-[#7A1CAC] transition-colors">
              <input
                ref={invoiceInputRef}
                type="file"
                accept=".pdf, .jpg, .jpeg, .png"
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSingleFileUpload("invoiceCopy", e.target.files[0], invoiceInputRef);
                  }
                }}
              />
              <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[11px] font-semibold text-[#7A1CAC]">Upload Invoice</span>
              <span className="text-[10px] text-slate-400">Max 5MB</span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-md bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 truncate">
                <svg className="w-4 h-4 text-[#7A1CAC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-medium text-slate-800 truncate">
                  {invoiceFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSingleFile("invoiceCopy", invoiceInputRef)}
                disabled={disabled}
                title="Remove invoice file"
                className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2 shrink-0 cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
          )}
          {errors.invoiceCopy && (
            <p className="text-[11px] font-medium text-red-500">{errors.invoiceCopy.message}</p>
          )}
        </div>

        {/* Document 2: Insurance Copy */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between space-y-2 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                Insurance Copy <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-slate-400">PDF / Image</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Valid vehicle insurance policy document
            </p>
          </div>

          {!insuranceFile ? (
            <label className="border border-dashed border-slate-300 rounded-md p-3.5 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50/40 hover:border-[#7A1CAC] transition-colors">
              <input
                ref={insuranceInputRef}
                type="file"
                accept=".pdf, .jpg, .jpeg, .png"
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSingleFileUpload("insuranceCopy", e.target.files[0], insuranceInputRef);
                  }
                }}
              />
              <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[11px] font-semibold text-[#7A1CAC]">Upload Insurance</span>
              <span className="text-[10px] text-slate-400">Max 5MB</span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-md bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 truncate">
                <svg className="w-4 h-4 text-[#7A1CAC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-medium text-slate-800 truncate">
                  {insuranceFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSingleFile("insuranceCopy", insuranceInputRef)}
                disabled={disabled}
                title="Remove insurance file"
                className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2 shrink-0 cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
          )}
          {errors.insuranceCopy && (
            <p className="text-[11px] font-medium text-red-500">{errors.insuranceCopy.message}</p>
          )}
        </div>

        {/* Document 3: Bank Payment Advice or Sanction Letter */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between space-y-2 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 truncate">
                Payment Advice / Sanction <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-slate-400">PDF / Image</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Bank payment advice or sanction letter
            </p>
          </div>

          {!paymentAdviceFile ? (
            <label className="border border-dashed border-slate-300 rounded-md p-3.5 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50/40 hover:border-[#7A1CAC] transition-colors">
              <input
                ref={paymentAdviceInputRef}
                type="file"
                accept=".pdf, .jpg, .jpeg, .png"
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSingleFileUpload("paymentAdvice", e.target.files[0], paymentAdviceInputRef);
                  }
                }}
              />
              <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[11px] font-semibold text-[#7A1CAC]">Upload Advice / Sanction</span>
              <span className="text-[10px] text-slate-400">Max 5MB</span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-md bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 truncate">
                <svg className="w-4 h-4 text-[#7A1CAC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-medium text-slate-800 truncate">
                  {paymentAdviceFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSingleFile("paymentAdvice", paymentAdviceInputRef)}
                disabled={disabled}
                title="Remove payment advice file"
                className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2 shrink-0 cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
          )}
          {errors.paymentAdvice && (
            <p className="text-[11px] font-medium text-red-500">{errors.paymentAdvice.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
