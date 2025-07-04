"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutProvider } from "../contexts/LayoutContext";
import AppContent from "./AppContent";
import { useEffect } from "react";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // グローバルエラーハンドラーを設定
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", {
        reason: event.reason,
        promise: event.promise,
      });
    };

    // エラーハンドラーを追加
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // クリーンアップ
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return (
    <html lang="ja">
      <head>
        <meta
          name="google-site-verification"
          content="iGf-PF9uOWYiJU0QpuGr559zSe4duSwiDVj9cL1niMs"
        />
        {/* Google Analytics (推奨: next/script) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XKYCC58FW7"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XKYCC58FW7');
          `}
        </Script>
      </head>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 zen-fade-in`}
      >
        <LayoutProvider>
          <div className="flex flex-col h-screen">
            <main className="flex-grow overflow-y-auto zen-fade-in">
              <AppContent>{children}</AppContent>
            </main>
          </div>
        </LayoutProvider>
      </body>
    </html>
  );
}
