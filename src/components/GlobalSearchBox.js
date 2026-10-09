"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

// Admin Search Items Catalog
const ADMIN_SEARCH_ITEMS = [
  {
    id: "product-master",
    title: "Loan Products",
    subtitle: "Product Master",
    category: "Settings",
    path: "/admin/product-master",
    keywords: ["loan", "loans", "product", "products", "master", "scheme", "interest", "rate", "roi", "payout", "settings"],
    description: "Manage loan schemes, payout slabs & bank policies",
    icon: "loans",
  },
  {
    id: "bank-master",
    title: "Bank Master",
    subtitle: "Lenders & Partners",
    category: "Settings",
    path: "/admin/bank-master",
    keywords: ["bank", "banks", "master", "lender", "nbfc", "partner", "settings"],
    description: "Lenders, NBFCs & financial partner integrations",
    icon: "bank",
  },
  {
    id: "company-location",
    title: "Company & Branches",
    subtitle: "Locations Master",
    category: "Settings",
    path: "/admin/company-location",
    keywords: ["company", "companies", "location", "locations", "branch", "branches", "city", "office", "settings"],
    description: "Manage internal companies and regional branches",
    icon: "building",
  },
  {
    id: "settings",
    title: "General Settings",
    subtitle: "System Preferences",
    category: "Settings",
    path: "/admin/settings",
    keywords: ["settings", "configuration", "preferences", "system"],
    description: "System configuration and administrative settings",
    icon: "settings",
  },
  {
    id: "customer-applications",
    title: "Customer Applications",
    subtitle: "Loan Cases",
    category: "Applications",
    path: "/admin/customer-applications",
    keywords: ["customer", "customers", "application", "applications", "loan cases", "cases", "leads", "sanctions", "disbursements"],
    description: "Track and review borrower loan applications",
    icon: "customers",
  },
  {
    id: "dsa-applications",
    title: "DSA Applications",
    subtitle: "Pending Verifications",
    category: "DSA Partners",
    path: "/admin/dsa-applications",
    keywords: ["dsa applications", "signup", "signups", "verify", "verification", "pending", "approvals", "kyc", "partner requests"],
    description: "Review and verify new DSA onboarding requests",
    icon: "verify",
  },
  {
    id: "dsa-users",
    title: "DSA Users",
    subtitle: "Partners Directory",
    category: "DSA Partners",
    path: "/admin/dsa-users",
    keywords: ["dsa", "dsa users", "agents", "partners", "directory", "active dsa"],
    description: "Directory of verified DSA partners and agents",
    icon: "users",
  },
  {
    id: "settlements",
    title: "Settlements & Commission",
    subtitle: "Payouts Hub",
    category: "Finance",
    path: "/admin/settlements",
    keywords: ["settlement", "settlements", "commission", "commissions", "payout", "payouts", "invoices", "payment", "earnings"],
    description: "Process partner commissions, payouts & invoices",
    icon: "finance",
  },
  {
    id: "support-tickets",
    title: "Support Tickets",
    subtitle: "Help Desk",
    category: "Support",
    path: "/admin/support-tickets",
    keywords: ["support", "tickets", "ticket", "issue", "help", "queries", "complaints"],
    description: "Manage tickets and partner service requests",
    icon: "support",
  },
  {
    id: "overview",
    title: "Dashboard Overview",
    subtitle: "Home Analytics",
    category: "Dashboard",
    path: "/admin",
    keywords: ["dashboard", "overview", "home", "analytics", "stats", "kpi"],
    description: "System metrics, recent activity & summary",
    icon: "overview",
  },
  {
    id: "profile",
    title: "My Profile",
    subtitle: "Admin Account",
    category: "Account",
    path: "/admin/profile",
    keywords: ["profile", "account", "password", "my profile", "admin user"],
    description: "Admin account credentials and preferences",
    icon: "user",
  },
];

// DSA Search Items Catalog
const DSA_SEARCH_ITEMS = [
  {
    id: "customer-applications",
    title: "Customer Applications",
    subtitle: "Loan Cases",
    category: "Applications",
    path: "/dsa/customer-applications",
    keywords: ["customer", "customers", "new loan", "apply", "application", "applications", "leads", "cases", "submit loan"],
    description: "Create, view & track borrower loan applications",
    icon: "customers",
  },
  {
    id: "commission",
    title: "Payments & Commission",
    subtitle: "Settlements Hub",
    category: "Finance",
    path: "/dsa/commission",
    keywords: ["commission", "commissions", "payout", "payouts", "earnings", "settlement", "payment", "statement"],
    description: "View your payouts, commission slabs & earnings",
    icon: "finance",
  },
  {
    id: "my-referrals",
    title: "My Referrals",
    subtitle: "Partner Network",
    category: "Referrals",
    path: "/dsa/my-referrals",
    keywords: ["referral", "referrals", "referral code", "network", "sub dsa", "tree", "invite", "partner network"],
    description: "Track your referral network, partners & commission",
    icon: "referral",
  },
  {
    id: "support",
    title: "Support Center",
    subtitle: "Help & Queries",
    category: "Support",
    path: "/dsa/support",
    keywords: ["support", "help", "ticket", "tickets", "issue", "raise ticket", "complaint"],
    description: "Raise new support tickets or check ticket status",
    icon: "support",
  },
  {
    id: "overview",
    title: "Dashboard Overview",
    subtitle: "DSA Home",
    category: "Dashboard",
    path: "/dsa",
    keywords: ["dashboard", "overview", "home", "metrics", "stats", "kpi"],
    description: "Application stats, commissions summary & quick links",
    icon: "overview",
  },
  {
    id: "profile",
    title: "My Profile & KYC",
    subtitle: "Account Details",
    category: "Account",
    path: "/dsa/profile",
    keywords: ["profile", "account", "kyc", "bank", "pan", "aadhaar", "password", "details"],
    description: "Manage your profile, KYC documents & bank account",
    icon: "user",
  },
];

function getSearchIcon(type) {
  switch (type) {
    case "loans":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "bank":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      );
    case "building":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "settings":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "customers":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "verify":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "users":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "finance":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "referral":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case "support":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "user":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "overview":
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
  }
}

export default function GlobalSearchBox({ role = "ADMIN", placeholder = "Search anything...", onExpandChange }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    return role?.toUpperCase() === "DSA" ? DSA_SEARCH_ITEMS : ADMIN_SEARCH_ITEMS;
  }, [role]);

  // Filter items based on user input
  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(trimmed);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(trimmed);
      const matchCategory = item.category.toLowerCase().includes(trimmed);
      const matchDescription = item.description?.toLowerCase().includes(trimmed);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(trimmed));

      return matchTitle || matchSubtitle || matchCategory || matchDescription || matchKeywords;
    });
  }, [query, items]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Auto-scroll selected item into view when navigating with Arrow Up / Down keys
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl && typeof selectedEl.scrollIntoView === "function") {
        selectedEl.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex, isOpen]);

  // Open & focus helper
  const handleOpen = useCallback(() => {
    setIsExpanded(true);
    onExpandChange?.(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [onExpandChange]);

  const handleOpenRef = useRef(handleOpen);
  useEffect(() => {
    handleOpenRef.current = handleOpen;
  }, [handleOpen]);

  // Close helper
  const handleClose = useCallback(() => {
    setIsExpanded(false);
    onExpandChange?.(false);
    setIsOpen(false);
    setQuery("");
  }, [onExpandChange]);

  // Close dropdown and collapse search box on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClose]);

  // Global Ctrl + K / Cmd + K shortcut to expand and focus search (Desktop only)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Disable shortcut on mobile views
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        return;
      }

      const isK = (e.key && e.key.toLowerCase() === "k") || e.code === "KeyK";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        e.stopPropagation();
        handleOpenRef.current?.();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown, true);
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, []);

  // Handle keyboard navigation inside search input
  const handleKeyDown = (e) => {
    if (!isOpen || filteredItems.length === 0) {
      if (e.key === "Escape") {
        handleClose();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleSelectItem = (item) => {
    handleClose();
    router.push(item.path);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-end transition-[width,max-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded ? "w-full max-w-[calc(100vw-120px)] sm:w-80 md:w-96 sm:max-w-none" : "w-8.5"
      }`}
    >
      {!isExpanded ? (
        /* Collapsed State: Same squarish border & bg as notification icon */
        <button
          type="button"
          onClick={handleOpen}
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-md bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Search pages, settings (⌘K)"
          aria-label="Search"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      ) : (
        /* Expanded State: Transparent Squarish Box, Light Slate Border, No Shadow */
        <div className="relative flex items-center w-full transition-opacity duration-300 ease-out">
          {/* Search Icon inside Input */}
          <div className="absolute left-2.5 text-slate-400 pointer-events-none flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Squarish Transparent Input with Light Slate Border */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            style={{
              WebkitUserSelect: "text",
              userSelect: "text",
            }}
            className="w-full h-8.5 bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-[13px] font-normal pl-8 pr-8 rounded-md border border-slate-200/80 focus:border-slate-300 outline-none shadow-none transition-colors select-text cursor-text"
          />

          {/* Single Cross Button: Clears text when text exists, Collapses search box when empty */}
          <button
            type="button"
            onClick={() => {
              if (query) {
                setQuery("");
                inputRef.current?.focus();
              } else {
                handleClose();
              }
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md cursor-pointer"
            title={query ? "Clear search text" : "Close search (Esc)"}
            aria-label={query ? "Clear search text" : "Close search"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating Suggestions Dropdown (Full Width on Mobile, Expanded on Tablet/Desktop) */}
      {isExpanded && isOpen && query.trim().length > 0 && (
        <div className="fixed left-3 right-3 top-[66px] sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-[460px] md:w-[520px] sm:max-w-[calc(100vw-32px)] mt-1.5 bg-white rounded-md border border-slate-200/80 shadow-lg sm:shadow-none py-1 z-50 overflow-hidden">
          {filteredItems.length > 0 ? (
            <div
              ref={listRef}
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0"
            >
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md transition-colors cursor-pointer my-0.5 ${
                      isSelected ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {/* Icon + Title + Description */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${
                          isSelected ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {getSearchIcon(item.icon)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[11px] text-slate-400 font-normal truncate">
                              • {item.subtitle}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Category Tag */}
                    <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-slate-500 font-medium">
                No results found for <span className="text-slate-800 font-semibold">"{query}"</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try searching with another keyword
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
