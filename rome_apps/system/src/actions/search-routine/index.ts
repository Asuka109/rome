import { defineAction, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  AppActionRuntimeDeps,
  Routine,
  RoutinesRepository,
  Trigger,
} from "@rome-os/app-runtime";
export type { RoutineMatch, SearchRoutineOutput } from "./types.js";

export const searchRoutineInputSchema = z.object({
  query: z
    .string()
    .describe(
      "Free-text description of the routine to find, e.g. " +
        '"water reminder". Matched leniently against each routine\'s name, ' +
        "action and arguments — NOT its schedule. Each result includes the " +
        "routine's schedule, so filter by time yourself (e.g. \"the morning " +
        'one") over what comes back. Pass an empty string to list every routine.',
    ),
});

export type SearchRoutineInput = z.infer<typeof searchRoutineInputSchema>;

export interface SearchRoutineDeps {
  routinesRepo: RoutinesRepository;
}

/** Words too common to carry intent — matching on them would make every
 * routine "match" and defeat the ranking. Kept deliberately small; the agent
 * does the final semantic narrowing over whatever this returns. */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "me",
  "my",
  "in",
  "on",
  "at",
  "of",
  "for",
  "and",
  "or",
  "is",
  "it",
  "that",
  "this",
  "please",
  "stop",
  "every",
  "each",
  "when",
  "about",
  "with",
]);

/** Render a trigger as a short human phrase so the agent can tell two routines
 * apart by *when* they run ("in the morning" → 08:00) without parsing the raw
 * trigger JSON. */
function summarizeTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case "schedule": {
      const when = `${trigger.localTime} ${trigger.tzid}`;
      if (trigger.rrule) return `recurring (${trigger.rrule}) at ${when}`;
      if (trigger.date) return `once on ${trigger.date} at ${when}`;
      return `once at next ${when}`;
    }
    case "webhook":
      return `webhook at /${trigger.path}`;
    case "event-bus":
      return `on event ${trigger.eventName}`;
    case "poll":
      return `poll ${trigger.source} every ${trigger.interval}`;
    case "manual":
      return "manual (run on demand)";
  }
}

/** The text a routine is matched against: its name, the action it runs, and
 * its argument values. The schedule is deliberately *not* matched — time
 * filtering ("in the morning") is brittle as substring matching, so we return
 * the schedule on every result and let the agent narrow by time itself. */
function haystack(routine: Routine): string {
  return [routine.name, routine.key ?? "", routine.actionName, JSON.stringify(routine.args)]
    .join(" ")
    .toLowerCase();
}

function meaningfulTokens(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return [...new Set(tokens)];
}

export async function searchRoutine(
  input: SearchRoutineInput,
  deps: SearchRoutineDeps,
): Promise<{
  query: string;
  totalRoutines: number;
  matches: Array<{
    id: string;
    name: string;
    key?: string;
    /** The app that owns this routine, if any. A managed routine can't be
     * deleted with delete_routine — tell the user to manage it from its app. */
    managedBy?: string;
    enabled: boolean;
    actionName: string;
    schedule: string;
    args: Record<string, unknown>;
  }>;
}> {
  const routines = await deps.routinesRepo.listRoutines();
  const tokens = meaningfulTokens(input.query);

  const scored = routines
    .map((routine) => {
      const schedule = summarizeTrigger(routine.trigger);
      // An empty/all-stopword query carries no intent — return every routine
      // (score 0) so the agent still gets the full list to reason over, rather
      // than an empty result that reads as "no routines exist".
      const score =
        tokens.length === 0 ? 0 : tokens.filter((t) => haystack(routine).includes(t)).length;
      return { routine, schedule, score };
    })
    .filter((entry) => tokens.length === 0 || entry.score > 0)
    .sort((a, b) => b.score - a.score || a.routine.name.localeCompare(b.routine.name));

  return {
    query: input.query,
    totalRoutines: routines.length,
    matches: scored.map(({ routine, schedule }) => ({
      id: routine.id,
      name: routine.name,
      key: routine.key,
      managedBy: routine.managedBy,
      enabled: routine.enabled,
      actionName: routine.actionName,
      schedule,
      args: routine.args,
    })),
  };
}

// --- Action factory ---

export function createSearchRoutineAction(config: ActionConfig, deps: SearchRoutineDeps): Action {
  return defineAction({
    config,
    schema: searchRoutineInputSchema,
    execute: async (input) => {
      const result = await searchRoutine(input, deps);
      return { status: "ok", data: result };
    },
  });
}

export function createAction(
  config: ActionConfig,
  deps: AppActionRuntimeDeps<SearchRoutineDeps>,
): Action {
  return createSearchRoutineAction(config, deps);
}
