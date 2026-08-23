import { createLogger as createBaseLogger, type Logger, type LogLevel } from "@rome-os/libs/logger";
import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";
import { currentSessionId } from "./telemetry-context.js";

export type { Logger };

// `@rome-os/libs` owns the JSON-line stdout sink, level gating, and data
// normalization. Core layers on the OTLP mirror for ClickStack ingestion and
// stamps the log source, optional app id, and active session id onto every line.
// Both destinations share the one normalized payload `@rome-os/libs` produces, so a
// nested object is JSON-stringified exactly once and reads identically in stdout
// and in `otel_logs`.
//
// The OTEL log API is a no-op until `initTelemetry()` registers a LoggerProvider,
// so importing this module from tests is safe.

const SEVERITY_NUMBER: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

export type RomeLogSource = "rome" | "rome-apps";

export interface RomeLoggerOptions {
  source?: RomeLogSource;
  appId?: string;
}

export function createLogger(component: string, options: RomeLoggerOptions = {}): Logger {
  const source = options.source ?? "rome";
  return createBaseLogger(component, {
    baseFields: () => {
      const sessionId = currentSessionId();
      return {
        "rome.log.source": source,
        ...(options.appId === undefined ? {} : { "rome.app.id": options.appId }),
        ...(sessionId === undefined ? {} : { "session.id": sessionId }),
      };
    },
    // Mirror to OTLP for ClickStack ingestion. The OTEL Logger automatically
    // attaches the active context's trace+span ids when present, so logs
    // emitted inside a `withRomeSpan` body are linked in `otel_logs`.
    sink: ({ level, message, data, fields }) => {
      const attributes: AnyValueMap = { component };
      Object.assign(attributes, fields);
      if (data !== undefined) Object.assign(attributes, data);

      logs.getLogger(source).emit({
        severityNumber: SEVERITY_NUMBER[level],
        severityText: level,
        body: message,
        attributes,
      });
    },
  });
}

/**
 * Create a logger for activity attributable to a Rome app, including host-side
 * dispatch at an app boundary. App logs still run inside the Rome process and
 * therefore share its resource-level `service.name`; the instrumentation scope
 * and record attributes provide the per-log distinction used by ClickStack.
 */
export function createAppLogger(component: string, appId: string): Logger {
  return createLogger(component, { source: "rome-apps", appId });
}
