"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import ColorfulUserAvatar from "@/components/ColorfulUserAvatar";
import PasswordValidationFeedback, { validatePassword } from "@/components/PasswordValidationFeedback";

export default function MyProfile({ dsaName: propDsaName = "", dsaProfile = null }) {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "DSA",
    userId: "#DSA-001",
    status: "Active",
    createdAt: "Active Session",
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Send OTP, Step 2: Verify OTP, Step 3: Change Password, Step 4: Success
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const storedName =
      dsaProfile?.name ||
      propDsaName ||
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      "";

    const storedEmail =
      dsaProfile?.email ||
      localStorage.getItem("userEmail") ||
      localStorage.getItem("email") ||
      "";

    const storedRole = dsaProfile?.role || localStorage.getItem("role") || "DSA";

    let userId = dsaProfile?.dsa_code || dsaProfile?.id || null;
    let createdAt = dsaProfile?.created_at
      ? new Date(dsaProfile.created_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

    try {
      const token = localStorage.getItem("token");
      if (token) {
        const base64Url = token.split(".")[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const parsed = JSON.parse(jsonPayload);
          if (!userId && parsed.id) userId = parsed.id;
          if (!createdAt && parsed.iat) {
            createdAt = new Date(parsed.iat * 1000).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        }
      }
    } catch (e) {
      // Graceful fallback
    }

    setProfile((prev) => ({
      ...prev,
      name: storedName,
      email: storedEmail,
      role: storedRole,
      userId: userId ? (String(userId).startsWith("#") ? userId : `#DSA-${String(userId).padStart(3, "0")}`) : prev.userId,
      createdAt: createdAt || prev.createdAt,
      status: dsaProfile?.status || prev.status,
    }));
  }, [propDsaName, dsaProfile]);

  // Handle Open Password Reset Modal
  const handleOpenModal = () => {
    setStep(1);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage("");
    setSuccessMessage("");
    setShowPasswordModal(true);
  };

  // Step 1: Send OTP Handler (API: POST /api/dsa-password/dsa-forgot-password)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Authentication session expired. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    // Smooth 2.2 second transition into OTP step while email dispatches
    const transitionTimer = setTimeout(() => {
      setStep(2);
      setIsSubmitting(false);
    }, 2200);

    try {
      const res = await fetch(`${API_BASE_URL}/dsa-password/dsa-forgot-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.status) {
        clearTimeout(transitionTimer);
        setStep(2);
        const msg = data.message || `OTP verification code sent to ${profile.email}`;
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        clearTimeout(transitionTimer);
        setStep(1);
        const errMsg = data.message || "Failed to send OTP email. Please try again.";
        setErrorMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      clearTimeout(transitionTimer);
      setStep(1);
      const errMsg = "Failed to connect to server. Please check your network and try again.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP Handler (API: POST /api/dsa-password/dsa-verify-otp)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setErrorMessage("Please enter the 4-digit OTP code sent to your email.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Authentication session expired. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/dsa-password/dsa-verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: trimmedOtp }),
      });

      const data = await res.json();

      if (data.status) {
        setStep(3);
        setSuccessMessage("");
        setErrorMessage("");
        toast.success(data.message || "OTP verified successfully!");
      } else {
        const errMsg = data.message || "Invalid or expired OTP. Please check and try again.";
        setErrorMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please check your network and try again.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Update Password Handler (API: POST /api/dsa-password/dsa-reset-password)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validation = validatePassword(newPassword, confirmPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Authentication session expired. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/dsa-password/dsa-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const data = await res.json();

      if (data.status) {
        setStep(4);
        const msg = data.message || "Password updated successfully!";
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        const errMsg = data.message || "Failed to update password. Please try again.";
        setErrorMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please check your network and try again.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-10">
      {/* 1. Hero Identity Card with Original Gradient */}
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-purple-600/15 via-indigo-500/10 to-pink-500/15 p-6 shadow-2xs">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="w-18 h-18 rounded-full overflow-hidden ring-4 ring-white shadow-xs border border-slate-200/60 bg-white">
              <ColorfulUserAvatar role="dsa" className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Active" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {profile.name || "DSA Partner"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/95 text-purple-700 border border-purple-200 shadow-2xs">
                {profile.role || "DSA"}
              </span>
            </div>
            {profile.email && (
              <p className="text-xs text-slate-600 mt-1 truncate font-medium">
                {profile.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Personal Information SaaS Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal identity details and DSA partner credentials.
            </p>
          </div>
        </div>

        {/* Key-Value Rows */}
        <div className="divide-y divide-slate-100 text-xs">
          {/* Full Name */}
          <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Full Name
            </span>
            <span className="font-semibold text-slate-900 sm:col-span-2">{profile.name || "N/A"}</span>
          </div>

          {/* Email Address with Copy Button */}
          <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Address
            </span>
            <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900 truncate">{profile.email || "N/A"}</span>
              {profile.email && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(profile.email);
                    toast.success("Email copied to clipboard");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200/80 transition-colors cursor-pointer"
                  title="Copy Email"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
            </div>
          </div>

          {/* System Role */}
          <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              System Role
            </span>
            <div className="sm:col-span-2 flex items-center gap-2">
              <span className="font-semibold text-slate-900">{profile.role || "DSA"}</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                Direct Selling Agent
              </span>
            </div>
          </div>

          {/* Account Identifier */}
          <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              DSA Code / ID
            </span>
            <div className="sm:col-span-2 flex items-center gap-2">
              <span className="font-mono text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                {profile.userId}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(profile.userId);
                  toast.success("DSA Code copied to clipboard");
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200/80 transition-colors cursor-pointer"
                title="Copy DSA Code"
              >
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>

          {/* Member Since */}
          <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Member Since
            </span>
            <span className="font-medium text-slate-900 sm:col-span-2 tabular-nums">
              {profile.createdAt}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Security & Authentication Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Security & Authentication
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Password credentials and active security safeguards.
            </p>
          </div>
        </div>

        {/* Security Rows */}
        <div className="divide-y divide-slate-100 text-xs">
          {/* Account Password */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Account Password</span>
                <span className="font-mono text-slate-500 tracking-widest text-xs">••••••••••••••••</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Password changes require email OTP verification sent to {profile.email || "your email"}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-3.5 py-1.5 rounded-lg btn-primary text-white font-medium text-xs shadow-xs hover:shadow-sm cursor-pointer transition-all active:scale-98 self-start sm:self-auto shrink-0"
            >
              Update Password
            </button>
          </div>

          {/* OTP / 2FA Safeguard */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Two-Factor OTP Safeguard</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                One-time passcode (OTP) verification is enforced on your registered email address.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium self-start sm:self-auto shrink-0">
              Secured by LentFin Auth
            </span>
          </div>

          {/* Active Session */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/80 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Current Active Session</p>
                <p className="text-[11px] text-slate-500">Signed in via Web Browser • JWT Authenticated Session</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Current Device
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-lg max-w-md w-full p-5 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer text-xs"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && step < 3 && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs flex items-center gap-2">
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Send OTP */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={profile.email || "Email not specified"}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-md p-2 text-xs font-medium text-slate-600 cursor-not-allowed select-none"
                  />
                  <p className="text-[11px] text-slate-400 font-normal">
                    A one-time verification OTP will be sent to your registered email address.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded-md btn-primary text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Enter Verification OTP
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md p-2 text-xs font-mono tracking-widest text-slate-900 outline-none transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 font-normal">
                    Check your email inbox for the 4-digit OTP code.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    ← Resend OTP
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !otp.trim()}
                    className="px-3.5 py-1.5 rounded-md btn-primary text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md p-2 pr-9 text-xs text-slate-900 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showNewPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.88 9.88a3 3 0 104.24 4.24M6.1 6.1l11.8 11.8" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md p-2 pr-9 text-xs text-slate-900 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showConfirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.88 9.88a3 3 0 104.24 4.24M6.1 6.1l11.8 11.8" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="pt-0.5">
                      {newPassword === confirmPassword ? (
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Passwords match
                        </p>
                      ) : (
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50/80 border border-rose-200/70 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Real-time SaaS Requirement Checklist & Strength Bar (Shown under Confirm Password, No Card) */}
                <PasswordValidationFeedback
                  password={newPassword}
                  confirmPassword={confirmPassword}
                  showConfirmMatch={false}
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !validatePassword(newPassword, confirmPassword).isValid
                    }
                    className="px-3.5 py-1.5 rounded-md btn-primary text-white font-medium text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <div className="text-center py-4 space-y-3">
                <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-semibold text-lg flex items-center justify-center mx-auto">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Password Changed Successfully
                  </h4>
                  <p className="text-xs text-slate-500 font-normal">
                    Your password has been reset. Please use your new password for future logins.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full py-2 rounded-md btn-primary text-white font-medium text-xs cursor-pointer"
                >
                  Close & Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
