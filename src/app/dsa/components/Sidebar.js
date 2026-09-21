"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import ColorfulUserAvatar from "@/components/ColorfulUserAvatar";

export default function Sidebar({
  navItems = [],
  activeTab,
  setActiveTab,
  role = "dsa",
  dsaName: propDsaName = "",
  onLogout,
  isMobileOpen = false,
  onCloseMobile = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}) {
  const router = useRouter();
  const pathname = usePathname() || "";
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

  const getNavPath = (id) => {
    switch (id) {
      case "overview":
        return "/dsa";
      case "customer-applications":
        return "/dsa/customer-applications";
      case "support":
        return "/dsa/support";
      case "profile":
        return "/dsa/profile";
      default:
        return `/dsa/${id}`;
    }
  };

  const isItemActive = (itemId) => {
    if (activeTab === itemId) return true;
    if (itemId === "overview") return pathname === "/dsa";
    if (itemId === "customer-applications") {
      return pathname.startsWith("/dsa/customer-applications");
    }
    if (itemId === "support") {
      return (
        pathname.startsWith("/dsa/support") ||
        (typeof activeTab === "string" && activeTab.startsWith("support"))
      );
    }
    if (itemId === "profile") return pathname.startsWith("/dsa/profile");
    return false;
  };

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowProfileMenu(false);
    router.push("/dsa/profile");
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
    router.push(getNavPath(id));
    if (typeof setActiveTab === "function") {
      setActiveTab(id);
    }
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

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsedState = isMobile ? false : isCollapsed;

    return (
      <div
        className={`flex h-full flex-col bg-white border-r border-slate-200/80 text-slate-900 select-none transition-[width] duration-300 ease-in-out ${
          isCollapsedState ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        {isCollapsedState ? (
          <div className="relative flex h-16 items-center justify-center border-b border-slate-200/80 shrink-0 px-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="group flex items-center justify-center p-1 rounded-lg hover:bg-slate-100/70 transition-all cursor-pointer"
              title="Expand sidebar"
            >
              <Image
                src="/lentfinIcon.png"
                alt="LentFin Mark"
                width={32}
                height={32}
                priority
                className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-xs text-slate-500 hover:text-[#B063FF] hover:border-[#B063FF] hover:bg-[#B063FF]/5 transition-all cursor-pointer"
              title="Expand sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-between pl-6 pr-4 border-b border-slate-200/80 shrink-0">
            <Image
              src="/lentfinLogo.png"
              alt="LentFin Logo"
              width={130}
              height={36}
              priority
              className="h-8 w-auto object-contain"
            />
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-slate-200/80 text-slate-500 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation items */}
        <div
          className={`flex-1 overflow-y-auto ${
            isCollapsedState ? "px-2 py-3 space-y-4" : "px-3 py-4 space-y-5"
          } custom-scrollbar`}
        >
          <div className={isCollapsedState ? "space-y-1.5 flex flex-col items-center" : "space-y-1"}>
            {!isCollapsedState && (
              <p className="px-3 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                NAVIGATION
              </p>
            )}
            <div className={isCollapsedState ? "space-y-1.5 flex flex-col items-center w-full" : "space-y-0.5 pt-1"}>
              {navItems.map((item) => {
                const isActive = isItemActive(item.id);

                if (isCollapsedState) {
                  return (
                    <div key={item.id} className="relative group flex items-center justify-center w-full">
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#B063FF]/12 text-[#B063FF] ring-1 ring-[#B063FF]/30 shadow-xs shadow-[#B063FF]/10 font-bold"
                            : "text-slate-600 hover:bg-[#B063FF]/5 hover:text-[#B063FF]"
                        }`}
                        title={item.label}
                      >
                        <span className={`${isActive ? "text-[#B063FF] scale-105" : "text-slate-500 group-hover:text-[#B063FF]"} transition-all duration-150`}>
                          {renderNavIcon(item.icon)}
                        </span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#B063FF] text-[9px] font-bold text-white ring-2 ring-white tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Floating Tooltip */}
                      <div className="pointer-events-none absolute left-full ml-2.5 z-50 hidden group-hover:flex items-center">
                        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                          <span>{item.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#B063FF]/10 text-[#B063FF] font-bold"
                        : "text-slate-600 hover:bg-[#B063FF]/5 hover:text-[#B063FF] font-medium"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#B063FF] rounded-r-md" />
                    )}
                    <span className={isActive ? "text-[#B063FF]" : "text-slate-500 transition-colors"}>
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
        <div
          className={`relative border-t border-slate-200/80 shrink-0 ${
            isCollapsedState ? "p-2 flex justify-center" : "p-3"
          }`}
          ref={profileMenuRef}
        >
          {/* Profile Menu Popup */}
          {showProfileMenu && (
            <div
              className={`absolute z-50 rounded-lg bg-white border border-slate-200/80 shadow-xl p-1.5 space-y-1 ${
                isCollapsedState
                  ? "bottom-2 left-full ml-2 w-48"
                  : "bottom-full left-3 right-3 mb-2"
              }`}
            >
              {isCollapsedState && (
                <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200/80">
                    <ColorfulUserAvatar role="dsa" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                      {dsaName || "DSA Agent"}
                    </p>
                    <p className="truncate text-[11px] font-normal text-slate-500 leading-tight">
                      {dsaRole || "DSA"}
                    </p>
                  </div>
                </div>
              )}
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

          {isCollapsedState ? (
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden shadow-xs ring-2 ring-slate-200/80 hover:ring-purple-400 shrink-0 cursor-pointer transition-all active:scale-95"
              title={`${dsaName || "DSA Agent"} (${dsaRole || "DSA"})`}
            >
              <ColorfulUserAvatar className="w-full h-full object-cover" />
            </button>
          ) : (
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2 transition-colors cursor-pointer text-left ${
                  isItemActive("profile")
                    ? "bg-slate-100 border-slate-300 text-slate-900"
                    : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full overflow-hidden shrink-0 shadow-2xs ring-1 ring-slate-200/80">
                <ColorfulUserAvatar role="dsa" className="w-full h-full object-cover" />
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
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 transition-transform duration-300 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}