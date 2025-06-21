"use client";

import "./globals.css";
import React, { useEffect } from "react";
import { Home, Calendar, Moon, Sun } from "lucide-react";
import { Screen } from "../types";
import { useTheme } from "../hooks/useTheme";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { id: "home" as Screen, href: "/", icon: Home, label: "修行" },
    {
      id: "history" as Screen,
      href: "/history",
      icon: Calendar,
      label: "記録",
    },
  ];

  const currentScreen =
    navItems.find((item) => item.href === pathname)?.id || "home";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <html lang="ja" className={clsx(isDark && "dark")}>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="flex flex-col h-screen">
          <main className="flex-grow overflow-y-auto pb-24">{children}</main>
          <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex justify-around items-center h-16">
              {navItems.map((item) => (
                <Link href={item.href} key={item.id}>
                  <div
                    className={clsx(
                      "flex flex-col items-center justify-center w-20 h-full transition-colors",
                      currentScreen === item.id
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-500"
                    )}
                  >
                    <item.icon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={toggleTheme}
                className="absolute right-4 top-[-40px] p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
