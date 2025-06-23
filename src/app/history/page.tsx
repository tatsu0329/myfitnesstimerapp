"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { WorkoutHistoryItem } from "../../types";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { trackHistoryDelete, trackPageView } from "../../utils/gtag";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "month" | "date">("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

    return formattedTime;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 日付ごとの統計を計算
  const getDateStats = () => {
    const dateStats: {
      [key: string]: {
        sets: number;
        totalTime: number;
        sessions: WorkoutHistoryItem[];
      };
    } = {};

    history.forEach((item) => {
      // 日本時間で記録されたデータを正しく処理
      const itemDate = new Date(item.date);

      // 日本時間の日付を取得（UTC+9）
      const japanDate = new Date(itemDate.getTime() + 9 * 60 * 60 * 1000);
      const dateKey = japanDate.toISOString().split("T")[0];

      if (!dateStats[dateKey]) {
        dateStats[dateKey] = { sets: 0, totalTime: 0, sessions: [] };
      }
      dateStats[dateKey].sets += item.sets || 0;
      dateStats[dateKey].totalTime += item.totalTime || 0;
      dateStats[dateKey].sessions.push(item);
    });

    return dateStats;
  };

  // 月別統計を計算
  const getMonthStats = (year: number, month: number) => {
    const monthStats = {
      sessions: 0,
      totalTime: 0,
    };

    history.forEach((item) => {
      // 日本時間で記録されたデータを正しく処理
      const itemDate = new Date(item.date);
      const japanDate = new Date(itemDate.getTime() + 9 * 60 * 60 * 1000);

      if (japanDate.getFullYear() === year && japanDate.getMonth() === month) {
        monthStats.sessions += 1;
        monthStats.totalTime += item.totalTime || 0;
      }
    });

    return monthStats;
  };

  // 現在表示すべき統計データを取得
  const getCurrentStats = () => {
    if (viewMode === "date" && selectedDate) {
      const dateStats = getDateStats();
      const stats = dateStats[selectedDate];
      if (stats) {
        const result = {
          sessions: stats.sessions.length,
          totalTime: stats.totalTime || 0,
        };
        return result;
      }
    } else if (viewMode === "month") {
      const monthStats = getMonthStats(
        currentMonth.getFullYear(),
        currentMonth.getMonth()
      );
      const result = {
        sessions: monthStats.sessions,
        totalTime: monthStats.totalTime || 0,
      };
      return result;
    } else {
      // 全体統計
      const result = {
        sessions: getTotalSessions(),
        totalTime: getTotalTime() || 0,
      };
      return result;
    }

    // デフォルトは全体統計
    const result = {
      sessions: getTotalSessions(),
      totalTime: getTotalTime() || 0,
    };
    return result;
  };

  const getTotalSessions = () => history.length;
  const getTotalTime = () => {
    const total = history.reduce((sum, item) => {
      const time = item.totalTime || 0;
      return sum + time;
    }, 0);
    return total;
  };

  // カレンダー関連の計算
  const today = new Date();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const getSessionForDate = (date: number) => {
    // 日本時間で日付を作成
    const d = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      date
    );
    // 日本時間に調整（UTC+9）
    const japanDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const dateString = japanDate.toISOString().split("T")[0];
    const dateStats = getDateStats();
    return dateStats[dateString];
  };

  const handleDateClick = (date: number) => {
    // 日本時間で日付を作成
    const d = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      date
    );
    // 日本時間に調整（UTC+9）
    const japanDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const dateString = japanDate.toISOString().split("T")[0];
    const dateStats = getDateStats();
    const stats = dateStats[dateString];

    if (stats && stats.sessions.length > 0) {
      setSelectedDate(dateString);
      setViewMode("date");
      trackPageView("history_date_view");
    }
  };

  const handleMonthClick = () => {
    const monthStats = getMonthStats(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    if (monthStats.sessions > 0) {
      setViewMode("month");
      setSelectedDate(null);
      trackPageView("history_month_view");
    }
  };

  const handleBackToAll = () => {
    setViewMode("all");
    setSelectedDate(null);
    trackPageView("history_all_view");
  };

  const handleClearHistory = async () => {
    if (
      window.confirm(
        "本当にすべての修行記録を削除しますか？この操作は元に戻せません。"
      )
    ) {
      console.log("Attempting to clear all history");
      try {
        const response = await fetch("/api/history", {
          method: "DELETE",
        });

        console.log(`Clear history response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Clear history failed:", errorData);
          throw new Error(
            `Failed to delete history: ${errorData.message || "不明なエラー"}`
          );
        }

        console.log("Successfully cleared all history");
        setHistory([]);
        setSelectedDate(null);
        setViewMode("all");
        alert("すべての修行記録が削除されました。");
        trackHistoryDelete("all");
      } catch (error) {
        console.error("Failed to clear history:", error);
        alert(
          `修行記録の削除に失敗しました: ${
            error instanceof Error ? error.message : "不明なエラー"
          }`
        );
      }
    }
  };

  const currentStats = getCurrentStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Zen Background Pattern */}
      <div className="fixed inset-0 opacity-5 dark:opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #8B4513 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #8B4513 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      <div className="relative z-0 p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <h1 className="text-2xl font-light text-stone-800 dark:text-stone-200 tracking-wide">
            修行記録
          </h1>
          <button
            onClick={handleClearHistory}
            className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-300 border border-red-200/50 dark:border-red-700/30"
            title="すべての記録を削除"
          >
            <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
          </button>
        </div>

        {/* Zen Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mb-4"></div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-light italic">
            「積み重ねた修行は、心の成長の証」
          </p>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mt-4"></div>
        </div>

        {/* Statistics */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-stone-200/50 dark:border-gray-700/50 mb-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                修行統計
              </h3>
              {viewMode !== "all" && (
                <button
                  onClick={handleBackToAll}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  全体に戻る
                </button>
              )}
            </div>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto"></div>
            {viewMode === "date" && selectedDate && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                {formatDate(selectedDate)}
              </p>
            )}
            {viewMode === "month" && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-light text-stone-800 dark:text-stone-200">
                {currentStats.sessions}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                修行回数
              </div>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-light text-stone-800 dark:text-stone-200">
                {(() => {
                  const formattedTime = formatTime(currentStats.totalTime);
                  return formattedTime;
                })()}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                総修行時間
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-stone-200/50 dark:border-gray-700/50 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleMonthClick}
              className="text-lg font-medium text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50"
              >
                <ChevronRight className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div
                key={day}
                className="font-medium text-stone-500 dark:text-stone-400 p-2"
              >
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStats = getSessionForDate(day);
              const hasSessions = dateStats && dateStats.sessions.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  disabled={!hasSessions}
                  className={clsx(
                    "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300",
                    hasSessions
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white font-medium shadow-lg hover:scale-110 cursor-pointer"
                      : "text-stone-700 dark:text-stone-300 cursor-default",
                    today.getDate() === day &&
                      today.getMonth() === currentMonth.getMonth() &&
                      today.getFullYear() === currentMonth.getFullYear() &&
                      "ring-2 ring-amber-400"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* No History Message */}
        {history.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-stone-100 to-gray-100 dark:from-stone-900/30 dark:to-gray-900/30 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-2">
              まだ修行記録がありません
            </p>
            <p className="text-stone-400 dark:text-stone-500 text-xs">
              最初の修行を始めてみましょう
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-stone-300 dark:border-stone-600 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              読み込み中...
            </p>
          </div>
        )}

        {/* Zen Footer Message */}
        <div className="text-center mt-8">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mb-4"></div>
          <p className="text-stone-500 dark:text-stone-400 text-xs font-light italic">
            「一歩一歩、着実に心を鍛えることが大切」
          </p>
        </div>
      </div>
    </div>
  );
}
