"use client";

import { useRef, useState, useCallback } from "react";

const CLICK_THRESHOLD = 20;
const STORAGE_KEY = "signup-nudge-dismissed";

export function useClickNudge(isLoggedIn: boolean) {
  const clickCount = useRef(0);
  const [showNudge, setShowNudge] = useState(false);

  const recordClick = useCallback(() => {
    if (isLoggedIn) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) return;

    clickCount.current++;
    if (clickCount.current >= CLICK_THRESHOLD && !showNudge) {
      setShowNudge(true);
    }
  }, [isLoggedIn, showNudge]);

  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  return { showNudge, recordClick, dismissNudge };
}
