"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/standings", label: "Standings" },
  { href: "/threads", label: "Threads" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
    setIsAdmin(localStorage.getItem("role") === "ADMIN");
  }, []);

  const navLinks = isLoggedIn
    ? [
        ...publicLinks,
        { href: "/feed", label: "Feed" },
        ...(isAdmin ? [{ href: "/admin/queue", label: "Admin" }] : []),
      ]
    : publicLinks;

  return (
    <header className="sticky top-0 z-[100] overflow-visible border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            SportsDeck
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <UserMenu />
        </div>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium md:hidden dark:border-zinc-700"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-200 px-4 py-4 md:hidden dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between gap-3">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}