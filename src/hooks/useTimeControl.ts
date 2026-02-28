"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { setHours, setMinutes, setSeconds } from "date-fns";
import { isSunUp, getSunriseMinute, getSunsetMinute } from "@/lib/suncalc-utils";
import { TIME_STEP_MINUTES, ANIMATION_INTERVAL_MS } from "@/lib/constants";
import type { TimeState } from "@/lib/types";

function getMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function dateFromMinute(base: Date, minute: number): Date {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return setSeconds(setMinutes(setHours(base, h), m), 0);
}

export function useTimeControl() {
  const now = new Date();
  const [date, setDate] = useState<Date>(() => dateFromMinute(now, 7 * 60));
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minuteOfDay = getMinuteOfDay(date);
  const isNight = !isSunUp(date);
  const sunriseMinute = getSunriseMinute(date);
  const sunsetMinute = getSunsetMinute(date);

  const setMinuteOfDay = useCallback(
    (minute: number) => {
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

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stepForward = useCallback(() => {
    setDate((prev) => {
      const m = getMinuteOfDay(prev);
      const next = m + TIME_STEP_MINUTES;
      if (next > sunsetMinute) {
        setIsPlaying(false);
        return dateFromMinute(prev, sunriseMinute);
      }
      return dateFromMinute(prev, next);
    });
  }, [sunriseMinute, sunsetMinute]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(stepForward, ANIMATION_INTERVAL_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, stepForward]);

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
  };
}
