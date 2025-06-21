import { useState, useEffect } from "react";
import { TimerSettings } from "../types";

export const defaultSettings: TimerSettings = {
  workoutTime: 60,
  restTime: 30,
  soundOn: true,
  vibrateOn: true,
  autoStart: false,
  theme: "system",
};

export function useSettings() {
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem("timerSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        const migratedSettings: TimerSettings = {
          ...defaultSettings,
          ...parsedSettings,
        };
        setSettings(migratedSettings);
        localStorage.setItem("timerSettings", JSON.stringify(migratedSettings));
      } catch (error) {
        console.error("Error parsing saved settings:", error);
        setSettings(defaultSettings);
      }
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "timerSettings" && e.newValue) {
        try {
          const parsedSettings = JSON.parse(e.newValue);
          const migratedSettings: TimerSettings = {
            ...defaultSettings,
            ...parsedSettings,
          };
          setSettings(migratedSettings);
        } catch (error) {
          console.error("Error parsing storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateSettings = (newSettings: Partial<TimerSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("timerSettings", JSON.stringify(updated));

    // 同じウィンドウ内での変更を検知するためにカスタムイベントを発火
    window.dispatchEvent(
      new CustomEvent("settingsChanged", { detail: updated })
    );
  };

  const saveAsDefault = () => {
    localStorage.setItem("defaultTimerSettings", JSON.stringify(settings));
    alert("現在の設定をデフォルトとして保存しました！");
  };

  const loadDefault = () => {
    const defaultSettingsStr = localStorage.getItem("defaultTimerSettings");
    if (defaultSettingsStr) {
      try {
        const parsed = JSON.parse(defaultSettingsStr);
        const migratedSettings: TimerSettings = {
          ...defaultSettings,
          ...parsed,
        };
        updateSettings(migratedSettings);
        alert("デフォルト設定を読み込みました！");
      } catch (error) {
        console.error("Error loading default settings:", error);
        alert("デフォルト設定の読み込みに失敗しました。");
      }
    } else {
      alert("デフォルト設定が保存されていません。");
    }
  };

  const resetSettings = () => {
    updateSettings(defaultSettings);
    alert("設定をデフォルト値にリセットしました！");
  };

  return {
    settings,
    updateSettings,
    saveAsDefault,
    loadDefault,
    resetSettings,
  };
}
