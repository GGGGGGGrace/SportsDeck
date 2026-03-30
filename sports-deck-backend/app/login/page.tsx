"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login} from "@/lib/auth";
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 处理传统的邮箱密码登录
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: "google" | "github") {
    setProviderLoading(provider);
    setError("");

    if (provider === "github") {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;
    } else {
      setError("Google login is not implemented yet.");
      setProviderLoading(null);
    }
}

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800">
      <h1 className="text-2xl font-bold">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          required
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || providerLoading !== null}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-white font-medium disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
        <span className="mx-4 text-sm text-zinc-500">or continue with</span>
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
      </div>

      <div className="space-y-3">

        <button
          type="button"
          onClick={() => handleOAuthLogin("github")}
          disabled={loading || providerLoading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-2.5 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
        >
          {providerLoading === "github" ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </>
          )}
        </button>
      </div>
    </div>
  );
}