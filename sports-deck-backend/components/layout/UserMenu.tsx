"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { clearSession } from "@/lib/auth";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(Boolean(token));
    setIsAdmin(localStorage.getItem("role") === "ADMIN");
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-end" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        Account
      </button>

      {open && (
        <div className="mt-2 w-52 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="block rounded-lg px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>

              <Link
                href="/threads"
                className="block rounded-lg px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                My discussions
              </Link>

              {isAdmin && (
                <>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <Link
                    href="/admin/queue"
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-purple-600 hover:bg-zinc-100 dark:text-purple-400 dark:hover:bg-zinc-800"
                    onClick={() => setOpen(false)}
                  >
                    Moderation Queue
                  </Link>
                  <Link
                    href="/admin/appeals"
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-purple-600 hover:bg-zinc-100 dark:text-purple-400 dark:hover:bg-zinc-800"
                    onClick={() => setOpen(false)}
                  >
                    Ban Appeals
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-4 py-3 text-left text-sm text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block rounded-lg px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="block rounded-lg px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}