"use client";

import React, { useState, useRef, useEffect } from "react";

export default function Sidebar({
  navItems = [],
  activeTab,
  setActiveTab,
  role = "dsa",
  dsaName: propDsaName = "",
  onLogout,
  isMobileOpen = false,
  onCloseMobile = () => {},
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [dsaName, setDsaName] = useState(propDsaName || "");
  const [dsaRole, setDsaRole] = useState(role || "DSA");

  useEffect(() => {
    const cachedName = propDsaName || localStorage.getItem("userName") || localStorage.getItem("name");
    const cachedRole = localStorage.getItem("role") || role;
    if (cachedName) setDsaName(cachedName);
    if (cachedRole) setDsaRole(cachedRole);
  }, [role, propDsaName]);

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowProfileMenu(false);
    if (typeof setActiveTab === "function") {
      setActiveTab("profile");
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

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

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Helper to render icon (supports emoji or SVG icon names)
  const renderNavIcon = (icon) => {
    if (typeof icon === "string" && icon.length <= 2) {
      return <span className="text-sm leading-none">{icon}</span>;
    }
    switch (icon) {
      case "overview":
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
      case "customers":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "commission":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-8e-3" />
          </svg>
        );
      case "support":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return <span className="text-sm leading-none">{icon}</span>;
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
          <span className="text-[11px] font-medium text-slate-500">DSA Portal</span>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            NAVIGATION
          </p>
          <div className="space-y-0.5 pt-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={isActive ? "text-slate-900" : "text-slate-500"}>
                    {renderNavIcon(item.icon)}
                  </span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 border border-slate-300 text-slate-800 shrink-0 font-semibold text-xs">
            {dsaName ? dsaName.charAt(0).toUpperCase() : "D"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
              {dsaName || "DSA Agent"}
            </p>
            <p className="truncate text-[11px] font-normal text-slate-500 leading-tight">
              {dsaRole || "DSA"}
            </p>
          </div>
          <svg className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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