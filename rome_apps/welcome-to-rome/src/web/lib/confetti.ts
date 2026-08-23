import type CanvasConfetti from "canvas-confetti";

// Celebratory bursts for the welcome screen — this is the guardian's very first
// screen in Rome, so the brief is simply "make them smile." A celebration reads
// festive, so we deliberately step outside the One Accent Rule with a full party
// palette (the same recipe romeCloud's fireCelebration uses). Both helpers honour
// prefers-reduced-motion and no-op on the server, so callers fire unconditionally.
const PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#facc15", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
];

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

async function load(): Promise<typeof CanvasConfetti | null> {
  if (reducedMotion()) return null;
  return (await import("canvas-confetti")).default;
}

/** Two side cannons sweeping inward — the big "welcome!" moment on mount. */
export async function fireWelcome(): Promise<void> {
  const confetti = await load();
  if (!confetti) return;

  const shoot = (originX: number, angle: number, opts: CanvasConfetti.Options = {}) =>
    confetti({
      origin: { x: originX, y: 0.7 },
      angle,
      colors: PALETTE,
      disableForReducedMotion: true,
      spread: 60,
      startVelocity: 62,
      particleCount: 70,
      ...opts,
    });

  // Left edge → up-right (angle 60), right edge → up-left (angle 120). A main
  // shot plus a lighter, wider trailing shot per side reads fuller.
  shoot(0, 60);
  shoot(1, 120);
  shoot(0, 60, { particleCount: 28, spread: 95, startVelocity: 48, scalar: 0.9, decay: 0.92 });
  shoot(1, 120, { particleCount: 28, spread: 95, startVelocity: 48, scalar: 0.9, decay: 0.92 });
}

/** A focused burst from a point on screen — fired when the guardian commits to
 *  starting the chat. `origin` is in viewport fractions (0..1). */
export async function fireBurst(origin: { x: number; y: number }): Promise<void> {
  const confetti = await load();
  if (!confetti) return;
  confetti({
    origin,
    colors: PALETTE,
    disableForReducedMotion: true,
    spread: 360,
    startVelocity: 38,
    particleCount: 110,
    ticks: 220,
    scalar: 1.05,
  });
}
