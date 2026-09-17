"use client";

import React, { useState, useEffect } from "react";
import SupportTicketView from "./SupportTicketView";
import MyTicketsView from "./MyTicketsView";

const SUPPORT_TABS = [
  {
    id: "customer-application",
    label: "Customer Application Support",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    id: "general",
    label: "General Support",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    id: "my-tickets",
    label: "My Tickets",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    badge: null,
  },
  {
    id: "guidelines",
    label: "Help & Guidelines",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    badge: "Help",
  },
];

export default function SupportLanding({
  initialTab = "customer-application",
  dsaName = "",
  dsaProfile = null,
  customerCases = [],
  isLoadingCases = false,
  onTabChange = () => {},
}) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (initialTab === "my-tickets" || initialTab === "general" || initialTab === "guidelines") {
      return initialTab;
    }
    return "customer-application";
  });

  useEffect(() => {
    if (initialTab) {
      if (
        initialTab === "my-tickets" ||
        initialTab === "general" ||
        initialTab === "guidelines" ||
        initialTab === "customer-application"
      ) {
        setActiveSubTab(initialTab);
      }
    }
  }, [initialTab]);

  const handleTabSwitch = (tabId) => {
    setActiveSubTab(tabId);
    if (typeof onTabChange === "function") {
      onTabChange(tabId);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
      {/* 1. Common Master Header Card — identical structure to Admin Settings */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="shrink-0 select-none flex items-center justify-center text-slate-700">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-slate-700"
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
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              Support Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal hidden sm:block">
              Submit support requests for customer applications, general assistance, or view and track your submitted tickets.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation (Underline Tab Strip with Fade Indicator & Hidden Scrollbar) */}
      <div className="relative border-b border-slate-200/80">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mb-px pr-8 sm:pr-0">
          {SUPPORT_TABS.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-2.5 text-xs border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 select-none ${
                  isActive
                    ? "border-[#B063FF] text-[#B063FF] font-bold"
                    : "border-transparent text-slate-500 font-bold hover:text-slate-800 hover:border-slate-30"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-normal px-1.5 py-0.2 rounded transition-colors hidden sm:inline-block ${
                      isActive
                        ? "bg-purple-50 text-[#B063FF] border border-purple-200/80"
                        : "bg-slate-50 text-slate-400 border border-slate-200/60"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Subtle Right Edge Fade Indicator for Mobile Touch Scroll */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F8FAFC] to-transparent sm:hidden" />
      </div>

      {/* 3. Active Tab Workspace */}
      <div>
        {activeSubTab === "customer-application" && (
          <SupportTicketView
            category="customer-application"
            showHeader={false}
            showBackButton={false}
            onNavigateToTickets={() => handleTabSwitch("my-tickets")}
            dsaName={dsaName}
            dsaProfile={dsaProfile}
            customerCases={customerCases}
            isLoadingCases={isLoadingCases}
          />
        )}

        {activeSubTab === "general" && (
          <SupportTicketView
            category="general"
            showHeader={false}
            showBackButton={false}
            onNavigateToTickets={() => handleTabSwitch("my-tickets")}
            dsaName={dsaName}
            dsaProfile={dsaProfile}
          />
        )}

        {activeSubTab === "my-tickets" && (
          <MyTicketsView
            showHeader={false}
            showBackButton={false}
            onRaiseNewTicket={() => handleTabSwitch("customer-application")}
          />
        )}

        {activeSubTab === "guidelines" && (
          <SupportGuidelinesModule
            onSelectTab={(tabId) => handleTabSwitch(tabId)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Support Guidelines & FAQ Module
 * Provides quick contact numbers, email desk, turnaround SLA, and actionable guidance
 */
function SupportGuidelinesModule({ onSelectTab = () => {} }) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Overview Cards: Quick Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Helpline Desk */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-[#B063FF] border border-purple-200/80">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Direct Desk Phone
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal leading-relaxed">
                Call our support desk directly for immediate customer case queries.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <a
              href="tel:18002004567"
              className="text-xs font-semibold text-[#B063FF] hover:text-[#9e4def] transition-colors"
            >
              +91 1800 200 4567
            </a>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Mon–Sat: 9:30 AM – 6:30 PM
            </span>
          </div>
        </div>

        {/* Priority Email Desk */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-[#B063FF] border border-purple-200/80">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Priority Email Desk
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal leading-relaxed">
                Send formal escalation notes, sanction documents, or compliance files.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <a
              href="mailto:support@lentfin.com"
              className="text-xs font-semibold text-[#B063FF] hover:text-[#9e4def] transition-colors"
            >
              support@lentfin.com
            </a>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Expected reply within 2–4 hours
            </span>
          </div>
        </div>

        {/* Turnaround Time SLA */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-[#B063FF] border border-purple-200/80">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Response SLAs
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal leading-relaxed">
                Committed resolution timelines for all tickets submitted by DSA partners.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">
              &lt; 4 Hours (Loan Cases)
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              &lt; 24 Hours for general queries
            </span>
          </div>
        </div>
      </div>

      {/* Guidelines & Recommendations Panel */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Support Submission Guidelines
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Follow these tips to get your support tickets resolved faster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:border-purple-300 hover:bg-purple-50/20 transition-all space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[#B063FF] text-[10px] font-bold shrink-0">
                1
              </span>
              <span className="font-semibold text-slate-900">
                Select Customer Application Case
              </span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
              When raising a ticket for a loan case, select the customer case from the searchable dropdown. This immediately links the application number, bank, and case status.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:border-purple-300 hover:bg-purple-50/20 transition-all space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[#B063FF] text-[10px] font-bold shrink-0">
                2
              </span>
              <span className="font-semibold text-slate-900">
                Attach Supporting Documents
              </span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
              You can attach up to 5 files (PDF, JPG, PNG up to 5 MB each). Sanction letters, approval screenshots, or rejection memos help our operations team investigate without delays.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:border-purple-300 hover:bg-purple-50/20 transition-all space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[#B063FF] text-[10px] font-bold shrink-0">
                3
              </span>
              <span className="font-semibold text-slate-900">
                Accurate Issue Classification
              </span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
              Choose the exact Issue Type that describes what went wrong (e.g., Wrong Status, Bank Rejection, Disbursement Issue, PDD Clearance). This automatically routes it to the designated desk.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:border-purple-300 hover:bg-purple-50/20 transition-all space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[#B063FF] text-[10px] font-bold shrink-0">
                4
              </span>
              <span className="font-semibold text-slate-900">
                Track Updates in "My Tickets"
              </span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
              All raised tickets generate a reference number (e.g., TCK-...). You can view their status and review responses anytime under the &ldquo;My Tickets&rdquo; tab.
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectTab("customer-application")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#B063FF] hover:bg-[#9e4def] text-xs font-medium text-white transition-colors cursor-pointer shadow-2xs"
          >
            <span>+</span>
            <span>Raise Customer Application Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("general")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200/90 hover:border-purple-300 bg-white hover:bg-purple-50/50 text-xs font-medium text-slate-700 hover:text-[#B063FF] transition-colors cursor-pointer shadow-2xs"
          >
            <span>Raise General Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("my-tickets")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200/90 hover:border-purple-300 bg-white hover:bg-purple-50/50 text-xs font-medium text-slate-700 hover:text-[#B063FF] transition-colors cursor-pointer shadow-2xs ml-auto"
          >
            <span>View My Tickets →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
