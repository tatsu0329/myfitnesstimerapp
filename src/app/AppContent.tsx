"use client";
import React, { useEffect, useState } from "react";
import { Home, Calendar, Moon, Sun } from "lucide-react";
import { Screen } from "../types";
import { useTheme } from "../hooks/useTheme";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "../contexts/LayoutContext";
import { GA_TRACKING_ID, pageview } from "../utils/gtag";
import Head from "next/head";

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isDark, toggleTheme, mounted: themeMounted } = useTheme();
  const { showFooter } = useLayout();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (GA_TRACKING_ID) {
      pageview(pathname);
    }
  }, [pathname]);

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

  // ハイドレーションが完了するまで何も表示しない
  if (!isHydrated) {
    return (
      <div className="flex flex-col h-screen">
        <main className="flex-grow overflow-y-auto zen-fade-in">
          <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-800 dark:to-orange-900 flex items-center justify-center shadow-lg animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800"></div>
              </div>
              <h1 className="text-2xl font-light text-stone-800 dark:text-stone-200 mb-2">
                心を整える
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm">
                読み込み中...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Google Analytics (Head) */}
      {GA_TRACKING_ID && (
        <Head>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          ></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_title: document.title,
                page_location: window.location.href,
              });`,
            }}
          />
        </Head>
      )}
      {/* テーマ初期化スクリプト - より安全な実装 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  // System preference fallback
                  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch (e) {}
            })();
          `,
        }}
      />
      <div className="flex flex-col h-screen">
        <main
          className={`flex-grow overflow-y-auto ${
            showFooter && "pb-24"
          } zen-fade-in`}
        >
          {children}
        </main>
        {showFooter && (
          <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 zen-shadow">
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
              {/* Only render theme toggle button after mounting to prevent hydration mismatch */}
              {themeMounted && (
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
              )}
            </nav>
          </footer>
        )}
      </div>
    </>
  );
}
