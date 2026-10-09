"use client";

import React from "react";
import { useWatch } from "react-hook-form";
import { FileInputField } from "./PersonalKycStep";
import { CONSTITUTION_TYPES } from "@/schemas/dsaSchema";
import SaasSelect from "@/components/SaasSelect";
import CityCombobox from "./CityCombobox";
import { dsaService } from "@/services/dsaService";

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

  const watchedLocation = useWatch({
    control,
    name: "location",
    defaultValue: "",
  });

  const watchedCity = useWatch({
    control,
    name: "city",
    defaultValue: "",
  });

  const watchedReferralCode = useWatch({
    control,
    name: "referralCode",
    defaultValue: "",
  });

  const [isValidatingReferral, setIsValidatingReferral] = React.useState(false);
  const [referralFeedback, setReferralFeedback] = React.useState(null);

  React.useEffect(() => {
    const code = (watchedReferralCode || "").trim();
    if (!code) {
      setReferralFeedback(null);
      setIsValidatingReferral(false);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsValidatingReferral(true);
      try {
        const res = await dsaService.validateReferralCode(code);
        if (!isCurrent) return;
        if (res && res.status && res.data) {
          setReferralFeedback({
            valid: true,
            message: `Referred by: ${res.data.name}${res.data.firm_name ? ` (${res.data.firm_name})` : ""}`,
          });
        } else {
          setReferralFeedback({
            valid: false,
            message: res?.message || "Invalid or inactive referral code",
          });
        }
      } catch (e) {
        if (!isCurrent) return;
        setReferralFeedback({
          valid: false,
          message: "Unable to verify referral code",
        });
      } finally {
        if (isCurrent) setIsValidatingReferral(false);
      }
    }, 500);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [watchedReferralCode]);

  const selectedConstitution =
    watchedConstitution || (typeof watch === "function" ? watch("constitutionType") : "");

  const currentLocation =
    watchedLocation || watchedCity || (typeof watch === "function" ? (watch("location") || watch("city")) : "");

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
    if (typeId === "Individual") {
      setValue("firmName", "");
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
          Registration Type &amp; Location
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your registration type, operational city, and upload required legal documents.
        </p>
      </div>

      {/* 2-Column Responsive Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Line 1 Col 2: Firm Name (if non-Individual) OR Location (if Individual / Initial) */}
        {selectedConstitution && selectedConstitution !== "Individual" ? (
          <div className="animate-fadeIn">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Firm Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                {...register("firmName")}
                placeholder={
                  selectedConstitution === "Proprietorship"
                    ? "Enter Sole Proprietorship firm name"
                    : selectedConstitution === "Partnership"
                    ? "Enter Partnership Firm / LLP name"
                    : "Enter Private Limited company name"
                }
                className={`w-full bg-slate-50 border ${
                  errors?.firmName
                    ? "border-red-400 focus:ring-red-300"
                    : "border-slate-200 focus:border-[#B063FF] focus:ring-[#B063FF]/20"
                } rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs`}
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            {errors?.firmName && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.firmName.message}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <CityCombobox
              id="dsa-location-input"
              name="location"
              value={currentLocation || ""}
              onChange={(val) => {
                const trimmed = typeof val === "string" ? val.trim() : val;
                setValue("location", trimmed, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                setValue("city", trimmed, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                setValue("locationText", trimmed, { shouldDirty: true });
                setValue("dsa_location", trimmed, { shouldDirty: true });
              }}
              onBlur={() => {
                const trimmed = (currentLocation || "").trim();
                setValue("location", trimmed, { shouldValidate: true });
                setValue("city", trimmed, { shouldValidate: true });
                setValue("dsa_location", trimmed, { shouldValidate: true });
              }}
              placeholder="Search Indian city or enter manual city..."
              hasError={Boolean(errors?.location || errors?.city)}
              errorMessage={errors?.location?.message || errors?.city?.message}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Select your primary city from suggestions or type your manual city name.
            </p>
          </div>
        )}

        {/* Line 2 Col 1: Location (if non-Individual) */}
        {selectedConstitution && selectedConstitution !== "Individual" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <CityCombobox
              id="dsa-location-input"
              name="location"
              value={currentLocation || ""}
              onChange={(val) => {
                const trimmed = typeof val === "string" ? val.trim() : val;
                setValue("location", trimmed, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                setValue("city", trimmed, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
                setValue("locationText", trimmed, { shouldDirty: true });
                setValue("dsa_location", trimmed, { shouldDirty: true });
              }}
              onBlur={() => {
                const trimmed = (currentLocation || "").trim();
                setValue("location", trimmed, { shouldValidate: true });
                setValue("city", trimmed, { shouldValidate: true });
                setValue("dsa_location", trimmed, { shouldValidate: true });
              }}
              placeholder="Search Indian city or enter manual city..."
              hasError={Boolean(errors?.location || errors?.city)}
              errorMessage={errors?.location?.message || errors?.city?.message}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Select your primary city from suggestions or type your manual city name.
            </p>
          </div>
        )}

        {/* Line 2 Col 2 (or Full-width Col-span-2 for Individual): Referral Code Field */}
        <div className={!selectedConstitution || selectedConstitution === "Individual" ? "md:col-span-2" : ""}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Referral Code</span>
            <span className="text-[10px] text-slate-400 font-normal">Optional</span>
          </label>
          <div className="relative">
            <input
              type="text"
              {...register("referralCode")}
              placeholder="Enter referral code (e.g. RAJESH4821)"
              className={`w-full bg-slate-50 border ${
                errors?.referralCode
                  ? "border-red-400 focus:ring-red-300"
                  : "border-slate-200 focus:border-[#B063FF] focus:ring-[#B063FF]/20"
              } rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs`}
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
          </div>
          {errors?.referralCode && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.referralCode.message}</p>
          )}
          {isValidatingReferral && (
            <p className="text-[11px] text-purple-600 mt-1.5 flex items-center gap-1.5 font-medium animate-pulse">
              <svg className="animate-spin w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Verifying referral code...</span>
            </p>
          )}
          {!isValidatingReferral && referralFeedback && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                referralFeedback.valid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span>{referralFeedback.valid ? "✅" : "⚠️"}</span>
              <span>{referralFeedback.message}</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            If you were referred by another DSA partner, enter their referral code.
          </p>
        </div>
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
