"use client";

import { useEffect, useState } from "react";
import type { ShadowMode } from "@/types";

export type { ShadowMode };

export interface SpeechSupport {
  mode: ShadowMode;
  hasTTS: boolean;
  hasSTT: boolean;
  online: boolean;
  isIOSPWA: boolean;
  ready: boolean;
}

function getSTTConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function detect(): SpeechSupport {
  if (typeof window === "undefined") {
    return {
      mode: "typingOnly",
      hasTTS: false,
      hasSTT: false,
      online: true,
      isIOSPWA: false,
      ready: false,
    };
  }

  const hasTTS = "speechSynthesis" in window;
  const hasSTT = getSTTConstructor() !== null;
  const online = navigator.onLine;
  const isIOSPWA = navigator.standalone === true;

  let mode: ShadowMode;
  if (!online || isIOSPWA) {
    mode = "typingOnly";
  } else if (hasTTS && hasSTT) {
    mode = "full";
  } else if (hasTTS) {
    mode = "listening";
  } else {
    mode = "typingOnly";
  }

  return { mode, hasTTS, hasSTT, online, isIOSPWA, ready: true };
}

export function useSpeechSupport(): SpeechSupport {
  const [support, setSupport] = useState<SpeechSupport>(() => ({
    mode: "typingOnly",
    hasTTS: false,
    hasSTT: false,
    online: true,
    isIOSPWA: false,
    ready: false,
  }));

  useEffect(() => {
    const update = () => setSupport(detect());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return support;
}
