"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWatch } from "react-hook-form";
import { dsaService } from "@/services/dsaService";

export default function BankDetailsStep({
  register,
  errors,
  setValue,
  watch,
  control,
}) {
  // Subscribe to live form values using useWatch
  const watchedIfsc = useWatch({
    control,
    name: "ifscCode",
    defaultValue: "",
  });
  const watchedBankName = useWatch({
    control,
    name: "bankName",
    defaultValue: "",
  });
  const watchedBranchName = useWatch({
    control,
    name: "branchName",
    defaultValue: "",
  });

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [detectedBank, setDetectedBank] = useState("");
  const [detectedBranch, setDetectedBranch] = useState("");
  const [detectedCity, setDetectedCity] = useState("");
  const [isEditingBranch, setIsEditingBranch] = useState(false);

  const lastLookupCode = useRef("");

  // Bank name and branch name to display (either from local detected state or form state)
  const displayBank = detectedBank || watchedBankName || (watch ? watch("bankName") : "");
  const displayBranch = detectedBranch || watchedBranchName || (watch ? watch("branchName") : "");

  // Lookup function
  const executeIfscLookup = useCallback(
    async (codeToTest) => {
      const clean = (codeToTest || "").trim().toUpperCase();
      if (!clean || clean.length !== 11) return;

      // Prevent redundant lookups for the same code
      if (lastLookupCode.current === clean && (detectedBank || watchedBankName)) {
        return;
      }

      lastLookupCode.current = clean;
      setIsLookingUp(true);
      setLookupError("");

      try {
        const res = await dsaService.lookupIFSC(clean);
        if (res && res.success && res.data) {
          const bankVal = res.data.bank || "";
          const branchVal = res.data.branch || "";
          const cityVal = res.data.city || "";

          setDetectedBank(bankVal);
          setDetectedBranch(branchVal);
          setDetectedCity(cityVal);
          setLookupError("");

          if (setValue) {
            setValue("bankName", bankVal, {
              shouldValidate: true,
              shouldDirty: true,
            });
            setValue("branchName", branchVal, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }
        } else {
          setLookupError(res?.message || "Invalid or unrecognized IFSC code");
          setDetectedBank("");
          setDetectedBranch("");
          setDetectedCity("");
          if (setValue) {
            setValue("bankName", "");
            setValue("branchName", "");
          }
        }
      } catch (err) {
        setLookupError("Failed to fetch bank details");
      } finally {
        setIsLookingUp(false);
      }
    },
    [setValue, detectedBank, watchedBankName]
  );

  // Trigger whenever watched IFSC hits 11 characters
  useEffect(() => {
    const raw = (watchedIfsc || "").trim().toUpperCase();
    if (raw.length === 11) {
      executeIfscLookup(raw);
    } else if (raw.length < 11) {
      lastLookupCode.current = "";
      if (detectedBank || detectedBranch) {
        setDetectedBank("");
        setDetectedBranch("");
        setDetectedCity("");
        setLookupError("");
        if (setValue) {
          setValue("bankName", "");
          setValue("branchName", "");
        }
      }
    }
  }, [watchedIfsc, executeIfscLookup, detectedBank, detectedBranch, setValue]);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-100/80 text-[#B063FF] flex items-center justify-center text-xs font-extrabold">
            3
          </span>
          Bank Account Details
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter your bank account details for payout processing and verification.
        </p>
      </div>

      {/* Name as per Bank */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Name as per Bank Account <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Account holder's full name"
            {...register("bankAccountName")}
            className={`w-full bg-slate-50 border ${
              errors.bankAccountName
                ? "border-red-400 focus:ring-red-400"
                : "border-slate-200 focus:ring-[#B063FF]"
            } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
          />
        </div>
        {errors.bankAccountName && (
          <p className="text-xs text-red-500 mt-1 font-medium">
            {errors.bankAccountName.message}
          </p>
        )}
      </div>

      {/* Account Number & IFSC Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Account Number Column */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Account Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <input
              type="text"
              maxLength={18}
              placeholder="Enter bank account number"
              {...register("accountNumber")}
              className={`w-full bg-slate-50 border ${
                errors.accountNumber
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-200 focus:ring-[#B063FF]"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.accountNumber && (
            <p className="text-xs text-red-500 mt-1 font-medium">
              {errors.accountNumber.message}
            </p>
          )}

          {/* Bank Name Displayed Under Account Number */}
          {displayBank ? (
            <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2.5 bg-purple-50/90 border border-purple-200 rounded-xl text-xs text-purple-900 shadow-xs animate-fadeIn">
              <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-[#B063FF] shrink-0">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 block leading-tight">
                  Bank Name
                </span>
                <span className="font-semibold text-slate-900 truncate block text-xs mt-0.5">
                  {displayBank}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* IFSC Code Column */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>
              IFSC Code <span className="text-red-500">*</span>
            </span>
            {isLookingUp && (
              <span className="text-[11px] text-[#B063FF] font-medium flex items-center gap-1">
                <svg
                  className="animate-spin w-3 h-3 text-[#B063FF]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Looking up...
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <input
              type="text"
              maxLength={11}
              placeholder="e.g. SBIN0001234"
              {...register("ifscCode", {
                onChange: (e) => {
                  const val = (e.target.value || "").toUpperCase().trim();
                  e.target.value = val;
                  if (val.length === 11) {
                    executeIfscLookup(val);
                  }
                },
                onBlur: (e) => {
                  const val = (e.target.value || "").toUpperCase().trim();
                  if (val.length === 11) {
                    executeIfscLookup(val);
                  }
                },
              })}
              className={`w-full uppercase bg-slate-50 border ${
                errors.ifscCode
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-200 focus:ring-[#B063FF]"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.ifscCode && (
            <p className="text-xs text-red-500 mt-1 font-medium">
              {errors.ifscCode.message}
            </p>
          )}

          {/* Lookup Error Message */}
          {lookupError && !errors.ifscCode && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {lookupError}
            </p>
          )}

          {/* Branch Name Displayed Under IFSC Code */}
          {displayBranch ? (
            <div className="mt-2.5 px-3 py-2 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block leading-tight">
                      Branch Name
                    </span>
                    <span className="font-semibold text-slate-900 truncate block text-xs mt-0.5">
                      {displayBranch}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingBranch((prev) => !prev)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium underline shrink-0 cursor-pointer"
                >
                  {isEditingBranch ? "Done" : "Edit"}
                </button>
              </div>

              {/* Inline Branch Edit Input */}
              {isEditingBranch && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60">
                  <label className="block text-[10px] text-emerald-800 font-medium mb-1">
                    Edit branch name if needed:
                  </label>
                  <input
                    type="text"
                    value={displayBranch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDetectedBranch(val);
                      if (setValue) {
                        setValue("branchName", val, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                    placeholder="Enter branch name"
                    className="w-full bg-white border border-emerald-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
