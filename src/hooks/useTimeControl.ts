"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { setHours, setMinutes, setSeconds } from "date-fns";
import { isSunUp, getSunriseMinute, getSunsetMinute, chicagoMinuteOfDay } from "@/lib/suncalc-utils";
import { TIME_STEP_MINUTES, ANIMATION_INTERVAL_MS } from "@/lib/constants";
import type { TimeState } from "@/lib/types";

// Compute Chicago-vs-local offset once (only shifts at DST, fine for a session)
const CHICAGO_OFFSET_MIN = (() => {
  const now = new Date();
  const localMin = now.getHours() * 60 + now.getMinutes();
  const chicagoMin = chicagoMinuteOfDay(now);
  return chicagoMin - localMin;
})();

function getMinuteOfDay(date: Date): number {
  return ((date.getHours() * 60 + date.getMinutes() + CHICAGO_OFFSET_MIN) % 1440 + 1440) % 1440;
}

function dateFromMinute(base: Date, minute: number): Date {
  const localMinute = ((minute - CHICAGO_OFFSET_MIN) % 1440 + 1440) % 1440;
  const h = Math.floor(localMinute / 60);
  const m = localMinute % 60;
  return setSeconds(setMinutes(setHours(base, h), m), 0);
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
  const setMinuteOfDay = useCallback(
    (minute: number) => {
      setIsPlaying(false);
      setIsAutoplay(false);
      setDate((prev) => dateFromMinute(prev, Math.min(Math.max(minute, 0), 1439)));
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
  const togglePlay = useCallback(() => {
    setIsAutoplay(false);
    setIsPlaying((prev) => !prev);
  }, []);

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
