"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Forward /login directly to root /
    router.replace("/");
  }, [router]);

  return null;
}
