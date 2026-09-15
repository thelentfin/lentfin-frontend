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

  const rawPartnerCount = watch ? watch("partnerCount") : 2;
  const partnerCount = Math.max(2, parseInt(rawPartnerCount, 10) || 2);
  const rawPartners = watch ? watch("partners") : [];

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
    } else {
      // Ensure partnerCount is at least 2 when switching to Partnership
      const currentCount = parseInt(watch ? watch("partnerCount") : 2, 10) || 2;
      if (currentCount < 2) {
        setValue("partnerCount", 2, { shouldValidate: true });
      }
    }
  };

  const handleDecrement = () => {
    if (partnerCount <= 2) return;
    const newCount = partnerCount - 1;
    const targetAdditional = Math.max(1, newCount - 1);
    const currentList = Array.isArray(rawPartners) ? rawPartners : [];
    const updated = currentList.slice(0, targetAdditional);

    if (setValue) {
      setValue("partnerCount", newCount, { shouldValidate: true });
      setValue("partners", updated, { shouldValidate: true });
    }
  };

  const handleIncrement = () => {
    const newCount = partnerCount + 1;
    const targetAdditional = Math.max(1, newCount - 1);
    const currentList = Array.isArray(rawPartners) ? rawPartners : [];
    const updated = [...currentList];
    while (updated.length < targetAdditional) {
      updated.push({
        fullName: "",
        email: "",
        mobile: "",
        panNumber: "",
        aadhaarNumber: "",
        photo: null,
        panCardDoc: null,
        aadhaarCardDoc: null,
      });
    }

    if (setValue) {
      setValue("partnerCount", newCount, { shouldValidate: true });
      setValue("partners", updated, { shouldValidate: true });
    }
  };

  const constRegistration = register ? register("constitutionType") : {};

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-100/80 text-[#B063FF] flex items-center justify-center text-xs font-extrabold">
            1
          </span>
          Registration Type
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your registration type and upload required legal documents.
        </p>
      </div>

      {/* Constitution Dropdown Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          How are you registering? <span className="text-red-500">*</span>
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
                : "border-slate-200 focus:ring-[#B063FF]"
            } text-slate-900 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer truncate touch-manipulation`}
          >
            <option value="">Select how you are registering</option>
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

      {/* Conditional Content for Partnership / Proprietorship / Individual */}
      {selectedConstitution && (
        <div className="pt-2 border-t border-slate-100 space-y-4 animate-fadeIn">
          {selectedConstitution === "Partnership" && (
            <div className="space-y-4">
              {/* Simple and small counter for partner count */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    How many partners do you have?
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Minimum 2 partners (Partner 1 is Primary DSA)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={partnerCount <= 2}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${
                      partnerCount <= 2
                        ? "border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-purple-50 hover:border-[#B063FF] hover:text-[#B063FF] shadow-2xs active:scale-95 cursor-pointer"
                    }`}
                    aria-label="Decrease partners count"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-extrabold text-slate-900">
                    {partnerCount}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-7 h-7 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-purple-50 hover:border-[#B063FF] hover:text-[#B063FF] shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center text-xs font-bold transition-all"
                    aria-label="Increase partners count"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 2 file uploads: Partnership Deed & Firm PAN (both purple / identity style) */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Required Documents for Partnership
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileInputField
                    label="Partnership Deed"
                    name="partnershipDeed"
                    accept=".pdf,.jpg,.jpeg,.png"
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    watch={watch}
                    required
                    fileType="identity"
                  />
                  <FileInputField
                    label="Firm PAN Card"
                    name="firmPanDoc"
                    accept=".pdf,.jpg,.jpeg,.png"
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    watch={watch}
                    required
                    fileType="identity"
                  />
                </div>
              </div>
            </div>
          )}

          {(selectedConstitution === "Proprietorship" ||
            selectedConstitution === "Individual") && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              No additional mandatory documents required for {selectedConstitution === "Proprietorship" ? "Sole Proprietorship" : selectedConstitution}. Personal PAN, Aadhaar, and Photo submitted in Step 2 will serve as identity verification.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
