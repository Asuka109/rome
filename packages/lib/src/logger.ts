// Shared structured logger. The published app-runtime SDK mirrors the `Logger` shape.

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

/** A normalized, about-to-be-emitted event handed to an optional secondary {@link LogSink}. */
export interface LogRecord {
  level: LogLevel;
  component: string;
  message: string;
  /** User-supplied data after normalization (Errors → stack, objects → JSON string). */
  data?: Record<string, unknown>;
  /** Extra top-level fields resolved from `baseFields` for this event (e.g. `session.id`). */
  fields: Record<string, unknown>;
}

/** A secondary destination invoked once per emitted event, after the console line is written. */
export type LogSink = (record: LogRecord) => void;

export interface CreateLoggerOptions {
  /** Minimum level to emit. Defaults to the `LOG_LEVEL` env var, then `"info"`. */
  level?: LogLevel;
  /** Resolves extra top-level entry fields per event, e.g. `{ "session.id": id }`. */
  baseFields?: () => Record<string, unknown>;
  /** Secondary sink invoked after the JSON line is written (e.g. an OTLP mirror). */
  sink?: LogSink;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function resolveLevel(raw: string | undefined): LogLevel {
  const value = (raw ?? "info").toLowerCase();
  return value in LEVEL_ORDER ? (value as LogLevel) : "info";
}

// Primitives (and null) pass through; Errors become their stack/message;
// everything else is JSON-stringified exactly once so downstream sinks don't
// recurse into the same subtree a second time.
function normalizeData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    } else if (value instanceof Error) {
      out[key] = value.stack ?? value.message;
    } else {
      try {
        out[key] = JSON.stringify(value);
      } catch {
        out[key] = String(value);
      }
    }
  }
  return out;
}

function writeConsoleLine(level: LogLevel, line: string): void {
  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export function createLogger(component: string, options: CreateLoggerOptions = {}): Logger {
  const minLevel = options.level ?? resolveLevel(process.env.LOG_LEVEL);

  function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

    const fields = options.baseFields?.() ?? {};
    const normalized = data === undefined ? undefined : normalizeData(data);

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      ...fields,
    };
    if (normalized !== undefined) entry.data = normalized;

    writeConsoleLine(level, JSON.stringify(entry));

    options.sink?.({ level, component, message, data: normalized, fields });
  }

  return {
    debug: (message, data) => log("debug", message, data),
    info: (message, data) => log("info", message, data),
    warn: (message, data) => log("warn", message, data),
    error: (message, data) => log("error", message, data),
  };
}

// Route process-fatal events through the structured logger before the runtime
// dies. Without this, Node prints an uncaught exception or unhandled rejection
// as a raw multiline stack trace to stderr — which a JSON-line log collector
// can't parse, so it lands as several rows with no `level` (an ERROR-severity
// query then misses the crash entirely). Emitting one JSON line first gives the
// crash a real `level: "error"` and keeps it a single record.
//
// Registering these listeners takes ownership of the events, which disables
// Node's own print-and-exit. After an uncaught throw / rejection the runtime is
// in an undefined state, so we deliberately re-exit non-zero (matching Node's
// default `--unhandled-rejections=throw`) and let the process manager restart
// us; the console write above is synchronous to stderr, so the line is flushed
// before the exit.
export function installProcessCrashLogging(log: Logger): void {
  process.on("uncaughtException", (err, origin) => {
    log.error("uncaught exception", { err, origin });
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    log.error("unhandled rejection", { err: reason });
    process.exit(1);
  });
}
