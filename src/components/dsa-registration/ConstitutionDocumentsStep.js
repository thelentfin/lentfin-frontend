"use client";

import React from "react";
import { useWatch } from "react-hook-form";
import { FileInputField } from "./PersonalKycStep";
import { CONSTITUTION_TYPES } from "@/schemas/dsaSchema";
import SaasSelect from "@/components/SaasSelect";

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

    // Reset constitution-specific files when changing type
    if (typeId !== "Partnership") {
      setValue("partnershipDeed", null);
    }
    if (typeId !== "Private Limited") {
      setValue("incorporationDoc", null);
    }
    if (typeId !== "Partnership" && typeId !== "Private Limited") {
      setValue("firmPanDoc", null);
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
          <input type="hidden" {...register("constitutionType")} />
          <SaasSelect
            options={CONSTITUTION_TYPES.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            value={selectedConstitution || ""}
            onChange={(val) => {
              handleSelectConstitution(val);
            }}
            placeholder="Select how you are registering"
            hasError={!!errors?.constitutionType}
            buttonClassName="!bg-slate-50 !rounded-xl !pl-10 !pr-4 !py-2.5 text-xs"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        {errors?.constitutionType && (
          <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.constitutionType.message}</p>
        )}
      </div>

      {/* Conditional Content for Partnership / Private Limited / Proprietorship / Individual */}
      {selectedConstitution && (
        <div className="pt-2 border-t border-slate-100 space-y-4 animate-fadeIn">
          {/* Partnership Documents (Step 1) */}
          {selectedConstitution === "Partnership" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Required Documents for Partnership Firm / LLP
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

          {/* Private Limited Documents (Step 1) */}
          {selectedConstitution === "Private Limited" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Required Documents for Private Limited
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileInputField
                    label="Company / Firm PAN Card"
                    name="firmPanDoc"
                    accept=".pdf,.jpg,.jpeg,.png"
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    watch={watch}
                    required
                    fileType="identity"
                  />
                  <FileInputField
                    label="Incorporation Certificate / MOA / AOA"
                    name="incorporationDoc"
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
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 animate-fadeIn">
              No additional mandatory documents required for {selectedConstitution === "Proprietorship" ? "Sole Proprietorship" : selectedConstitution}. Personal PAN, Aadhaar, Photo, and Bank document in Step 2 will serve as identity verification.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
