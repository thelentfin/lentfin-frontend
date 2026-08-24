"use client";

import React, { useState, useRef, useEffect } from "react";

export default function Sidebar({
  navItems = [],
  activeTab,
  setActiveTab,
  role,
  onLogout,
  pendingCount = 24,
  isMobileOpen = false,
  onCloseMobile = () => {},
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("Admin");
  const profileMenuRef = useRef(null);

  // Read authenticated Admin user details from localStorage & props
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("userName") || localStorage.getItem("name");
      const storedRole = role || localStorage.getItem("role");

      if (storedName && !storedName.includes("@")) {
        setAdminName(storedName.trim());
      } else if (storedName && storedName.includes("@")) {
        const prefix = storedName.split("@")[0];
        setAdminName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
      } else {
        setAdminName("Admin");
      }

      if (storedRole) {
        const formatted = String(storedRole).toUpperCase() === "ADMIN" ? "Admin" : String(storedRole);
        setAdminRole(formatted);
      } else {
        setAdminRole("Admin");
      }
    }
  }, [role]);

  const getInitials = (name) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowProfileMenu(false);
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowProfileMenu(false);
    if (typeof setActiveTab === "function") {
      setActiveTab("profile");
    }
    onCloseMobile();
  };

  const handleNavClick = (id) => {
    setActiveTab(id);
    onCloseMobile();
  };

  // Structured nav items matching reference design groupings
  const navGroups = [
    {
      group: "OVERVIEW",
      items: [{ id: "overview", label: "Dashboard", icon: "dashboard" }],
    },
    {
      group: "DSA MANAGEMENT",
      items: [
        { id: "dsa-applications", label: "DSA Applications", icon: "applications", badge: pendingCount },
        { id: "dsa", label: "DSA Users", icon: "users" },
        { id: "customer-applications", label: "Customer Applications", icon: "customer-apps" },
      ],
    },
    {
      group: "SYSTEM",
      items: [{ id: "settings", label: "Settings", icon: "settings" }],
    },
  ];

  const renderIcon = (type) => {
    switch (type) {
      case "dashboard":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "applications":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "users":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "customer-apps":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "profile":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "settings":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200/80 text-slate-900 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white font-semibold shadow-xs">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-slate-900">LENTFIN</span>
          <span className="text-[11px] font-medium text-slate-500">Admin Portal</span>
        </div>
      </div>

      {/* Nav Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              {group.group}
            </p>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={isActive ? "text-slate-900" : "text-slate-500"}>
                      {renderIcon(item.icon)}
                    </span>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium tabular-nums ${
                        isActive ? "bg-slate-200 text-slate-900 font-semibold" : "bg-slate-100 text-slate-600 border border-slate-200/80"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Profile Footer */}
      <div className="relative border-t border-slate-200/80 p-3 shrink-0" ref={profileMenuRef}>
        {/* Profile Menu Popup */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-md bg-white border border-slate-200/80 shadow-lg p-1 space-y-0.5 z-50">
            <button
              type="button"
              onMouseDown={handleProfileClick}
              onClick={handleProfileClick}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>My Profile</span>
            </button>
            <button
              type="button"
              onMouseDown={handleLogoutClick}
              onClick={handleLogoutClick}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Profile Card Button */}
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex w-full items-center gap-3 rounded-md border p-2 transition-colors cursor-pointer text-left ${
            activeTab === "profile"
              ? "bg-slate-100 border-slate-300 text-slate-900"
              : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 border border-slate-300 text-slate-800 shrink-0 font-semibold text-xs uppercase">
            {getInitials(adminName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
              {adminName || "Admin"}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500 leading-tight">
              {adminRole || "Administrator"}
            </p>
          </div>
          <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-64">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 transition-transform duration-300 lg:hidden ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
}



