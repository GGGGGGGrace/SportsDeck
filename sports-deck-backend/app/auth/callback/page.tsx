"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const hasFetched = useRef(false); // 防止 React Strict Mode 发送两次请求

  useEffect(() => {
    if (!code || hasFetched.current) return;
    hasFetched.current = true;

    const exchangeToken = async () => {
      try {
        const res = await fetch("/api/auth/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "github", code }),
        });

        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "OAuth failed");

        saveSession(data);
        
        router.push("/");
      } catch (error) {
        console.error("Login failed", error);
        router.push("/login?error=oauth_failed");
      }
    };

    exchangeToken();
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 mx-auto" />
        <p className="text-zinc-600 font-medium">Authenticating with GitHub...</p>
      </div>
    </div>
  );
}