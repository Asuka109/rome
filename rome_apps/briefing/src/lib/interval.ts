/**
 * Scout intervals expressed in minutes, mapped to schedule triggers the Rome
 * scheduler understands. The scheduler converts RRULE FREQ + INTERVAL into a
 * cron pattern, so we keep to clean MINUTELY / HOURLY / DAILY shapes that
 * translate to valid cron fields.
 */

export interface ScheduleTrigger {
  type: "schedule";
  tzid: string;
  // create_routine requires an explicit tz binding. Briefing
  // schedules follow the guardian's local time, so they are always floating.
  tzMode: "floating";
  localTime: string;
  rrule: string;
}

export interface IntervalOption {
  minutes: number;
  label: string;
}

export const INTERVAL_OPTIONS: IntervalOption[] = [
  { minutes: 15, label: "Every 15 minutes" },
  { minutes: 30, label: "Every 30 minutes" },
  { minutes: 60, label: "Hourly" },
  { minutes: 120, label: "Every 2 hours" },
  { minutes: 180, label: "Every 3 hours" },
  { minutes: 360, label: "Every 6 hours" },
  { minutes: 720, label: "Every 12 hours" },
  { minutes: 1440, label: "Daily" },
];

const MIN_MINUTES = 15;
const MAX_MINUTES = 1440;

/** Clamp an arbitrary minute value to a supported, cron-clean interval. */
export function normalizeIntervalMinutes(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return 360;
  if (n < MIN_MINUTES) return MIN_MINUTES;
  if (n > MAX_MINUTES) return MAX_MINUTES;
  // Snap to the nearest supported option so the generated cron is always valid.
  let best = INTERVAL_OPTIONS[0];
  for (const opt of INTERVAL_OPTIONS) {
    if (Math.abs(opt.minutes - n) < Math.abs(best.minutes - n)) best = opt;
  }
  return best.minutes;
}

export function intervalLabel(minutes: number): string {
  return INTERVAL_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `Every ${minutes} minutes`;
}

/**
 * Build a schedule trigger for a scout interval. Daily scouts anchor to a
 * sensible morning hour; sub-daily ones run on the minute/hour cadence.
 */
export function intervalToTrigger(minutes: number, tzid: string): ScheduleTrigger {
  const tz = tzid || "UTC";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return {
      type: "schedule",
      tzid: tz,
      tzMode: "floating",
      localTime: "08:00",
      rrule: `FREQ=DAILY;INTERVAL=${days}`,
    };
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return {
      type: "schedule",
      tzid: tz,
      tzMode: "floating",
      localTime: "00:00",
      rrule: `FREQ=HOURLY;INTERVAL=${hours}`,
    };
  }
  return {
    type: "schedule",
    tzid: tz,
    tzMode: "floating",
    localTime: "00:00",
    rrule: `FREQ=MINUTELY;INTERVAL=${minutes}`,
  };
}
