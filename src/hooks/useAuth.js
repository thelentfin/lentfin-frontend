"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Safely decodes base64 JWT payload without external dependencies
 */
export const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
};

/**
 * Clears authentication keys from localStorage
 */
export const clearAuthKeys = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("admin_selected_section");
    localStorage.removeItem("dsa_selected_section");
  }
};

/**
 * Centralized authentication guard hook for LentFin protected routes.
 *
 * @param {string} [requiredRole] - Expected user role (e.g. "admin" or "dsa")
 */
export function useAuth(requiredRole) {
  const router = useRouter();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  const logout = useCallback(() => {
    clearAuthKeys();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
    router.push("/");
  }, [router]);

  const verifyAuth = useCallback(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedName = localStorage.getItem("userName") || localStorage.getItem("name");
    const storedEmail = localStorage.getItem("userEmail") || localStorage.getItem("email");

    if (!token) {
      clearAuthKeys();
      setAuthState({ isAuthenticated: false, isLoading: false, user: null });
      router.push("/");
      return;
    }

    const decoded = parseJwt(token);
    if (!decoded) {
      clearAuthKeys();
      setAuthState({ isAuthenticated: false, isLoading: false, user: null });
      router.push("/");
      return;
    }

    // Validate JWT exp (in seconds)
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      clearAuthKeys();
      setAuthState({ isAuthenticated: false, isLoading: false, user: null });
      router.push("/");
      return;
    }

    // Role validation
    const effectiveRole = (storedRole || decoded.role || "").toLowerCase().trim();
    const targetRole = requiredRole ? requiredRole.toLowerCase().trim() : "";

    if (targetRole && effectiveRole !== targetRole) {
      clearAuthKeys();
      setAuthState({ isAuthenticated: false, isLoading: false, user: null });
      router.push("/");
      return;
    }

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        token,
        role: storedRole || decoded.role,
        name: storedName || decoded.name || "",
        email: storedEmail || decoded.email || "",
        exp: decoded.exp,
        id: decoded.id,
      },
    });
  }, [requiredRole, router]);

  useEffect(() => {
    verifyAuth();

    // Lightweight 10s token expiration & validity monitor
    const timer = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = parseJwt(token);
        if (!decoded || (decoded.exp && decoded.exp * 1000 <= Date.now())) {
          logout();
        }
      } else {
        logout();
      }
    }, 10000);

    // Listen for storage events (e.g. logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === "token" && !e.newValue) {
        logout();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [verifyAuth, logout]);

  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    logout,
    verifyAuth,
  };
}
