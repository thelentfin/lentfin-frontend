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
  onCloseMobile = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
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
      default:
        return null;
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

        {/* Nav Section */}
        <div
          className={`flex-1 overflow-y-auto ${
            isCollapsedState ? "px-2 py-3 space-y-4" : "px-3 py-4 space-y-5"
          } custom-scrollbar`}
        >
          {navGroups.map((group, idx) => (
            <div key={idx} className={isCollapsedState ? "space-y-1.5" : "space-y-1"}>
              {isCollapsedState ? (
                idx > 0 && <div className="h-px bg-slate-200/60 my-2 mx-1" />
              ) : (
                <p className="px-3 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                  {group.group}
                </p>
              )}
              <div className={isCollapsedState ? "space-y-1.5 flex flex-col items-center" : "space-y-0.5 pt-1"}>
                {group.items.map((item) => {
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
                            {renderIcon(item.icon)}
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
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="rounded bg-[#B063FF] px-1 py-0.2 text-[10px] font-bold text-white">
                                {item.badge}
                              </span>
                            )}
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
                        {renderIcon(item.icon)}
                      </span>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium tabular-nums ${
                            isActive
                              ? "bg-[#B063FF]/20 text-[#B063FF] font-bold"
                              : "bg-slate-100 text-slate-600 border border-slate-200/80"
                          }`}
                        >
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

          {isCollapsedState ? (
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden shadow-xs ring-2 ring-slate-200/80 hover:ring-purple-400 shrink-0 cursor-pointer transition-all active:scale-95"
              title={`${adminName || "Admin"} (${adminRole || "Administrator"})`}
            >
              <ColorfulUserAvatar role="admin" className="w-full h-full object-cover" />
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
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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



