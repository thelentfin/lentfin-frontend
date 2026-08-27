"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
//main page changes
// ─── Carousel Slides Data (Finance / Banking / Investment / Business / FinTech) ─
const SLIDES = [
  {
    id: 1,
    imageSrc: "https://images.pexels.com/photos/7172825/pexels-photo-7172825.jpeg",
    imageAlt: "Financial Growth & Investment Management",
    headline: "BUILDING WEALTH.",
    subtext: "LENTFIN FINANCIAL & INVESTMENT",
  },
  
  {
    id: 2,
    imageSrc: "https://images.pexels.com/photos/32990199/pexels-photo-32990199.jpeg",
    imageAlt: "Modern Banking & FinTech Solutions",
    headline: "NEXT-GEN BANKING.",
    subtext: "SECURE & SEAMLESS TRANSACTIONS",
  },
  {
    id: 3,
    imageSrc: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Business Growth & Capital Management",
    headline: "POWERING GROWTH.",
    subtext: "QUALITY CAPITAL SOLUTIONS",
  },
  {
    id: 4,
    imageSrc: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Portfolio Analytics & Market Trading",
    headline: "INTELLIGENT INSIGHTS.",
    subtext: "SMART INVESTMENT MANAGEMENT",
  },
];

// ─── Left Panel: Image Carousel Sub-component ──────────────────────────────
function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const next = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
      setFading(false);
    }, 400);
  }, []);

  // Auto-advance every 4 seconds
  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  const goTo = (index) => {
    if (index === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 400);
  };

  const slide = SLIDES[current];

  return (
    <div className="relative w-full h-full overflow-hidden rounded-l-2xl">
      {/* Background Image */}
      <Image
        src={slide.imageSrc}
        alt={slide.imageAlt}
        fill
        unoptimized
        className="object-cover object-center"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 0.4s ease" }}
      />
      {/* Refined Geometric Overlay for Image Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90 rounded-l-2xl" />



      {/* Bottom Text Overlay */}
      <div
        className="absolute bottom-14 left-6 right-6 z-10"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <p className="text-[#B063FF] text-[11px] font-bold tracking-widest uppercase drop-shadow mb-1">
          {slide.subtext}
        </p>
        <h2 className="text-white font-extrabold text-2xl tracking-wider leading-snug drop-shadow-md">
          {slide.headline}
        </h2>
      </div>

      {/* Dot Indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              borderRadius: "9999px",
              backgroundColor: i === current ? "#B063FF" : "rgba(255,255,255,0.35)",
              boxShadow: i === current ? "0 0 12px rgba(176,99,255,0.8)" : "none",
              border: "none",
              cursor: "pointer",
              transition: "width 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Root Login Page ──────────────────────────────────────────────────────
export default function RootLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  // OTP Verification Modal States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  // Reset Password Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Login Page always displays Login UI on mount. Auto-redirect on mount removed.

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Attempt Main / Admin Login API
      let response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      let data = await response.json();

      // Step 2: Fallback to dedicated DSA Login API if Main Login fails OR returns incomplete DSA data
      const isDsaWithoutName = data.status && (data.role || "").toLowerCase() === "dsa" && !data.name;
      if (!data.status || isDsaWithoutName) {
        try {
          const dsaResponse = await fetch(`${API_BASE_URL}/dsa/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim(),
              password: password,
            }),
          });

          const dsaData = await dsaResponse.json();
          if (dsaData && dsaData.status) {
            data = dsaData;
          }
        } catch (dsaErr) {
          // Keep initial data if secondary request fails
        }
      }

      if (data.status) {
        // Clear previous user identity data
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("name");
        localStorage.removeItem("email");

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        if (data.name) {
          localStorage.setItem("userName", data.name);
        }

        if (data.email) {
          localStorage.setItem("userEmail", data.email);
        }

        const role = (data.role || "").toLowerCase().trim();

        if (role === "admin") {
          toast.success("Login successful. Welcome back!");
          router.push("/admin");
        } else if (role === "dsa") {
          toast.success("Login successful. Welcome back!");
          router.push("/dsa");
        } else {
          setError(`Unknown user role: "${data.role}". Please contact support.`);
        }
      } else {
        const errMsg = data.message || "Invalid email or password";
        setError(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please try again.";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };
  // Forgot Password → Send OTP handler
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();

      if (data.status) {
        const msg = "OTP sent successfully! Please check your email.";
        setForgotMessage(msg);
        toast.success(msg);
        setShowForgotModal(false);
        setShowOtpModal(true);
        setOtpValue("");
        setOtpError("");
        setOtpMessage("");
      } else {
        const errMsg = data.message || "Failed to send OTP. Try again.";
        setForgotError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please try again.";
      setForgotError(errMsg);
      toast.error(errMsg);
    } finally {
      setForgotLoading(false);
    }
  };
  // Verify OTP handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpMessage("");

    if (!otpValue.trim()) {
      setOtpError("Please enter the OTP.");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: otpValue.trim() }),
      });

      const data = await response.json();

      if (data.status) {
        setOtpMessage("OTP verified successfully!");
        toast.success("OTP verified successfully!");
        setTimeout(() => {
          setShowOtpModal(false);
          setShowResetModal(true);
          setNewPassword("");
          setConfirmPassword("");
          setResetError("");
          setResetMessage("");
        }, 800);
      } else {
        const errMsg = data.message || "Invalid or expired OTP.";
        setOtpError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please try again.";
      setOtpError(errMsg);
      toast.error(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };
  // Reset Password handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    if (!newPassword || !confirmPassword) {
      setResetError("Please fill in both fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status) {
        const msg = "Password updated successfully! You can now login.";
        setResetMessage(msg);
        toast.success(msg);
        setTimeout(() => {
          setShowResetModal(false);
          setForgotEmail("");
        }, 1500);
      } else {
        const errMsg = data.message || "Failed to update password.";
        setResetError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Failed to connect to server. Please try again.";
      setResetError(errMsg);
      toast.error(errMsg);
    } finally {
      setResetLoading(false);
    }
  };
  return (
    // Outer Background with Clean Premium White/Off-White Base & Soft #B063FF Ambient Glow
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAFA] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(176,99,255,0.12),rgba(255,255,255,1))] p-4">
      {/* Ambient Blur Glow Orbs */}
      <div className="absolute -top-28 -left-28 w-[500px] h-[500px] bg-[#B063FF]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 -right-28 w-[450px] h-[450px] bg-[#B063FF]/10 rounded-full blur-[130px] pointer-events-none" />
      
      {/* Subtle Geometric Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Light Luxury Card Wrapper */}
      <div className="relative z-10 w-[95%] sm:w-full max-w-3xl flex flex-col md:flex-row overflow-hidden bg-white border border-zinc-200/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_0_1px_1px_rgba(176,99,255,0.15)] min-h-[480px] md:h-[520px]">
        {/* Left Side: Image Carousel (hidden on mobile) */}
        <div className="hidden md:block md:w-[45%] flex-shrink-0 h-full">
          <div className="relative w-full h-full">
            <ImageCarousel />
          </div>
        </div>

        {/* Right Side: Login Form with Clean White Background */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-10 py-8 rounded-r-2xl w-full bg-white">
          {/* Logo & Brand Header */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="relative inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-3 shadow-md border border-zinc-800">
              {/* Top hairline accent in #B063FF */}
              <div className="absolute top-0 left-2 right-2 h-[2px] bg-[#B063FF] rounded-full" />
              <svg className="w-6 h-6 text-[#B063FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#000000] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-zinc-500 mt-1 text-xs font-medium">
              Sign in to your financial portal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="w-full max-w-sm mb-3.5 p-3 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium shadow-sm">
              <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 w-full max-w-sm mt-1">
            {/* Email Input */}
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#B063FF] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:bg-white focus:border-[#B063FF] focus:ring-2 focus:ring-[#B063FF]/20 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#B063FF] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium focus:bg-white focus:border-[#B063FF] focus:ring-2 focus:ring-[#B063FF]/20 outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-[#000000] transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">              
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-zinc-600 hover:text-[#B063FF] font-semibold cursor-pointer transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer bg-[#B063FF] hover:bg-[#9D46FF] active:scale-[0.99] shadow-[0_4px_20px_rgba(176,99,255,0.35)] hover:shadow-[0_6px_24px_rgba(176,99,255,0.45)] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* DSA Registration Link */}
          <div className="mt-4 pt-3.5 border-t border-zinc-100 text-center w-full max-w-sm">
            <p className="text-xs text-zinc-500 font-normal">
              Are you a Direct Selling Agent?{" "}
              <Link
                href="/dsa-signup"
                className="text-[#000000] hover:text-[#B063FF] font-bold cursor-pointer hover:underline inline-flex items-center gap-1 transition-colors"
              >
                <span>DSA Sign Up / Register</span>
                <svg className="w-3 h-3 text-[#B063FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between bg-[#000000] px-6 py-4 border-b border-[#B063FF]/30">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#B063FF]" />
              <h2 className="text-white font-bold text-base tracking-wide">Forgot Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotEmail("");
                  setForgotError("");
                  setForgotMessage("");
                }}
                className="text-white/70 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-zinc-500 text-xs mb-5">
                Enter your registered email address to receive a password reset OTP.
              </p>

              {forgotError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-[#B063FF]/30 text-[#B063FF] text-xs font-medium">
                  {forgotMessage}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B063FF]/20 focus:border-[#B063FF] transition-all"
                />

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs tracking-wide transition-all cursor-pointer ${forgotLoading
                    ? "bg-[#B063FF]/70 cursor-not-allowed opacity-80"
                    : "bg-[#B063FF] hover:bg-[#9D46FF] shadow-[0_4px_16px_rgba(176,99,255,0.3)]"
                    }`}
                >
                  {forgotLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between bg-[#000000] px-6 py-4 border-b border-[#B063FF]/30">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#B063FF]" />
              <h2 className="text-white font-bold text-base tracking-wide">Verify OTP</h2>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpValue("");
                  setOtpError("");
                  setOtpMessage("");
                }}
                className="text-white/70 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-zinc-500 text-xs mb-5">
                Enter the 4-digit OTP sent to your email address.
              </p>

              {otpError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {otpError}
                </div>
              )}

              {otpMessage && (
                <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-[#B063FF]/30 text-[#B063FF] text-xs font-medium">
                  {otpMessage}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="Enter OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl px-4 py-2.5 text-sm font-bold text-center tracking-[0.5em] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B063FF]/20 focus:border-[#B063FF] transition-all"
                />

                <button
                  type="submit"
                  disabled={otpLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs tracking-wide transition-all cursor-pointer ${otpLoading
                    ? "bg-[#B063FF]/70 cursor-not-allowed opacity-80"
                    : "bg-[#B063FF] hover:bg-[#9D46FF] shadow-[0_4px_16px_rgba(176,99,255,0.3)]"
                    }`}
                >
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between bg-[#000000] px-6 py-4 border-b border-[#B063FF]/30">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#B063FF]" />
              <h2 className="text-white font-bold text-base tracking-wide">Reset Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setResetError("");
                  setResetMessage("");
                }}
                className="text-white/70 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-zinc-500 text-xs mb-5">
                Enter your new password below.
              </p>

              {resetError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-[#B063FF]/30 text-[#B063FF] text-xs font-medium">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <input
                  type="password"
                  required
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B063FF]/20 focus:border-[#B063FF] transition-all"
                />

                <input
                  type="password"
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200 text-[#000000] placeholder:text-zinc-400 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B063FF]/20 focus:border-[#B063FF] transition-all"
                />

                <button
                  type="submit"
                  disabled={resetLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs tracking-wide transition-all cursor-pointer ${resetLoading
                    ? "bg-[#B063FF]/70 cursor-not-allowed opacity-80"
                    : "bg-[#B063FF] hover:bg-[#9D46FF] shadow-[0_4px_16px_rgba(176,99,255,0.3)]"
                    }`}
                >
                  {resetLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}