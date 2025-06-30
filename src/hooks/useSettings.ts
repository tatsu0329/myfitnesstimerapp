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

// 安全なJSONパース関数
const safeJsonParse = (jsonString: string, fallback: any) => {
  try {
    if (!jsonString || jsonString.trim() === "") {
      return fallback;
    }

    const parsed = JSON.parse(jsonString);

    if (typeof parsed !== "object" || parsed === null) {
      return fallback;
    }

    return parsed;
  } catch (error) {
    console.error("JSON parse error:", error);
    return fallback;
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSettings = localStorage.getItem("timerSettings");
    if (savedSettings) {
      const parsedSettings = safeJsonParse(savedSettings, null);
      if (parsedSettings) {
        const migratedSettings: TimerSettings = {
          ...defaultSettings,
          ...parsedSettings,
        };
        setSettings(migratedSettings);
        localStorage.setItem("timerSettings", JSON.stringify(migratedSettings));
      } else {
        // 破損したデータを削除
        localStorage.removeItem("timerSettings");
        setSettings(defaultSettings);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return; // Don't add event listeners until mounted

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "timerSettings" && e.newValue) {
        const parsedSettings = safeJsonParse(e.newValue, null);
        if (parsedSettings) {
          const migratedSettings: TimerSettings = {
            ...defaultSettings,
            ...parsedSettings,
          };
          setSettings(migratedSettings);
        } else {
          // 破損したデータの場合はデフォルト設定を使用
          setSettings(defaultSettings);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [mounted]);

  const updateSettings = (newSettings: Partial<TimerSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (mounted) {
      try {
        localStorage.setItem("timerSettings", JSON.stringify(updated));

        // 同じウィンドウ内での変更を検知するためにカスタムイベントを発火
        window.dispatchEvent(
          new CustomEvent("settingsChanged", { detail: updated })
        );
      } catch (error) {
        console.error("Error saving settings to localStorage:", error);
      }
    }
  };

  const saveAsDefault = () => {
    if (mounted) {
      try {
        localStorage.setItem("defaultTimerSettings", JSON.stringify(settings));
        alert("現在の設定をデフォルトとして保存しました！");
      } catch (error) {
        console.error("Error saving default settings:", error);
        alert("デフォルト設定の保存に失敗しました。");
      }
    }
  };

  const loadDefault = () => {
    if (!mounted) return;

    const defaultSettingsStr = localStorage.getItem("defaultTimerSettings");
    if (defaultSettingsStr) {
      const parsed = safeJsonParse(defaultSettingsStr, null);
      if (parsed) {
        updateSettings(parsed);
        alert("デフォルト設定を読み込みました！");
      } else {
        // 破損したデフォルト設定を削除
        localStorage.removeItem("defaultTimerSettings");
        alert(
          "デフォルト設定の読み込みに失敗しました。破損したデータを削除しました。"
        );
      }
    } else {
      alert("デフォルト設定が保存されていません。");
    }
  };

  const resetSettings = () => {
    updateSettings(defaultSettings);
    alert("設定をデフォルト値にリセットしました！");
  };

  // デバッグ用：localStorageをクリアする関数
  const clearLocalStorage = () => {
    try {
      // すべての関連するlocalStorageアイテムを削除
      const keysToRemove = [
        "timerSettings",
        "defaultTimerSettings",
        "theme",
        "timerSettings_backup",
        "defaultTimerSettings_backup",
      ];

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
          console.log(`Removed localStorage key: ${key}`);
        } catch (error) {
          console.warn(`Failed to remove localStorage key: ${key}`, error);
        }
      });

      // 設定をデフォルトにリセット
      setSettings(defaultSettings);

      alert("localStorageをクリアしました。ページを再読み込みしてください。");

      // 少し遅延してからページを再読み込み
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      alert("localStorageのクリアに失敗しました。");
    }
  };

  return {
    settings,
    updateSettings,
    saveAsDefault,
    loadDefault,
    resetSettings,
    mounted,
    clearLocalStorage, // デバッグ用
  };
}
