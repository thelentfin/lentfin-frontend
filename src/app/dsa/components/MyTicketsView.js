"use client";

import React from "react";

export default function MyTicketsView({ onBack = () => {} }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8.5 items-center gap-1.5 px-3 rounded-md border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 text-xs font-medium"
            title="Back to Support Center"
          >
            <span>←</span>
            <span>Back to Support</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                My Tickets
              </h1>
              <span className="rounded bg-slate-100 text-slate-600 border border-slate-200/80 px-2 py-0.5 text-[10px] font-medium">
                Ticket History
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              View your submitted support tickets and track their status.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State Card */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-10 sm:p-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#B063FF]/10 text-[#B063FF] mb-4 border border-[#B063FF]/20">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-slate-900">
          No tickets yet
        </h2>

        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Your submitted support tickets will appear here.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-md bg-[#B063FF] hover:bg-[#9d4eed] px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer shadow-xs"
          >
            <span>+</span>
            <span>Raise a New Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
