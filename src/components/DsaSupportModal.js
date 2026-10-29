"use client";

import React, { useEffect } from "react";

export default function DsaSupportModal({ isOpen, onClose }) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#B063FF]/10 text-[#B063FF] border border-[#B063FF]/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Corporate DSA Support
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Direct assistance for registration & login
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Support Options List */}
        <div className="p-4 sm:p-5 space-y-2.5">
          {/* 1. Helpline Call */}
          <a
            href="tel:+919876543210"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-[#B063FF]/60 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">📞</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Helpline Number
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#B063FF] transition-colors">
                  +91 98765 43210
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#B063FF] bg-[#B063FF]/10 border border-[#B063FF]/20 px-2 py-1 rounded-lg shrink-0">
              Call Now
            </span>
          </a>

          {/* 2. WhatsApp Support */}
          <a
            href="https://wa.me/919876543210?text=Hi%20LentFin%20Team%2C%20I%20need%20assistance%20with%20DSA%20registration%2Flogin."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-400/60 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">💬</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  WhatsApp Support
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                  Fast Onboarding Help
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-1 rounded-lg shrink-0">
              Chat
            </span>
          </a>

          {/* 3. Support Email */}
          <a
            href="mailto:support@lentfin.com?subject=DSA%20Partner%20Assistance%20Request"
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-[#B063FF]/60 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">✉️</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Support Email
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#B063FF] transition-colors">
                  support@lentfin.com
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
              Email
            </span>
          </a>

          {/* 4. Support Timings */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 bg-white">
            <span className="text-lg shrink-0">⏰</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Support Timings
              </span>
              <span className="text-xs font-medium text-slate-700">
                Mon – Sat: 9:30 AM – 6:30 PM
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>LentFin Corporate Desk</span>
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

