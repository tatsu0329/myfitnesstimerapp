import { useState, useEffect, useCallback, useRef } from "react";

export const useTimer = (initialTime: number, onEnd?: () => void) => {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const onEndRef = useRef(onEnd);
  const initialTimeRef = useRef(initialTime);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);
  const callbackDisabledRef = useRef(false);

  // onEndコールバックをrefに保存して安定化
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // initialTimeが変更された時のみ、タイマーが停止中なら更新
  useEffect(() => {
    if (initialTime !== initialTimeRef.current) {
      initialTimeRef.current = initialTime;
      if (!isRunning) {
        setTime(initialTime);
        pausedTimeRef.current = null;
      }
    }
  }, [initialTime, isRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
        const newTime = Math.max(0, initialTimeRef.current - elapsed);

        if (newTime <= 0) {
          setIsRunning(false);
          setTime(0);
          pausedTimeRef.current = null;
          // 次のtickでコールバックを実行（無効化されていない場合のみ）
          console.log("Timer reached zero, scheduling onEnd callback");
          setTimeout(() => {
            if (!callbackDisabledRef.current) {
              console.log("Executing onEnd callback");
              onEndRef.current?.();
            } else {
              console.log("Skipping onEnd callback - callback is disabled");
            }
          }, 0);
        } else {
          setTime(newTime);
        }
      }, 16); // 約60fps (1000ms / 60 ≈ 16.67ms)
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, time]);

  const start = useCallback(() => {
    if (pausedTimeRef.current !== null) {
      // 一時停止からの再開
      startTimeRef.current =
        Date.now() - (initialTimeRef.current - pausedTimeRef.current) * 1000;
    } else {
      // 新規開始
      startTimeRef.current = Date.now();
    }
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    pausedTimeRef.current = time;
  }, [time]);

  const reset = useCallback(() => {
    console.log("Timer reset called - resetting timer state");
    // Disable callbacks during reset
    callbackDisabledRef.current = true;
    setIsRunning(false);
    setTime(initialTimeRef.current);
    startTimeRef.current = null;
    pausedTimeRef.current = null;

    // Re-enable callbacks after a short delay
    setTimeout(() => {
      callbackDisabledRef.current = false;
      console.log("Timer reset completed - callbacks re-enabled");
    }, 100);
  }, []);

  // コールバックを後から設定するための関数
  const setOnEnd = useCallback((callback: () => void) => {
    onEndRef.current = callback;
  }, []);

  // コールバックを一時的に無効化する関数
  const disableCallbacks = useCallback(() => {
    callbackDisabledRef.current = true;
  }, []);

  // コールバックを再有効化する関数
  const enableCallbacks = useCallback(() => {
    callbackDisabledRef.current = false;
  }, []);

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    setOnEnd,
    disableCallbacks,
    enableCallbacks,
  };
};
