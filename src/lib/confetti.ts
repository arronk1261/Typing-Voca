"use client";

export async function burstConfetti() {
  if (typeof window === "undefined") return;
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReduced) return;
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 70,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#F59E0B", "#22C55E", "#FBBF24"],
    });
  } catch {
    /* ignore */
  }
}
