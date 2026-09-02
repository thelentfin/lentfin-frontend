"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

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

    try {
      const res = await fetch(`${API_BASE_URL}/dsa-password/dsa-forgot-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.status) {
        setStep(2);
        const msg = data.message || `OTP verification code sent to ${profile.email}`;
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        const errMsg = data.message || "Failed to send OTP email. Please try again.";
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
        const msg = data.message || "OTP verified successfully. Please enter your new password.";
        setSuccessMessage(msg);
        toast.success(msg);
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

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
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

  const getInitials = (name) => {
    if (!name) return "DS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Profile Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-sm border border-slate-200/80 shrink-0">
            {getInitials(profile.name)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                {profile.name || "DSA Partner"}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {profile.status}
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-900">{profile.role}</span>
              {profile.email && (
                <>
                  <span className="mx-2 text-slate-300">•</span>
                  <span>{profile.email}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200/80 pb-2">
          Account Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Full Name</span>
            <span className="font-semibold text-slate-900 mt-0.5 block text-xs">{profile.name || "N/A"}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Email Address</span>
            <span className="font-medium text-slate-900 mt-0.5 block text-xs truncate">{profile.email || "N/A"}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">System Role</span>
            <span className="font-medium text-slate-900 mt-0.5 block text-xs">{profile.role}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Account Status</span>
            <span className="font-medium text-emerald-700 mt-0.5 block text-xs">{profile.status}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Member Since</span>
            <span className="font-normal text-slate-700 mt-0.5 block text-xs tabular-nums">{profile.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Security Section (Change Password) */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200/80 pb-2">
          Security & Password
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 text-xs">
          <div className="space-y-1">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Account Password
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-600 font-medium tracking-widest text-xs">
                ••••••••••••••••
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="px-3.5 py-1.5 rounded-md btn-primary text-white font-medium text-xs cursor-pointer self-start sm:self-auto"
          >
            Change Password
          </button>
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

            {successMessage && step < 4 && (
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
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md p-2 pr-9 text-xs text-slate-900 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md p-2 pr-9 text-xs text-slate-900 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-red-600 font-medium">
                      Passwords do not match.
                    </p>
                  )}
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
                    disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
                    className="px-3.5 py-1.5 rounded-md btn-primary text-white font-medium text-xs cursor-pointer disabled:opacity-50"
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
