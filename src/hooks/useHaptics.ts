"use client";

import { useCallback } from "react";

export function useHaptics() {
  return useCallback((pattern: number | number[]) => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported — ignore */
    }
  }, []);
}
