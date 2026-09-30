import { useState, useEffect, useRef } from 'react';
import { KeepAwake } from '@capacitor-community/keep-awake';

interface UseMatchTimerProps {
  isRunning: boolean;
  onTick: (deltaSeconds: number) => void;
}

export function useMatchTimer({ isRunning, onTick }: UseMatchTimerProps) {
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const lastTimestampRef = useRef<number | null>(null);

  // Native App Wake Lock
  useEffect(() => {
    const manageWakeLock = async () => {
      try {
        if (!isPaused && isRunning) {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch {
        // Silent fallback outside Capacitor
      }
    };
    manageWakeLock();
  }, [isPaused, isRunning]);

  // Drift-resistant timer ticker
  useEffect(() => {
    if (isPaused || !isRunning) {
      lastTimestampRef.current = null;
      return;
    }

    lastTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const last = lastTimestampRef.current ?? now;
      const elapsedMs = now - last;

      if (elapsedMs >= 1000) {
        const deltaSeconds = Math.floor(elapsedMs / 1000);
        lastTimestampRef.current = now - (elapsedMs % 1000);
        onTick(deltaSeconds);
      }
    }, 500); // Check every 500ms to catch second boundaries without drift

    return () => clearInterval(interval);
  }, [isPaused, isRunning, onTick]);

  const togglePlayPause = () => setIsPaused(prev => !prev);

  return {
    isPaused,
    setIsPaused,
    togglePlayPause,
  };
}
