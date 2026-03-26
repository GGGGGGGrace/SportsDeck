"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Account
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {isLoggedIn ? (
            <div className="flex flex-col">
              <Link
                href="/profile"
                className="px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/threads"
                className="px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                My discussions
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-3 text-left text-sm text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <Link
                href="/login"
                className="px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}