"use client";

export interface STTResult {
  transcript: string;
  confidence: number;
}

export type STTErrorKind =
  | "unsupported"
  | "no-speech"
  | "not-allowed"
  | "network"
  | "aborted"
  | "unknown";

export interface STTHandle {
  stop: () => void;
  abort: () => void;
}

interface STTCallbacks {
  onResult: (result: STTResult) => void;
  onError: (kind: STTErrorKind) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapError(error: string): STTErrorKind {
  switch (error) {
    case "no-speech":
      return "no-speech";
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    default:
      return "unknown";
  }
}

export function startRecognition(callbacks: STTCallbacks): STTHandle | null {
  const Ctor = getConstructor();
  if (!Ctor) {
    callbacks.onError("unsupported");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let resolved = false;

  recognition.onstart = () => callbacks.onStart?.();

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const alternative = result?.[0];
    if (!alternative) return;
    resolved = true;
    callbacks.onResult({
      transcript: alternative.transcript ?? "",
      confidence:
        typeof alternative.confidence === "number" ? alternative.confidence : 1,
    });
  };

  recognition.onerror = (event) => {
    resolved = true;
    callbacks.onError(mapError(event.error));
  };

  recognition.onend = () => {
    if (!resolved) callbacks.onError("no-speech");
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    callbacks.onError("unknown");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
