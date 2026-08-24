"use client";

import React from "react";
import { useWatch } from "react-hook-form";
import { FileInputField } from "./PersonalKycStep";
import { CONSTITUTION_TYPES } from "@/schemas/dsaSchema";

export default function ConstitutionDocumentsStep({
  register,
  errors,
  setValue,
  watch,
  control,
}) {
  const watchedConstitution = useWatch({
    control,
    name: "constitutionType",
    defaultValue: "",
  });

  const selectedConstitution =
    watchedConstitution || (typeof watch === "function" ? watch("constitutionType") : "");

  const handleSelectConstitution = (typeId) => {
    setValue("constitutionType", typeId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });

    // Reset partnership files if switching away from Partnership
    if (typeId !== "Partnership") {
      setValue("partnershipDeed", null);
      setValue("firmPanDoc", null);
    }
  };

  const constRegistration = register ? register("constitutionType") : {};

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">
            4
          </span>
          Constitution Documents
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your business constitution type and upload required legal documents.
        </p>
      </div>

      {/* Constitution Dropdown Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Constitution Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <select
            name={constRegistration.name}
            ref={constRegistration.ref}
            onBlur={constRegistration.onBlur}
            value={selectedConstitution || ""}
            onChange={(e) => {
              if (typeof constRegistration.onChange === "function") {
                constRegistration.onChange(e);
              }
              handleSelectConstitution(e.target.value);
            }}
            className={`w-full bg-slate-50 border ${
              errors?.constitutionType
                ? "border-red-400 focus:ring-red-400"
                : "border-slate-200 focus:ring-blue-500"
            } text-slate-900 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer truncate touch-manipulation`}
          >
            <option value="">Select constitution type</option>
            {CONSTITUTION_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {errors?.constitutionType && (
          <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.constitutionType.message}</p>
        )}
      </div>

      {/* Conditional Document Uploads */}
      {selectedConstitution && (
        <div className="pt-2 border-t border-slate-100 space-y-4 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Required Documents for {selectedConstitution}
          </h4>

          {selectedConstitution === "Partnership" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileInputField
                label="Partnership Deed"
                name="partnershipDeed"
                accept=".pdf,.jpg,.png"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                required
                fileType="certificate"
              />
              <FileInputField
                label="Firm PAN Card"
                name="firmPanDoc"
                accept=".pdf,.jpg,.png"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                required
                fileType="identity"
              />
            </div>
          )}

          {(selectedConstitution === "Proprietorship" ||
            selectedConstitution === "Individual") && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              No additional mandatory documents required for {selectedConstitution}. Personal PAN, Aadhaar, and Photo submitted in Step 1 will serve as identity verification.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
