"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Check,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  History,
  ArrowLeft,
  X,
} from "lucide-react";
import { BodyPart, WorkoutHistoryItem } from "../types";
import { useTimer } from "../hooks/useTimer";
import { useSettings } from "../hooks/useSettings";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();

  const [sessionSets, setSessionSets] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isWorkoutMode, setIsWorkoutMode] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeModalType, setTimeModalType] = useState<"workout" | "rest">(
    "workout"
  );
  const [tempSettings, setTempSettings] = useState(settings);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualInputValues, setManualInputValues] = useState({
    minutes: "",
    seconds: "",
  });

  // まずタイマーを初期化（コールバックなし）
  const workoutTimer = useTimer(settings.workoutTime);
  const restTimer = useTimer(settings.restTime);

  const handleWorkoutEnd = useCallback(() => {
    // 修行終了、静寂開始
    setSessionSets((prev) => prev + 1);
    restTimer.reset();
    restTimer.start();
  }, [restTimer]);

  const handleRestEnd = useCallback(() => {
    // 静寂終了、次の修行開始
    workoutTimer.reset();
    workoutTimer.start();
  }, [workoutTimer]);

  // タイマーにコールバックを設定
  useEffect(() => {
    workoutTimer.setOnEnd(handleWorkoutEnd);
  }, [workoutTimer, handleWorkoutEnd]);

  useEffect(() => {
    restTimer.setOnEnd(handleRestEnd);
  }, [restTimer, handleRestEnd]);

  const isResting = restTimer.isRunning;
  const isAnythingRunning = workoutTimer.isRunning || restTimer.isRunning;
  const isFinished = !isAnythingRunning && sessionSets > 0;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnythingRunning) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnythingRunning]);

  // 修行時間の計算を簡素化 - セッション全体の時間から静寂時間を引く
  const calculateWorkoutTime = () => {
    if (sessionSets === 0) return 0;

    // セッション全体の時間
    const totalSessionTime = sessionDuration;

    // 静寂時間の合計（セット数 - 1）× 静寂時間
    const totalRestTime = (sessionSets - 1) * settings.restTime;

    // 現在静寂中の場合は、現在の静寂時間を追加
    const currentRestTime = isResting ? settings.restTime - restTimer.time : 0;

    // 修行時間 = セッション全体の時間 - 静寂時間の合計
    const workoutTime = totalSessionTime - totalRestTime - currentRestTime;

    return Math.max(0, workoutTime);
  };

  const handleStartWorkout = () => {
    setIsWorkoutMode(true);
    workoutTimer.start();
    setSessionStartTime(new Date());
    setSessionDuration(0);
  };

  const handleMasterPause = () => {
    workoutTimer.pause();
    restTimer.pause();
  };

  const handleMasterReset = () => {
    workoutTimer.reset();
    restTimer.reset();
    setSessionSets(0);
    setSessionDuration(0);
    setSessionStartTime(null);
    setIsWorkoutMode(false);
  };

  const handleFinishWorkout = async () => {
    // セッションが開始されている場合は履歴を保存
    if (sessionStartTime && sessionSets > 0) {
      // 正確な修行時間を計算
      let totalWorkoutTime = calculateWorkoutTime();

      // 日本時間で現在の日時を取得
      const now = new Date();
      const japanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9

      // デバッグ用ログ
      console.log("Saving workout session:", {
        sets: sessionSets,
        sessionDuration: sessionDuration,
        totalWorkoutTime: totalWorkoutTime,
        localDate: now.toLocaleDateString("ja-JP"),
        japanDate: japanTime.toLocaleDateString("ja-JP"),
        date: japanTime.toISOString(),
      });

      const historyItem: WorkoutHistoryItem = {
        bodyPart: "chest", // 固定値として設定
        sets: sessionSets,
        totalTime: totalWorkoutTime, // 修行時間のみを記録
        date: japanTime.toISOString(), // 日本時間で記録
      };

      try {
        const response = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(historyItem),
        });

        if (!response.ok) {
          throw new Error("Failed to save history");
        }
      } catch (error) {
        console.error(error);
      }
    }

    // 常に設定画面に戻る
    handleMasterReset();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTimeClick = (type: "workout" | "rest") => {
    setTimeModalType(type);
    setTempSettings(settings);
    setIsManualInput(false);
    // 現在の設定値を手動入力フィールドに設定
    const currentTime =
      type === "workout" ? settings.workoutTime : settings.restTime;
    setManualInputValues({
      minutes: Math.floor(currentTime / 60).toString(),
      seconds: (currentTime % 60).toString(),
    });
    setShowTimeModal(true);
  };

  const handleTimeSave = () => {
    updateSettings(tempSettings);
    setShowTimeModal(false);
    setIsManualInput(false);
    setManualInputValues({ minutes: "", seconds: "" });
  };

  const handleTimeCancel = () => {
    setTempSettings(settings);
    setShowTimeModal(false);
    setIsManualInput(false);
    setManualInputValues({ minutes: "", seconds: "" });
  };

  const handleTimeChange = (type: "workout" | "rest", value: number) => {
    setTempSettings((prev) => ({
      ...prev,
      [type === "workout" ? "workoutTime" : "restTime"]: value,
    }));
  };

  const handleInputChange = (
    type: "workout" | "rest",
    field: "minutes" | "seconds",
    value: string
  ) => {
    const cleanedValue = value.replace(/[^0-9]/g, "");

    // 手動入力値を更新
    setManualInputValues((prev) => ({
      ...prev,
      [field]: cleanedValue,
    }));

    const numValue = parseInt(cleanedValue) || 0;
    const otherField = field === "minutes" ? "seconds" : "minutes";
    const otherValue = parseInt(manualInputValues[otherField]) || 0;

    let newMinutes = field === "minutes" ? numValue : otherValue;
    let newSeconds = field === "seconds" ? numValue : otherValue;

    // 分は最大99、秒は最大59
    if (field === "minutes") {
      newMinutes = Math.min(numValue, 99);
    } else {
      newSeconds = Math.min(numValue, 59);
    }

    const newTime = newMinutes * 60 + newSeconds;
    const minTime = 1; // 最小1秒

    const finalTime = Math.max(minTime, newTime);
    handleTimeChange(type, finalTime);
    setIsManualInput(true);
  };

  const handleSliderChange = (type: "workout" | "rest", value: number) => {
    handleTimeChange(type, value);
    setIsManualInput(false);
    // スライダー変更時に手動入力値を更新
    setManualInputValues({
      minutes: Math.floor(value / 60).toString(),
      seconds: (value % 60).toString(),
    });
  };

  // Timer Mode - タイマー画面
  if (isWorkoutMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
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

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
          {/* Breathing Circle */}
          <div className="relative mb-8">
            {/* Outer Ring - Breathing Animation */}
            <div
              className={clsx(
                "w-80 h-80 rounded-full border-4 border-stone-300/30 dark:border-stone-600/30",
                "flex items-center justify-center transition-all duration-3000 ease-in-out",
                isResting && "animate-pulse"
              )}
              style={{
                animation: isResting
                  ? "breathe 4s ease-in-out infinite"
                  : "none",
              }}
            >
              {/* Inner Circle */}
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30 backdrop-blur-sm border border-amber-200/50 dark:border-amber-700/30 flex items-center justify-center shadow-2xl">
                {/* Timer Display */}
                <div className="text-center">
                  <div className="text-6xl font-light text-stone-800 dark:text-stone-200 tracking-widest mb-2">
                    {formatTime(isResting ? restTimer.time : workoutTimer.time)}
                  </div>
                  <div className="text-lg text-stone-600 dark:text-stone-400 font-light">
                    {isResting ? "静寂" : "修行"}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="absolute inset-0 w-80 h-80">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-stone-300/20 dark:text-stone-600/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={clsx(
                    "transition-all duration-1000 ease-out",
                    isResting ? "text-amber-500" : "text-stone-500"
                  )}
                  style={{
                    strokeDasharray: `${2 * Math.PI * 45}`,
                    strokeDashoffset: `${
                      2 *
                      Math.PI *
                      45 *
                      (1 -
                        (isResting
                          ? (settings.restTime - restTimer.time) /
                            settings.restTime
                          : (settings.workoutTime - workoutTimer.time) /
                            settings.workoutTime))
                    }`,
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Zen Message */}
          <div className="text-center mb-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mb-4"></div>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-light italic">
              {isResting
                ? "「心を落ち着かせ、次の修行に備える」"
                : "「今この瞬間に集中し、心を鍛える」"}
            </p>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mt-4"></div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-6">
            {!isAnythingRunning ? (
              <button
                onClick={() => {
                  if (isResting) {
                    restTimer.start();
                  } else {
                    workoutTimer.start();
                  }
                }}
                className="p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50 shadow-lg"
              >
                <Play className="w-8 h-8 text-stone-600 dark:text-stone-400" />
              </button>
            ) : (
              <button
                onClick={handleMasterPause}
                className="p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50 shadow-lg"
              >
                <Pause className="w-8 h-8 text-stone-600 dark:text-stone-400" />
              </button>
            )}

            <button
              onClick={handleFinishWorkout}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-stone-500 to-gray-600 hover:from-stone-600 hover:to-gray-700 text-white font-medium transition-all duration-300 shadow-lg border border-stone-400/30"
            >
              修行終了
            </button>
          </div>
        </div>

        {/* Breathing Animation Keyframes */}
        <style jsx>{`
          @keyframes breathe {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }

  // Setup Mode - 設定画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
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

      <div className="relative z-10 max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center pt-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-800 dark:to-orange-900 flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800"></div>
          </div>
          <h1 className="text-3xl font-light text-stone-800 dark:text-stone-200 mb-2 tracking-wide">
            心を整える
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            今この瞬間に集中する準備を
          </p>
        </div>

        {/* Current Settings Display */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-stone-200/50 dark:border-gray-700/50">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300 mb-2">
              現在の設定
            </h3>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto"></div>
          </div>

          <div className="space-y-6">
            <button
              onClick={() => handleTimeClick("workout")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-800/40 dark:hover:to-orange-800/40 transition-all duration-300 cursor-pointer"
            >
              <div>
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  修行時間
                </span>
                <div className="text-2xl font-light text-stone-800 dark:text-stone-200 tracking-wider">
                  {formatTime(settings.workoutTime)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-amber-600 dark:bg-amber-300"></div>
              </div>
            </button>

            <button
              onClick={() => handleTimeClick("rest")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-stone-50 to-gray-50 dark:from-stone-900/30 dark:to-gray-900/30 border border-stone-200/50 dark:border-stone-700/30 hover:from-stone-100 hover:to-gray-100 dark:hover:from-stone-800/40 dark:hover:to-gray-800/40 transition-all duration-300 cursor-pointer"
            >
              <div>
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  静寂時間
                </span>
                <div className="text-2xl font-light text-stone-800 dark:text-stone-200 tracking-wider">
                  {formatTime(settings.restTime)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-stone-600 dark:bg-stone-300"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <button
            onClick={handleStartWorkout}
            className={clsx(
              "w-full py-8 px-6 rounded-3xl font-medium text-xl transition-all duration-700",
              "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
              "text-white shadow-2xl hover:shadow-amber-500/25",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              "flex items-center justify-center space-x-4",
              "border border-amber-400/30"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <span>修行開始</span>
          </button>
        </div>

        {/* Zen Message */}
        <div className="text-center py-8">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mb-4"></div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-light italic">
            「呼吸に集中し、今この瞬間を生きる」
          </p>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-auto mt-4"></div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center space-x-4 pt-4">
          <button
            onClick={() => router.push("/history")}
            className="p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 border border-stone-200/50 dark:border-gray-700/50"
            title="修行記録"
          >
            <History className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>
      </div>

      {/* Time Settings Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-stone-200/50 dark:border-gray-700/50 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                {timeModalType === "workout" ? "修行時間" : "静寂時間"}の設定
              </h3>
              <button
                onClick={handleTimeCancel}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all duration-300"
              >
                <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Current Time Display */}
              <div className="text-center">
                <div className="text-4xl font-light text-stone-800 dark:text-stone-200 tracking-widest mb-2">
                  {formatTime(
                    timeModalType === "workout"
                      ? tempSettings.workoutTime
                      : tempSettings.restTime
                  )}
                </div>
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {timeModalType === "workout"
                    ? "心を鍛える時間"
                    : "心を落ち着かせる時間"}
                </div>
              </div>

              {/* Manual Input */}
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-3">
                    手動入力
                  </h4>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={manualInputValues.minutes}
                        onChange={(e) =>
                          handleInputChange(
                            timeModalType,
                            "minutes",
                            e.target.value
                          )
                        }
                        className="w-16 text-center text-lg p-2 rounded-lg bg-stone-100 dark:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-stone-200 dark:border-stone-600"
                        maxLength={2}
                      />
                      <span className="text-stone-500 dark:text-stone-400">
                        分
                      </span>
                    </div>
                    <span className="text-stone-500 dark:text-stone-400">
                      :
                    </span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={manualInputValues.seconds}
                        onChange={(e) =>
                          handleInputChange(
                            timeModalType,
                            "seconds",
                            e.target.value
                          )
                        }
                        className="w-16 text-center text-lg p-2 rounded-lg bg-stone-100 dark:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-stone-200 dark:border-stone-600"
                        maxLength={2}
                      />
                      <span className="text-stone-500 dark:text-stone-400">
                        秒
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-500 mt-2">
                    自由に時間を設定できます
                  </p>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200 dark:border-stone-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/95 dark:bg-gray-800/95 px-2 text-stone-500 dark:text-stone-400">
                      または
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400">
                    <span>短い</span>
                    <span>長い</span>
                  </div>
                  <input
                    type="range"
                    min={timeModalType === "workout" ? 30 : 10}
                    max={timeModalType === "workout" ? 600 : 300}
                    step={timeModalType === "workout" ? 30 : 10}
                    value={
                      timeModalType === "workout"
                        ? tempSettings.workoutTime
                        : tempSettings.restTime
                    }
                    onChange={(e) =>
                      handleSliderChange(
                        timeModalType,
                        parseInt(e.target.value)
                      )
                    }
                    disabled={isManualInput}
                    className={clsx(
                      "w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer slider",
                      isManualInput && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  <div className="flex justify-between text-xs text-stone-500 dark:text-stone-500">
                    <span>{timeModalType === "workout" ? "30秒" : "10秒"}</span>
                    <span>{timeModalType === "workout" ? "10分" : "5分"}</span>
                  </div>
                  {isManualInput && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                      手動入力中です
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleTimeCancel}
                  className="flex-1 py-3 px-4 rounded-2xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all duration-300 text-stone-600 dark:text-stone-400 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleTimeSave}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium transition-all duration-300 shadow-lg"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
