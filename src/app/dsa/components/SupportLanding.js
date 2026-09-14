"use client";

import React from "react";

export default function SupportLanding({ onNavigate = () => {} }) {
  const cards = [
    {
      id: "customer-application",
      title: "Customer Application",
      description:
        "Something is incorrect or needs attention in a customer's application.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      targetTab: "support-customer-application",
      actionText: "Raise Ticket",
      accent: {
        bg: "bg-[#B063FF]/10 text-[#B063FF] border-[#B063FF]/20",
      },
    },
    {
      id: "general-support",
      title: "General Support",
      description:
        "Get help with account, profile, login, technical issues, payments, or general questions.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      targetTab: "support-general",
      actionText: "Raise Ticket",
      accent: {
        bg: "bg-blue-50/80 text-blue-600 border-blue-100",
      },
    },
    {
      id: "my-tickets",
      title: "My Tickets",
      description:
        "View your submitted support tickets and track their status.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      targetTab: "support-tickets",
      actionText: "View Tickets",
      accent: {
        bg: "bg-violet-50/80 text-violet-600 border-violet-100",
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#B063FF]/10 text-[#B063FF] border border-[#B063FF]/20 shrink-0">
            <svg
              className="w-5.5 h-5.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#B063FF] uppercase tracking-wider">
                Support Center
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              How can we help you?
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              Select a support category below to raise a ticket or view and track your submitted requests.
            </p>
          </div>
        </div>
      </div>

      {/* Support Center Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((item) => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.targetTab)}
            className="group relative rounded-lg border border-slate-200/80 bg-white p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-xs cursor-pointer flex flex-col justify-between space-y-4 select-none"
          >
            {/* Top: Icon */}
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-md border ${item.accent.bg} shrink-0`}
              >
                {React.cloneElement(item.icon, {
                  className:
                    "w-5 h-5 transition-transform duration-200 group-hover:scale-105",
                })}
              </div>
            </div>

            {/* Middle: Content */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
                {item.title}
              </h2>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Bottom: Action CTA */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#B063FF] group-hover:text-[#9d4eed] flex items-center gap-1 transition-colors">
                <span>{item.actionText}</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
