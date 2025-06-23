"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Check,
  Volume2,
  VolumeX,
  History,
  X,
  Bell,
} from "lucide-react";
import { WorkoutHistoryItem } from "../types";
import { useTimer } from "../hooks/useTimer";
import { useSettings } from "../hooks/useSettings";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useLayout } from "../contexts/LayoutContext";
import {
  trackWorkoutStart,
  trackWorkoutComplete,
  trackSettingChange,
  trackNotificationSetting,
} from "../utils/gtag";

// Audio context for generating beep sounds
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

const initializeAudio = async () => {
  if (typeof window === "undefined" || audioUnlocked) return;

  try {
    // Create audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Resume audio context if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    audioUnlocked = true;
    console.log("Audio context initialized successfully");
  } catch (error) {
    console.warn("Audio initialization failed:", error);
    audioUnlocked = true; // Mark as unlocked to avoid repeated attempts
  }
};

const playNotificationSound = async (volume: number) => {
  console.log(`playNotificationSound called with volume: ${volume}`);
  try {
    // Try to initialize audio if not already done
    if (!audioUnlocked) {
      console.log("Audio not unlocked, initializing...");
      await initializeAudio();
    }

    // Create a beep sound using Web Audio API
    if (audioContext && audioUnlocked) {
      console.log("Playing notification sound...");
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound (800Hz for 0.5 seconds)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(volume * 0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      console.log("Notification sound played successfully");
    }
  } catch (error) {
    console.warn("Audio playback failed:", error);
  }
};

export default function Page() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { setShowFooter } = useLayout();

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
  const [isInRestMode, setIsInRestMode] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    setShowFooter(!isWorkoutMode);
  }, [isWorkoutMode, setShowFooter]);

  const handleTimerEnd = useCallback(async () => {
    // Skip sound if we're in the middle of resetting
    if (isResetting) {
      console.log("Skipping timer end sound - reset in progress");
      return;
    }

    console.log("handleTimerEnd called - checking if sound should play");
    if (settings.soundOn) {
      console.log("Sound is enabled, playing notification sound");
      try {
        await playNotificationSound(0.5);
      } catch (error) {
        console.warn("Timer end sound failed:", error);
      }
    } else {
      console.log("Sound is disabled, skipping notification sound");
    }
    if (settings.vibrateOn && navigator.vibrate) {
      try {
        navigator.vibrate(200); // 200msの振動
      } catch (e) {
        console.warn("Vibration not supported on this device.");
      }
    }
  }, [settings.soundOn, settings.vibrateOn, isResetting]);

  // まずタイマーを初期化（コールバックなし）
  const workoutTimer = useTimer(settings.workoutTime);
  const restTimer = useTimer(settings.restTime);

  const handleWorkoutEnd = useCallback(() => {
    console.log("handleWorkoutEnd called - workout timer finished");
    handleTimerEnd();
    // 修行終了、静寂開始
    setSessionSets((prev) => prev + 1);
    setIsInRestMode(true);
    restTimer.reset();
    restTimer.start();
  }, [restTimer, handleTimerEnd]);

  const handleRestEnd = useCallback(() => {
    console.log("handleRestEnd called - rest timer finished");
    handleTimerEnd();
    // 静寂終了、次の修行開始
    setIsInRestMode(false);
    workoutTimer.reset();
    workoutTimer.start();
  }, [workoutTimer, handleTimerEnd]);

  // タイマーにコールバックを設定
  useEffect(() => {
    workoutTimer.setOnEnd(handleWorkoutEnd);
  }, [workoutTimer, handleWorkoutEnd]);

  useEffect(() => {
    restTimer.setOnEnd(handleRestEnd);
  }, [restTimer, handleRestEnd]);

  const isResting = isInRestMode;
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

  const handleStartWorkout = async () => {
    // Initialize audio on first user interaction
    if (!isAudioUnlocked) {
      try {
        await initializeAudio();
        // Test audio with a silent play
        await playNotificationSound(0);
        setIsAudioUnlocked(true);
        console.log("Audio unlocked successfully");
      } catch (error) {
        console.warn("Initial audio test failed:", error);
        setIsAudioUnlocked(true); // Still mark as unlocked to avoid repeated attempts
      }
    }
    setIsWorkoutMode(true);
    setIsInRestMode(false);
    workoutTimer.start();
    setSessionStartTime(new Date());
    setSessionDuration(0);
    trackWorkoutStart(settings.workoutTime, settings.restTime);
  };

  const handleMasterPause = () => {
    // 現在の状態に応じて適切なタイマーのみを一時停止
    if (isResting) {
      // 静寂中の場合、静寂タイマーのみ一時停止
      restTimer.pause();
    } else {
      // 修行中の場合、修行タイマーのみ一時停止
      workoutTimer.pause();
    }
  };

  const handleMasterResume = () => {
    // 現在の状態に応じて適切なタイマーのみを再開
    if (isResting) {
      // 静寂中の場合、静寂タイマーのみ再開
      restTimer.start();
    } else {
      // 修行中の場合、修行タイマーのみ再開
      workoutTimer.start();
    }
  };

  const handleMasterReset = () => {
    console.log("handleMasterReset called - resetting all timers and state");

    // Immediately disable callbacks to prevent any onEnd from being called
    console.log("Disabling timer callbacks");
    workoutTimer.disableCallbacks();
    restTimer.disableCallbacks();

    // Set resetting flag to prevent timer end sounds
    setIsResetting(true);

    // First stop the timers to prevent onEnd callbacks from being triggered
    if (workoutTimer.isRunning) {
      console.log("Stopping workout timer");
      workoutTimer.pause();
    }
    if (restTimer.isRunning) {
      console.log("Stopping rest timer");
      restTimer.pause();
    }

    // Then reset them (the timer hook will handle preventing callbacks during reset)
    workoutTimer.reset();
    restTimer.reset();
    setSessionSets(0);
    setSessionDuration(0);
    setSessionStartTime(null);
    setIsWorkoutMode(false);
    setIsInRestMode(false);

    // Clear resetting flag and re-enable callbacks after a short delay
    setTimeout(() => {
      setIsResetting(false);
      console.log("Re-enabling timer callbacks");
      workoutTimer.enableCallbacks();
      restTimer.enableCallbacks();
      console.log("Reset flag cleared and callbacks re-enabled");
    }, 150);

    console.log("handleMasterReset completed");
  };

  const handleFinishWorkout = async () => {
    console.log("handleFinishWorkout called - starting workout finish process");

    // セッションが開始されている場合は履歴を保存
    if (sessionStartTime && sessionSets > 0) {
      console.log("Saving workout history...");
      // 正確な修行時間を計算
      let totalWorkoutTime = calculateWorkoutTime();

      // 日本時間で現在の日時を取得
      const now = new Date();
      const japanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9

      const historyItem: WorkoutHistoryItem = {
        bodyPart: "chest", // 固定値として設定
        sets: sessionSets,
        totalTime: Math.round(totalWorkoutTime), // 整数に丸める
        date: japanTime.toISOString(), // 日本時間で記録
      };

      try {
        const response = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(historyItem),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("History save error:", errorData);
          throw new Error(
            `Failed to save history: ${response.status} ${response.statusText}`
          );
        }

        console.log("History saved successfully");
        trackWorkoutComplete(sessionSets, Math.round(totalWorkoutTime));
      } catch (error) {
        console.error("Error saving history:", error);
        // エラーが発生しても修行を終了する
        alert("履歴の保存に失敗しましたが、修行は正常に終了しました。");
      }
    }

    console.log("Calling handleMasterReset...");
    // 常に設定画面に戻る
    handleMasterReset();
    console.log("handleFinishWorkout completed");
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
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
    trackSettingChange(
      timeModalType,
      timeModalType === "workout"
        ? tempSettings.workoutTime
        : tempSettings.restTime
    );
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

        <div className="relative z-0 flex-1 flex flex-col items-center justify-center p-6">
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
                    "progress-ring",
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

          {/* Controls */}
          <div className="flex items-center space-x-6">
            {!isAnythingRunning ? (
              <button
                onClick={handleMasterResume}
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

          .progress-ring {
            transition: none;
          }

          .progress-ring circle {
            will-change: stroke-dashoffset;
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

      <div className="relative z-0 max-w-md mx-auto space-y-8">
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
            <div className="flex items-center justify-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                現在の設定
              </h3>
              <button
                onClick={() => setShowNotificationModal(true)}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all duration-300"
                title="通知設定"
              >
                <Bell className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>
            </div>
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
                      <span>
                        {timeModalType === "workout" ? "30秒" : "10秒"}
                      </span>
                      <span>
                        {timeModalType === "workout" ? "10分" : "5分"}
                      </span>
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

        {/* Notification Settings Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-stone-200/50 dark:border-gray-700/50 max-w-sm w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                  通知設定
                </h3>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all duration-300"
                >
                  <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Sound Notification */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-amber-600 dark:bg-amber-300"></div>
                      </div>
                      <div>
                        <div className="font-medium text-stone-800 dark:text-stone-200">
                          鐘の音で通知
                        </div>
                        <div className="text-sm text-stone-500 dark:text-stone-400">
                          修行終了時に鐘の音を鳴らす
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        updateSettings({ soundOn: !settings.soundOn });
                        trackNotificationSetting("sound", !settings.soundOn);
                      }}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.soundOn
                          ? "bg-amber-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.soundOn ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Vibration Notification */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-300"></div>
                      </div>
                      <div>
                        <div className="font-medium text-stone-800 dark:text-stone-200">
                          振動で通知
                        </div>
                        <div className="text-sm text-stone-500 dark:text-stone-400">
                          修行終了時に振動で知らせる
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        updateSettings({ vibrateOn: !settings.vibrateOn });
                        trackNotificationSetting(
                          "vibration",
                          !settings.vibrateOn
                        );
                      }}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.vibrateOn
                          ? "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.vibrateOn ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Test Sound Button */}
                <div className="text-center">
                  <button
                    onClick={() => playNotificationSound(0.5)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium transition-all duration-300 shadow-lg"
                  >
                    通知音をテスト
                  </button>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                    現在の設定で通知音を試聴できます
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="w-full py-3 px-4 rounded-2xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all duration-300 text-stone-600 dark:text-stone-400 font-medium"
                >
                  閉じる
                </button>
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
    </div>
  );
}
