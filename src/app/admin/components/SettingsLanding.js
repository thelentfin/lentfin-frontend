"use client";

import React from "react";

export default function SettingsLanding({ onNavigate = () => {} }) {
  const cards = [
    {
      id: "company-location",
      title: "Company & Location",
      description: "Manage companies and locations used across the system.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      targetTab: "company-location",
      isActive: true,
      accent: {
        bg: "bg-blue-50/80 text-blue-600 border-blue-100",
        hoverBg: "group-hover:bg-blue-600 group-hover:text-white",
        borderHover: "hover:border-blue-300",
        textHover: "group-hover:text-blue-600",
        actionText: "text-blue-600 group-hover:text-blue-700",
      },
      statusText: "Active",
    },
    {
      id: "bank-master",
      title: "Bank Master",
      description: "Manage lending banks available for loan applications.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
      targetTab: "bank-master",
      isActive: true,
      accent: {
        bg: "bg-cyan-50/80 text-cyan-600 border-cyan-100",
        hoverBg: "group-hover:bg-cyan-600 group-hover:text-white",
        borderHover: "hover:border-cyan-300",
        textHover: "group-hover:text-cyan-600",
        actionText: "text-cyan-600 group-hover:text-cyan-700",
      },
      statusText: "Active",
    },
    {
      id: "commission-payments",
      title: "Commission & Payments",
      description: "Configure commission and payment rules.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      isActive: false,
      accent: {
        bg: "bg-emerald-50/80 text-emerald-600 border-emerald-100",
      },
      statusText: "Coming Soon",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage notification preferences and system alerts.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      isActive: false,
      accent: {
        bg: "bg-violet-50/80 text-violet-600 border-violet-100",
      },
      statusText: "Coming Soon",
    },
    {
      id: "roles-permissions",
      title: "Roles & Permissions",
      description: "Define user roles, access control, and system permissions.",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      isActive: false,
      accent: {
        bg: "bg-amber-50/80 text-amber-600 border-amber-100",
      },
      statusText: "Coming Soon",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Manage your system configuration and administrative preferences.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((item) => {
          if (item.isActive) {
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.targetTab)}
                className="group relative rounded-lg border border-slate-200/80 bg-white p-5 transition-all duration-150 hover:border-slate-300 cursor-pointer flex flex-col justify-between space-y-4 select-none"
              >
                {/* Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-700 transition-colors shrink-0">
                    {React.cloneElement(item.icon, {
                      className: "w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105",
                    })}
                  </div>
                  <span className="rounded bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Active
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-900 group-hover:text-slate-700 flex items-center gap-1">
                    <span>Manage</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="relative rounded-lg border border-slate-200/60 bg-slate-50/50 p-5 flex flex-col justify-between space-y-4 select-none cursor-default"
            >
              {/* Icon & Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200/60 bg-slate-100 text-slate-400 shrink-0">
                  {React.cloneElement(item.icon, { className: "w-4.5 h-4.5" })}
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-500 border border-slate-200/60">
                  {item.statusText}
                </span>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-sm font-medium text-slate-700">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[11px] font-normal text-slate-400">
                  Coming Soon
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
