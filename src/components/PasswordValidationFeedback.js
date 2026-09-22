"use client";

import React from "react";

/**
 * Validates whether a password satisfies real SaaS enterprise requirements:
 * 1. At least 8 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 number (0-9)
 * 4. At least 1 special character (!@#$%^&*...)
 * 5. Matches confirmPassword (if provided)
 */
export function validatePassword(password = "", confirmPassword = undefined) {
  const pwd = String(password || "");
  const hasLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pwd);

  if (!pwd) {
    return { isValid: false, message: "New password is required." };
  }
  if (!hasLength) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  if (!hasUppercase) {
    return { isValid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!hasNumber) {
    return { isValid: false, message: "Password must contain at least one number (0-9)." };
  }
  if (!hasSpecial) {
    return { isValid: false, message: "Password must contain at least one special character (!@#$%^&*)." };
  }
  if (confirmPassword !== undefined && pwd !== confirmPassword) {
    return { isValid: false, message: "New password and confirm password do not match." };
  }

  return { isValid: true, message: "" };
}

/**
 * Calculates strength score (0 to 4)
 */
export function getPasswordStrength(password = "") {
  const pwd = String(password || "");
  if (!pwd) return { score: 0, label: "", colorClass: "bg-slate-200", textClass: "text-slate-400" };

  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pwd)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", colorClass: "bg-rose-500", textClass: "text-rose-600" };
    case 2:
      return { score: 2, label: "Fair", colorClass: "bg-amber-500", textClass: "text-amber-600" };
    case 3:
      return { score: 3, label: "Good", colorClass: "bg-blue-500", textClass: "text-blue-600" };
    case 4:
      return { score: 4, label: "Strong", colorClass: "bg-emerald-500", textClass: "text-emerald-600" };
    default:
      return { score: 0, label: "", colorClass: "bg-slate-200", textClass: "text-slate-400" };
  }
}

/**
 * PasswordValidationFeedback
 * Interactive Real SaaS Password Checklist & Strength Bar
 */
export default function PasswordValidationFeedback({
  password = "",
  confirmPassword = "",
  showConfirmMatch = false,
  className = "",
}) {
  const pwd = String(password || "");
  const confirm = String(confirmPassword || "");

  const hasLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pwd);

  const { score, label, colorClass, textClass } = getPasswordStrength(pwd);

  const requirements = [
    { label: "8+ characters", met: hasLength },
    { label: "1 uppercase (A-Z)", met: hasUppercase },
    { label: "1 number (0-9)", met: hasNumber },
    { label: "1 special symbol", met: hasSpecial },
  ];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Strength Bar (displays as soon as user types) */}
      {pwd.length > 0 && (
        <div className="space-y-1 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Password Strength:</span>
            <span className={`font-semibold ${textClass}`}>{label}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full rounded-full transition-all duration-300 ${
                  score >= step ? colorClass : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Seamless Requirement Checklist (No Card Container) */}
      <div className="pt-0.5 space-y-1">
        <p className="text-[11px] font-medium text-slate-500">
          Must contain:
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {requirements.map((req, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${
                req.met ? "text-emerald-600 font-medium" : "text-slate-400"
              }`}
            >
              {req.met ? (
                <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </span>
              )}
              <span className="truncate">{req.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Confirm Password Match Indicator */}
      {showConfirmMatch && confirm.length > 0 && (
        <div className="pt-0.5 animate-fadeIn">
          {pwd === confirm ? (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2 py-0.5 rounded-md">
              <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Passwords match
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50/80 border border-rose-200/70 px-2 py-0.5 rounded-md">
              <svg className="w-3 h-3 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Passwords do not match
            </p>
          )}
        </div>
      )}
    </div>
  );
}
