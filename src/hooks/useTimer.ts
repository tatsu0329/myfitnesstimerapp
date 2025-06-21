import { useState, useEffect, useCallback, useRef } from "react";

export const useTimer = (initialTime: number, onEnd?: () => void) => {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const onEndRef = useRef(onEnd);

  // onEndコールバックをrefに保存して安定化
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime === 0) {
            setIsRunning(false);
            // 次のtickでコールバックを実行
            setTimeout(() => {
              onEndRef.current?.();
            }, 0);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, time]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(initialTime);
  }, [initialTime]);

  // コールバックを後から設定するための関数
  const setOnEnd = useCallback((callback: () => void) => {
    onEndRef.current = callback;
  }, []);

  return { time, isRunning, start, pause, reset, setOnEnd };
};
