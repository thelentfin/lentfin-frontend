"use client";

import React, { useState } from "react";
import Link from "next/link";
import DSARegistrationForm from "@/components/dsa-registration/DSARegistrationForm";

export default function DSASignupPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <div className="relative flex min-h-screen md:h-screen md:overflow-hidden flex-col items-center justify-start md:justify-between bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(219,234,254,0.6),rgba(248,250,252,1))] pt-6 px-4 pb-4 sm:p-6 md:py-6 md:px-8 overflow-x-hidden">
      {/* Ambient Soft Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] bg-blue-200/40 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] bg-indigo-200/30 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl flex flex-col md:flex-1 my-0 md:my-auto max-h-full">
        {/* Top Header / Navigation */}
        <div className="flex items-center justify-between mb-2.5 px-1 sm:px-2 shrink-0">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/25 shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                LentFin
              </h1>
              <p className="text-[9px] sm:text-[10px] text-blue-600 font-semibold tracking-wide uppercase">
                DSA Partner Registration
              </p>
            </div>
          </div>

          {/* Back to Login Link */}
          <Link
            href="/"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 sm:gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Card Body / Direct Container on Success */}
        {isSuccess ? (
          <div className="flex-1 flex flex-col justify-center overflow-y-auto custom-scrollbar py-2">
            <DSARegistrationForm onSuccessState={setIsSuccess} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 sm:p-6 flex flex-col md:flex-1 md:justify-between overflow-visible md:overflow-hidden">
            <DSARegistrationForm onSuccessState={setIsSuccess} />
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-2.5 shrink-0">
          <p className="text-[11px] text-slate-500">
            Need assistance with registration? Contact Corporate DSA Support.
          </p>
        </div>
      </div>
    </div>
  );
}
