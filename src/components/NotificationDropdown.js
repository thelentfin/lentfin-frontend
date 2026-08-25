"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  notificationApiService,
  formatRelativeTime,
} from "@/services/notificationApiService";

export default function NotificationDropdown({
  onSelectNotification = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef(null);

  // Helper check: only Admin / Corporate DSA roles are authorized for notifications
  const isAuthorizedRole = () => {
    if (typeof window === "undefined") return false;
    const role = (localStorage.getItem("role") || "").toLowerCase().trim();
    return role === "admin" || role === "corporate_dsa" || role === "corporate dsa";
  };

  // Fetch unread count on mount & every 30 seconds
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthorizedRole()) return;
    const count = await notificationApiService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    if (!isAuthorizedRole()) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notification list when dropdown is opened
  const fetchNotificationsList = async () => {
    if (!isAuthorizedRole()) return;
    setIsLoading(true);
    setErrorMsg("");
    const res = await notificationApiService.getNotifications();
    if (res && res.status) {
      setNotifications(res.data || []);
      // Update unread count from list
      const count = (res.data || []).filter((n) => Number(n.is_read) === 0).length;
      setUnreadCount(count);
    } else {
      setErrorMsg(res?.message || "Unable to load notifications.");
    }
    setIsLoading(false);
  };

  // Toggle dropdown panel
  const handleTogglePanel = () => {
    if (!isAuthorizedRole()) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotificationsList();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification as read & execute action
  const handleNotificationClick = async (notif) => {
    if (Number(notif.is_read) === 0) {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Call API in background
      await notificationApiService.markAsRead(notif.id);
    }

    setIsOpen(false);

    // Call parent handler for navigation / modal popup
    onSelectNotification(notif);
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    // Call API in background
    await notificationApiService.markAllAsRead();
  };

  // Count read notifications
  const readCount = notifications.filter((n) => Number(n.is_read) === 1).length;

  // Clear/delete all read notifications
  const handleClearRead = async () => {
    if (readCount === 0) return;

    // Optimistic UI update — remove read notifications immediately
    const previousNotifications = notifications;
    setNotifications((prev) => prev.filter((n) => Number(n.is_read) === 0));

    // Call API to delete read notifications
    const success = await notificationApiService.deleteAllRead();
    if (!success) {
      // Rollback on API failure
      setNotifications(previousNotifications);
      setErrorMsg("Failed to clear read notifications.");
    }
  };

  // Format unread badge label (e.g. 3 or 99+)
  const renderBadgeText = () => {
    if (unreadCount <= 0) return null;
    if (unreadCount > 99) return "99+";
    return unreadCount;
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* 🔔 Notification Bell Button with Unread Badge */}
      <button
        type="button"
        onClick={handleTogglePanel}
        className="relative flex h-8.5 w-8.5 items-center justify-center rounded-md bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg
          className="w-4 h-4 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center border border-white tabular-nums">
            {renderBadgeText()}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="fixed top-14 right-3.5 sm:absolute sm:top-full sm:right-0 sm:mt-2 w-[calc(100vw-1.75rem)] sm:w-96 max-w-[380px] sm:max-w-none rounded-lg bg-white border border-slate-200/80 shadow-lg z-50 overflow-hidden select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300/60 tabular-nums">
                  {unreadCount} new
                </span>
              )}
            </div>

            {/* Notification Actions: Mark All Read & Clear Read */}
            <div className="flex items-center gap-1">
              {/* Mark all as read */}
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                title="Mark all as read"
                aria-label="Mark all as read"
                className={`p-1 rounded-md transition-colors flex items-center justify-center ${
                  unreadCount > 0
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-300 cursor-not-allowed opacity-40"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                </svg>
              </button>

              {/* Clear read notifications */}
              <button
                type="button"
                onClick={handleClearRead}
                disabled={readCount === 0}
                title="Clear read notifications"
                aria-label="Clear read notifications"
                className={`p-1 rounded-md transition-colors flex items-center justify-center ${
                  readCount > 0
                    ? "text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    : "text-slate-300 cursor-not-allowed opacity-40"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body List Area */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 font-normal space-y-2">
                <div className="inline-block w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                <p>Loading notifications...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-4 text-center text-xs text-red-600 font-normal space-y-2 bg-red-50/50">
                <p>⚠️ {errorMsg}</p>
                <button
                  type="button"
                  onClick={fetchNotificationsList}
                  className="text-[11px] font-medium text-slate-800 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-800">No notifications</p>
                <p className="text-[11px] text-slate-400 font-normal">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = Number(notif.is_read) === 0;
                const isSignup =
                  notif.notification_type === "NEW_DSA_SIGNUP" ||
                  notif.entity_type === "DSA_SIGNUP_REQUEST";

                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-3 transition-colors cursor-pointer flex items-start gap-3 ${
                      isUnread
                        ? "bg-slate-50/80 hover:bg-slate-100/80"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Notification Type Icon Badge */}
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-semibold border ${
                        isSignup
                          ? "bg-slate-100 text-slate-700 border-slate-200/80"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      }`}
                    >
                      {isSignup ? "👤" : "🏦"}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {notif.title || (isSignup ? "New DSA Signup Request" : "Loan Case Submitted")}
                        </p>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight font-normal">
                        {notif.message}
                      </p>

                      <p className="text-[10px] font-normal text-slate-400 mt-1 tabular-nums">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
