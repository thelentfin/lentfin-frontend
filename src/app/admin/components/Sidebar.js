"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import ColorfulUserAvatar from "@/components/ColorfulUserAvatar";

export default function Sidebar({
  navItems = [],
  activeTab,
  setActiveTab,
  role,
  onLogout,
  pendingCount = 24,
  isMobileOpen = false,
  onCloseMobile = () => { },
  isCollapsed = false,
  onToggleCollapse = () => { },
}) {
  const router = useRouter();
  const pathname = usePathname() || "";
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

  const getNavPath = (id) => {
    switch (id) {
      case "overview":
        return "/admin";
      case "dsa-applications":
        return "/admin/dsa-applications";
      case "dsa":
        return "/admin/dsa-users";
      case "customer-applications":
        return "/admin/customer-applications";
      case "support-tickets":
        return "/admin/support-tickets";
      case "settings":
        return "/admin/settings";
      case "settlements":
        return "/admin/settlements";
      case "profile":
        return "/admin/profile";
      default:
        return `/admin/${id}`;
    }
  };

  const isItemActive = (itemId) => {
    if (activeTab === itemId) return true;
    if (itemId === "overview") return pathname === "/admin";
    if (itemId === "dsa-applications") return pathname.startsWith("/admin/dsa-applications");
    if (itemId === "dsa") return pathname.startsWith("/admin/dsa-users") || pathname === "/admin/dsa";
    if (itemId === "customer-applications") return pathname.startsWith("/admin/customer-applications");
    if (itemId === "support-tickets") return pathname.startsWith("/admin/support-tickets");
    if (itemId === "settings") {
      return (
        pathname.startsWith("/admin/settings") ||
        pathname.startsWith("/admin/company-location") ||
        pathname.startsWith("/admin/bank-master")
      );
    }
    if (itemId === "settlements") return pathname.startsWith("/admin/settlements");
    if (itemId === "profile") return pathname.startsWith("/admin/profile");
    return false;
  };

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowProfileMenu(false);
    router.push("/admin/profile");
    if (typeof setActiveTab === "function") {
      setActiveTab("profile");
    }
    onCloseMobile();
  };

  const handleNavClick = (id) => {
    router.push(getNavPath(id));
    if (typeof setActiveTab === "function") {
      setActiveTab(id);
    }
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
        { id: "support-tickets", label: "Support Tickets", icon: "support" },
      ],
    },
    {
      group: "FINANCIAL MANAGEMENT",
      items: [
        { id: "settlements", label: "Settlements & Commission", icon: "settlements" },
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
      case "support":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
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
      case "settlements":
      case "commission":
        return (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsedState = isMobile ? false : isCollapsed;

    return (
      <div className="flex h-full w-full flex-col bg-white border-r border-slate-200/80 text-slate-900 select-none">
        {/* Brand Header */}
        <div className="relative flex h-16 items-center px-4 border-b border-slate-200/80 shrink-0">
          {/* Full Logo: smoothly fades when collapsing */}
          <div
            className={`flex items-center pl-5 transition-opacity duration-300 ease-in-out ${isCollapsedState ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
          >
            <Image
              src="/lentfinLogo.png"
              alt="LentFin Logo"
              width={125}
              height={34}
              priority
              className="h-7.5 w-auto object-contain whitespace-nowrap shrink-0"
            />
          </div>

          {/* Icon Mark: centered in the collapsed width (80px) */}
          <div
            className={`absolute left-0 right-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isCollapsedState
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
              }`}
          >
            <Image
              src="/lentfinIcon.png"
              alt="LentFin Mark"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain shrink-0"
            />
          </div>

          {/* Collapse / Expand Toggle Button: Inverted D (35% of Circle) Inside the Sidebar */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute right-0 top-5 z-40 items-center justify-center h-6 w-2.5 rounded-l-full bg-white border-y border-l border-r-0 border-slate-200/80 text-slate-500 hover:text-[#B063FF] hover:border-[#B063FF]/40 hover:bg-[#B063FF]/5 shadow-xs transition-colors duration-200 cursor-pointer"
            title={isCollapsedState ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-300 ease-in-out ${
                isCollapsedState ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Nav Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-3.5 custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {/* Group Title: smoothly collapses without snapping */}
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isCollapsedState ? "max-h-0 opacity-0 my-0" : "max-h-6 opacity-100 my-1"
                  }`}
              >
                <p className="px-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase whitespace-nowrap">
                  {group.group}
                </p>
              </div>

              {/* Subtle line between groups in collapsed state */}
              <div
                className={`transition-opacity duration-300 ease-in-out ${isCollapsedState && idx > 0 ? "opacity-100 h-px bg-slate-200/60 my-2 mx-1" : "opacity-0 h-0 overflow-hidden"
                  }`}
              />

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isItemActive(item.id);

                  return (
                    <div key={item.id} className="relative group w-full">
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`relative flex w-full items-center h-10 px-2 rounded-lg transition-colors duration-150 cursor-pointer ${
                          isActive
                            ? isCollapsedState
                              ? "text-[#B063FF] font-bold"
                              : "bg-[#B063FF]/10 text-[#B063FF] font-bold"
                            : "text-slate-600 hover:bg-[#B063FF]/5 hover:text-[#B063FF] font-medium"
                        }`}
                      >
                        {/* Active Indicator on Left Border */}
                        <span
                          className={`absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#B063FF] rounded-r-md transition-opacity duration-300 ease-in-out ${isActive && !isCollapsedState ? "opacity-100" : "opacity-0 pointer-events-none"
                            }`}
                        />

                        {/* Icon slot - Rock-solid centered position in both collapsed and expanded */}
                        <span
                          className={`shrink-0 flex items-center justify-center w-10 h-10 transition-transform duration-200 ${isActive ? "text-[#B063FF] scale-105" : "text-slate-500 group-hover:text-[#B063FF]"
                            }`}
                        >
                          {renderIcon(item.icon)}
                        </span>

                        {/* Text Label & Badge: smooth slide & fade without unmounting */}
                        <div
                          className={`ml-1 flex flex-1 items-center justify-between min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${isCollapsedState
                            ? "max-w-0 opacity-0 pointer-events-none"
                            : "max-w-[170px] opacity-100"
                            }`}
                        >
                          <span className="truncate text-left text-[13.5px] whitespace-nowrap">
                            {item.label}
                          </span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`shrink-0 ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium tabular-nums ${isActive
                                ? "bg-[#B063FF]/20 text-[#B063FF] font-bold"
                                : "bg-slate-100 text-slate-600 border border-slate-200/80"
                                }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {/* Badge Indicator for Collapsed State */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#B063FF] text-[9px] font-bold text-white ring-2 ring-white tabular-nums transition-all duration-300 ease-in-out ${isCollapsedState
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-75 pointer-events-none"
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Tooltip on Collapsed State */}
                      {isCollapsedState && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover:flex items-center">
                          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                            <span>{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="rounded bg-[#B063FF] px-1 py-0.2 text-[10px] font-bold text-white">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile Footer */}
        <div className="relative border-t border-slate-200/80 shrink-0 p-3" ref={profileMenuRef}>
          {/* Profile Menu Popup */}
          {showProfileMenu && (
            <div
              className={`absolute z-50 rounded-lg bg-white border border-slate-200/80 shadow-xl p-1.5 space-y-1 ${isCollapsedState
                ? "bottom-2 left-full ml-3 w-48"
                : "bottom-full left-3 right-3 mb-2"
                }`}
            >
              {isCollapsedState && (
                <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200/80">
                    <ColorfulUserAvatar role="admin" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                      {adminName || "Admin"}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500 leading-tight">
                      {adminRole || "Administrator"}
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

          {/* Unified Profile Button */}
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex w-full items-center rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer text-left ${
              isCollapsedState
                ? "justify-center p-0 bg-transparent border border-transparent"
                : "p-2 bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100 gap-2.5"
            }`}
            title={`${adminName || "Admin"} (${adminRole || "Administrator"})`}
          >
            <div
              className={`items-center justify-center rounded-full overflow-hidden shrink-0 shadow-2xs ring-1 ring-slate-200/80 transition-transform duration-200 ${
                isCollapsedState
                  ? "flex h-11 w-11 hover:scale-105"
                  : "flex h-8.5 w-8.5"
              }`}
            >
              <ColorfulUserAvatar role="admin" className="w-full h-full object-cover" />
            </div>

            <div
              className={`flex flex-1 items-center justify-between min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                isCollapsedState ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[170px] opacity-100"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                  {adminName || "Admin"}
                </p>
                <p className="truncate text-[11px] font-medium text-slate-500 leading-tight">
                  {adminRole || "Administrator"}
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 transition-transform duration-300 lg:hidden ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}



