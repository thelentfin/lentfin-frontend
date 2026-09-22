"use client";

import React, { useState, useEffect } from "react";
import CompanyLocationSettings from "./CompanyLocationSettings";
import BankMasterSettings from "./BankMasterSettings";

const SETTINGS_TABS = [
  {
    id: "company-location",
    label: "Company & Location",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    badge: null,
  },
  {
    id: "bank-master",
    label: "Bank Master",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    id: "commission-payments",
    label: "Commission & Payments",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    badge: "Soon",
  },
  {
    id: "roles-permissions",
    label: "Roles & Permissions",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    badge: "Soon",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    badge: "Soon",
  },
];

export default function SettingsLanding({ initialTab = "company-location", onNavigate = () => {} }) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (initialTab === "bank-master") return "bank-master";
    return "company-location";
  });

  useEffect(() => {
    if (initialTab === "bank-master" || initialTab === "company-location") {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
      {/* 1. Common Master Header Card */}
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal hidden sm:block">
              Manage corporate entities, branch locations, banking partners, and system preferences.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation (Underline Tab Strip with Fade Indicator & Hidden Scrollbar) */}
      <div className="relative border-b border-slate-200/80">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mb-px pr-8 sm:pr-0">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
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
        {activeSubTab === "company-location" && <CompanyLocationSettings />}

        {activeSubTab === "bank-master" && <BankMasterSettings />}

        {(activeSubTab === "commission-payments" ||
          activeSubTab === "roles-permissions" ||
          activeSubTab === "notifications") && (
          <SettingsComingSoonModule
            tabId={activeSubTab}
            onSwitchTab={(tabId) => setActiveSubTab(tabId)}
          />
        )}
      </div>
    </div>
  );
}

function SettingsComingSoonModule({ tabId, onSwitchTab = () => {} }) {
  const getTabMeta = () => {
    switch (tabId) {
      case "commission-payments":
        return {
          title: "Commission & Payments Engine",
          description:
            "Automated commission schedules, tiered payout calculations, and disbursement ledgers are currently under development.",
          icon: "💳",
          features: [
            "Tiered commission rule configuration per DSA partner category",
            "Direct bank account payout settlement schedules",
            "Real-time transaction tracking and GST invoice auto-generation",
          ],
        };
      case "roles-permissions":
        return {
          title: "Roles & Access Control",
          description:
            "Granular permission matrix and role-based access controls for operational staff, managers, and system auditors.",
          icon: "🛡️",
          features: [
            "Custom administrative role creation and department assignment",
            "Field-level read/write permission governance",
            "Immutable administrative action audit trail",
          ],
        };
      case "notifications":
        return {
          title: "Notification & Alert Preferences",
          description:
            "Multi-channel alert management across email, SMS, and WhatsApp for critical platform milestones.",
          icon: "🔔",
          features: [
            "Application approval instant SMS & email webhooks",
            "Custom template builder for customer communications",
            "Daily operational digest and disbursement alerts",
          ],
        };
      default:
        return {
          title: "Feature in Development",
          description: "This administrative configuration module will be available in an upcoming update.",
          icon: "⚙️",
          features: [],
        };
    }
  };

  const meta = getTabMeta();

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-6 sm:p-12 text-center shadow-2xs animate-fadeIn">
      <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#B063FF] border border-purple-100 flex items-center justify-center mx-auto text-2xl mb-4 shadow-2xs">
        {meta.icon}
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-[#B063FF] border border-purple-200/60 mb-3">
        Scheduled for Next Release
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
        {meta.title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        {meta.description}
      </p>

      {meta.features.length > 0 && (
        <div className="mt-6 max-w-md mx-auto text-left bg-slate-50/70 border border-slate-200/80 rounded-lg p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Planned Capabilities
          </p>
          <ul className="space-y-2">
            {meta.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-[#B063FF] font-bold">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onSwitchTab("company-location")}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-slate-200/80 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <span>🏢</span>
          <span>Open Company & Location</span>
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab("bank-master")}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#B063FF] hover:bg-[#9e4def] text-xs font-medium text-white transition-colors cursor-pointer shadow-2xs"
        >
          <span>🏦</span>
          <span>Open Bank Master</span>
        </button>
      </div>
    </div>
  );
}
