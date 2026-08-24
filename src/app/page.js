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
    imageSrc: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Financial Growth & Investment Management",
    headline: "BUILDING WEALTH.",
    subtext: "LENTFIN FINANCIAL & INVESTMENT",
  },
  {
    id: 2,
    imageSrc: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
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
      {/* Soft Dark Overlay for Image Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/40 to-slate-900/80 rounded-l-2xl" />

      {/* Bottom Text Overlay */}
      <div
        className="absolute bottom-14 left-6 right-6 z-10"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <h2 className="text-white font-extrabold text-2xl tracking-wider leading-snug drop-shadow-md">
          {slide.headline}
        </h2>
        <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase drop-shadow mt-1">
          {slide.subtext}
        </p>
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
              backgroundColor: i === current ? "#2563eb" : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
              transition: "width 0.3s ease, background-color 0.3s ease",
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

  // Auto-redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (token && storedRole) {
      const role = storedRole.toLowerCase().trim();
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "dsa") {
        router.push("/dsa");
      }
    }
  }, [router]);

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
    // Outer Background with Light Clean Theme & Soft Blue Accent Glow
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(219,234,254,0.6),rgba(248,250,252,1))] p-4">
      {/* Ambient Blur Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Light Card Wrapper */}
      <div className="relative z-10 w-[95%] sm:w-full max-w-3xl flex flex-col md:flex-row overflow-hidden bg-white border border-slate-200/80 rounded-lg shadow-lg min-h-[480px] md:h-[500px]">
        {/* Left Side: Image Carousel (hidden on mobile) */}
        <div className="hidden md:block md:w-[45%] flex-shrink-0 h-full">
          <div className="relative w-full h-full">
            <ImageCarousel />
          </div>
        </div>

        {/* Right Side: Login Form with Clean White Background */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-10 py-8 rounded-r-lg w-full bg-white">
          {/* Logo & Brand Header */}
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-slate-900 rounded-md mb-2.5 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-slate-500 mt-0.5 text-xs font-normal">
              Sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="w-full max-w-sm mb-3.5 p-3 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2 font-normal">
              <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 w-full max-w-sm">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-3.5 py-2 text-xs font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-9 py-2 text-xs font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-md text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-slate-900 hover:bg-slate-800 disabled:opacity-50 mt-1"
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
          <div className="mt-4 pt-3.5 border-t border-slate-200/80 text-center w-full max-w-sm">
            <p className="text-xs text-slate-500 font-normal">
              Are you a Direct Selling Agent?{" "}
              <Link
                href="/dsa-signup"
                className="text-slate-900 hover:text-slate-700 font-semibold cursor-pointer hover:underline inline-flex items-center gap-1 transition-colors"
              >
                <span>DSA Sign Up / Register</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-800 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">Forgot Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotEmail("");
                  setForgotError("");
                  setForgotMessage("");
                }}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-500 text-sm mb-5">
                Enter your registered email address to receive a password reset OTP.
              </p>

              {forgotError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs">
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all ${forgotLoading
                    ? "bg-slate-800/70 cursor-not-allowed opacity-80"
                    : "bg-slate-900 hover:bg-slate-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-800 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">Verify OTP</h2>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpValue("");
                  setOtpError("");
                  setOtpMessage("");
                }}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-500 text-sm mb-5">
                Enter the 4-digit OTP sent to your email address.
              </p>

              {otpError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                  {otpError}
                </div>
              )}

              {otpMessage && (
                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs">
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />

                <button
                  type="submit"
                  disabled={otpLoading}
                  className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all ${otpLoading
                    ? "bg-slate-800/70 cursor-not-allowed opacity-80"
                    : "bg-slate-900 hover:bg-slate-800"
                    }`}
                >
                  {otpLoading ? "Verifying..." : "OTP Verification"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-800 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">Reset Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setResetError("");
                  setResetMessage("");
                }}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-500 text-sm mb-5">
                Enter your new password below.
              </p>

              {resetError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs">
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />

                <input
                  type="password"
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />

                <button
                  type="submit"
                  disabled={resetLoading}
                  className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all ${resetLoading
                    ? "bg-slate-800/70 cursor-not-allowed opacity-80"
                    : "bg-slate-900 hover:bg-slate-800"
                    }`}
                >
                  {resetLoading ? "Updating..." : "Update"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}