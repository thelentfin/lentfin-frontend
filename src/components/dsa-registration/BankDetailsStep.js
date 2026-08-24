"use client";

import React from "react";

export default function BankDetailsStep({ register, errors }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">
            2
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Account holder's full name"
            {...register("bankAccountName")}
            className={`w-full bg-slate-50 border ${
              errors.bankAccountName ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
            } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
          />
        </div>
        {errors.bankAccountName && (
          <p className="text-xs text-red-500 mt-1 font-medium">{errors.bankAccountName.message}</p>
        )}
      </div>

      {/* Account Number & IFSC Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Account Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="text"
              maxLength={18}
              placeholder="Enter bank account number"
              {...register("accountNumber")}
              className={`w-full bg-slate-50 border ${
                errors.accountNumber ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.accountNumber && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.accountNumber.message}</p>
          )}
        </div>

        {/* IFSC Code */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <input
              type="text"
              maxLength={11}
              placeholder="e.g. SBIN0001234"
              {...register("ifscCode")}
              className={`w-full uppercase bg-slate-50 border ${
                errors.ifscCode ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.ifscCode && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.ifscCode.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
