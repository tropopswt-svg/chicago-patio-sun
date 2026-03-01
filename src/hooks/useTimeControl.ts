"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { isSunUp, getSunriseMinute, getSunsetMinute, chicagoMinuteOfDay } from "@/lib/suncalc-utils";
import { TIME_STEP_MINUTES, ANIMATION_INTERVAL_MS } from "@/lib/constants";
import type { TimeState } from "@/lib/types";

function getMinuteOfDay(date: Date): number {
  return chicagoMinuteOfDay(date);
}

/** Shift base timestamp so Chicago wall-clock shows the target minute */
function dateFromMinute(base: Date, minute: number): Date {
  const current = chicagoMinuteOfDay(base);
  const deltaMs = (minute - current) * 60_000;
  return new Date(base.getTime() + deltaMs);
}

// Initial autoplay: hour-by-hour sweep so user sees the sun move on load
// Manual play (after any interaction): minute-by-minute for fine control
const AUTOPLAY_STEP = TIME_STEP_MINUTES; // 60 min
const AUTOPLAY_INTERVAL = ANIMATION_INTERVAL_MS; // 3s
const MANUAL_STEP = 1; // 1 min
const MANUAL_INTERVAL = 100; // 100ms

export function useTimeControl() {
  const now = new Date();
  const [date, setDate] = useState<Date>(() => now);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minuteOfDay = getMinuteOfDay(date);
  const isNight = !isSunUp(date);
  const sunriseMinute = getSunriseMinute(date);
  const sunsetMinute = getSunsetMinute(date);

  // User drags slider → stop playing, end autoplay mode
  // Throttled via rAF so at most 1 state update per frame during fast drags
  const rafRef = useRef<number | null>(null);
  const pendingMinuteRef = useRef<number | null>(null);

  const setMinuteOfDay = useCallback(
    (minute: number) => {
      setIsPlaying(false);
      setIsAutoplay(false);
      pendingMinuteRef.current = Math.min(Math.max(minute, 0), 1439);
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const m = pendingMinuteRef.current;
          if (m !== null) {
            setDate((prev) => dateFromMinute(prev, m));
          }
        });
      }
    },
    []
  );

  const setCalendarDate = useCallback((newDate: Date) => {
    setDate((prev) => {
      const m = getMinuteOfDay(prev);
      return dateFromMinute(newDate, m);
    });
  }, []);

  // Any screen interaction → kill autoplay completely
  const stopPlay = useCallback(() => {
    if (isAutoplay) {
      setIsPlaying(false);
      setIsAutoplay(false);
    }
  }, [isAutoplay]);

  // Play button → always manual (minute-by-minute) after first interaction
  // If starting, jump to sunrise first
  const togglePlay = useCallback(() => {
    setIsAutoplay(false);
    setIsPlaying((prev) => {
      if (!prev) {
        // Starting playback — jump to sunrise
        setDate((d) => dateFromMinute(d, sunriseMinute));
      }
      return !prev;
    });
  }, [sunriseMinute]);

  const stepForward = useCallback(() => {
    setDate((prev) => {
      const m = getMinuteOfDay(prev);
      const step = isAutoplay ? AUTOPLAY_STEP : MANUAL_STEP;
      const next = m + step;
      if (next > sunsetMinute) {
        setIsPlaying(false);
        setIsAutoplay(false);
        return dateFromMinute(prev, sunriseMinute);
      }
      return dateFromMinute(prev, next);
    });
  }, [sunriseMinute, sunsetMinute, isAutoplay]);

  useEffect(() => {
    if (isPlaying) {
      const interval = isAutoplay ? AUTOPLAY_INTERVAL : MANUAL_INTERVAL;
      intervalRef.current = setInterval(stepForward, interval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, stepForward, isAutoplay]);

  const timeState: TimeState = {
    date,
    minuteOfDay,
    isPlaying,
    isNight,
  };

  return {
    timeState,
    sunriseMinute,
    sunsetMinute,
    setMinuteOfDay,
    setCalendarDate,
    togglePlay,
    stopPlay,
  };
}
