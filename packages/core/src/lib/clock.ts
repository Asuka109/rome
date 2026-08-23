// Wall-clock time as an injectable dependency: components that read time or
// schedule timers take a Clock so tests can drive time deterministically
// instead of sleeping or faking global timers. Production wiring passes
// `systemClock`.

/** Opaque timer handle; only meaningful to the Clock that created it. */
export type ClockTimer = object;

export interface Clock {
  now(): Date;
  setTimeout(fn: () => void, delayMs: number): ClockTimer;
  clearTimeout(timer: ClockTimer): void;
}

export const systemClock: Clock = {
  now: () => new Date(),
  setTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
  clearTimeout: (timer) => clearTimeout(timer as NodeJS.Timeout),
};
