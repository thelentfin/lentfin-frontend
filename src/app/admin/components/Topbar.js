"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import NotificationDropdown from "@/components/NotificationDropdown";
import GlobalSearchBox from "@/components/GlobalSearchBox";

export default function Topbar({
  role,
  userName: propUserName = "",
  activeTab = "overview",
  onToggleMobileSidebar = () => {},
  onSelectNotification = () => {},
  isSidebarCollapsed = false,
  onToggleSidebar = () => {},
}) {
  const [now, setNow] = useState(null);
  const [adminName, setAdminName] = useState(propUserName || "Admin");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem("adminName") ||
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      propUserName;
    if (stored && !stored.includes("@")) {
      setAdminName(stored.trim());
    } else if (propUserName && !propUserName.includes("@")) {
      setAdminName(propUserName.trim());
    }
  }, [propUserName]);

  // Capitalize name cleanly
  const displayName = adminName
    ? adminName.charAt(0).toUpperCase() + adminName.slice(1)
    : "Admin";

  // Live timer tick every 1 second
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format 12-hour time with AM/PM (e.g. 10:42:18 AM)
  const formatTime = (date) => {
    if (!date) return "12:00:00 AM";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Format weekday (e.g. Monday)
  const formatDay = (date) => {
    if (!date) return "Monday";
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  // Format date (e.g. 17 August 2026)
  const formatDate = (date) => {
    if (!date) return "17 August 2026";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 ${
        isSidebarCollapsed ? "lg:left-20" : "lg:left-64"
      } z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 transition-[left] duration-300 ease-in-out`}
    >
      {/* Left: Mobile/Tablet LentFin Logo & Desktop Welcome Greeting */}
      <div className={`items-center gap-3 min-w-0 ${isSearchOpen ? "hidden sm:flex" : "flex"}`}>
        <div
          className={`flex lg:hidden items-center shrink-0 transition-all duration-300 ease-in-out ${
            isSearchOpen
              ? "opacity-0 max-w-0 overflow-hidden pointer-events-none -translate-x-2 sm:opacity-100 sm:max-w-[140px] sm:pointer-events-auto sm:translate-x-0"
              : "opacity-100 max-w-[140px] translate-x-0"
          }`}
        >
          <Image
            src="/lentfinLogo.png"
            alt="LentFin Logo"
            width={115}
            height={32}
            priority
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Desktop Welcome Greeting */}
        <div className="hidden lg:flex items-center gap-2 select-none">
          <span className="text-base sm:text-lg">👋</span>
          <span className="text-[15px] sm:text-base font-medium text-slate-700 tracking-tight">
            Welcome back, <span className="font-bold text-slate-900">{displayName}</span>
          </span>
        </div>
      </div>

      {/* Right: Expandable Search, Notifications, Live Clock & Mobile Sidebar Toggle Button */}
      <div
        className={`flex items-center gap-2.5 sm:gap-4 ml-auto z-10 transition-all duration-300 ease-in-out ${
          isSearchOpen ? "flex-1 justify-end min-w-0 sm:flex-initial sm:shrink-0" : "shrink-0"
        }`}
      >
        {/* Expandable Search Box (Opens from Right to Left) */}
        <GlobalSearchBox role={role || "ADMIN"} placeholder="Search anything..." onExpandChange={setIsSearchOpen} />

        {/* Connected Backend Notification Dropdown */}
        <NotificationDropdown onSelectNotification={onSelectNotification} />

        {/* Subtle Vertical Divider on Desktop */}
        <div className="hidden lg:block h-6 w-px bg-slate-200/80 shrink-0" />

        {/* Live Date & Time Block on Desktop */}
        <div className="hidden lg:flex flex-col text-right leading-tight select-none shrink-0 min-w-[96px] sm:min-w-[104px]">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight tabular-nums">
            {formatTime(now)}
          </span>
          <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-slate-500">
            <span>{formatDay(now)},</span>
            <span className="text-slate-400">{formatDate(now)}</span>
          </div>
        </div>

        {/* Mobile Sidebar Toggle Button at the Far Right */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex lg:hidden h-8.5 w-8.5 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
          aria-label="Toggle mobile menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}


