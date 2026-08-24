"use client";

import React, { useState, useEffect } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Topbar({
  role,
  userName: propUserName = "",
  activeTab = "overview",
  onToggleMobileSidebar = () => {},
  onSelectNotification = () => {},
}) {
  const [now, setNow] = useState(null);
  const [adminName, setAdminName] = useState(propUserName || "Admin User");

  const getPageTitle = (tab) => {
    switch (tab) {
      case "dsa-applications":
        return "DSA Applications";
      case "dsa":
        return "DSA Users";
      case "customer-applications":
        return "Customer Applications";
      case "settings":
      case "company-location":
      case "bank-master":
        return "Settings";
      case "profile":
        return "My Profile";
      case "overview":
      default:
        return "Dashboard";
    }
  };

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
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 transition-all select-none">
      {/* Left: Mobile Sidebar Toggle & Active Page Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          aria-label="Toggle mobile menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Current Active Section Name */}
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
          {getPageTitle(activeTab)}
        </h2>
      </div>

      {/* Right: Real-time Notifications & Live Clock */}
      <div className="flex items-center gap-3 sm:gap-4 ml-auto shrink-0">
        {/* Connected Backend Notification Dropdown */}
        <NotificationDropdown onSelectNotification={onSelectNotification} />

        {/* Subtle Vertical Divider */}
        <div className="h-6 w-px bg-slate-200/80 shrink-0" />

        {/* Live Date & Time Block */}
        <div className="flex flex-col text-right leading-tight select-none shrink-0 min-w-[96px] sm:min-w-[104px]">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight tabular-nums">
            {formatTime(now)}
          </span>
          <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-slate-500">
            <span>{formatDay(now)},</span>
            <span className="text-slate-400">{formatDate(now)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}


