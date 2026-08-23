import {
  DISCORD_BROKER_VERSION,
  DISCORD_BROKER_METHODS,
  DISCORD_DEFAULT_TIMEOUT_MS,
  isDiscordBrokerHttpMethod,
  isProtectedDiscordBrokerRequestHeader,
  normalizeDiscordEndpoint,
  type DiscordBrokerRequest,
  type DiscordBrokerHttpMethod,
} from "@rome/api-types/discord-broker";
import { DiscordCliUsageError, type ParsedApiCommand } from "./args.js";

export interface DiscordApiInputDeps {
  readFile(path: string): Promise<string>;
  readStdin(): Promise<string>;
}

export async function buildDiscordApiRequest(
  command: ParsedApiCommand,
  deps: DiscordApiInputDeps,
): Promise<DiscordBrokerRequest> {
  const { endpoint, query } = splitEndpoint(command.endpoint);
  const method = resolveMethod(command);
  const headers = parseHeaders(command.headers);

  const stdinConsumers =
    (command.input === "-" ? 1 : 0) +
    command.fields.filter((field) => field.kind === "field" && fieldValue(field.value) === "@-")
      .length;
  if (stdinConsumers > 1) {
    throw new DiscordCliUsageError("only one option may read from standard input");
  }

  let body: unknown = null;
  if (command.input !== undefined) {
    if (method === "GET") {
      throw new DiscordCliUsageError("--input cannot be used with --method GET");
    }
    const raw = command.input === "-" ? await deps.readStdin() : await deps.readFile(command.input);
    try {
      body = JSON.parse(raw);
    } catch {
      throw new DiscordCliUsageError("--input must contain valid JSON");
    }
  } else if (command.fields.length > 0) {
    const parsedFields = [];
    for (const field of command.fields) {
      const [key, rawValue] = splitField(field.value);
      const value = field.kind === "raw-field" ? rawValue : await parseTypedValue(rawValue, deps);
      parsedFields.push({ key, value });
    }

    if (method === "GET") {
      for (const field of parsedFields) query.push([field.key, queryValue(field.value)]);
    } else {
      const object: Record<string, unknown> = {};
      for (const field of parsedFields) {
        if (Object.hasOwn(object, field.key)) {
          throw new DiscordCliUsageError(`field ${field.key} is repeated in a JSON request body`);
        }
        object[field.key] = field.value;
      }
      body = object;
    }
  }

  return {
    version: DISCORD_BROKER_VERSION,
    method,
    endpoint,
    query,
    headers,
    body,
    timeoutMs: DISCORD_DEFAULT_TIMEOUT_MS,
  };
}

function resolveMethod(command: ParsedApiCommand): DiscordBrokerHttpMethod {
  if (!command.method)
    return command.fields.length > 0 || command.input !== undefined ? "POST" : "GET";
  const method = command.method.toUpperCase();
  if (!isDiscordBrokerHttpMethod(method)) {
    throw new DiscordCliUsageError(`--method must be one of ${DISCORD_BROKER_METHODS.join(", ")}`);
  }
  return method;
}

function splitEndpoint(raw: string): { endpoint: string; query: Array<[string, string]> } {
  if (raw.includes("#")) {
    throw new DiscordCliUsageError("endpoint fragments are not accepted");
  }
  const queryIndex = raw.indexOf("?");
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const queryString = queryIndex === -1 ? "" : raw.slice(queryIndex + 1);
  let endpoint: string;
  try {
    endpoint = normalizeDiscordEndpoint(path);
  } catch (error) {
    throw new DiscordCliUsageError(error instanceof Error ? error.message : "invalid endpoint");
  }
  return { endpoint, query: [...new URLSearchParams(queryString).entries()] };
}

function splitField(value: string): [string, string] {
  const equals = value.indexOf("=");
  if (equals <= 0) throw new DiscordCliUsageError("fields must use key=value format");
  const key = value.slice(0, equals);
  if (/\p{Cc}/u.test(key)) throw new DiscordCliUsageError("field names cannot contain controls");
  return [key, value.slice(equals + 1)];
}

function fieldValue(value: string): string | null {
  const equals = value.indexOf("=");
  return equals === -1 ? null : value.slice(equals + 1);
}

async function parseTypedValue(value: string, deps: DiscordApiInputDeps): Promise<unknown> {
  let candidate = value;
  if (candidate.startsWith("@")) {
    const path = candidate.slice(1);
    if (!path) throw new DiscordCliUsageError("--field @ values require a file path");
    candidate = path === "-" ? await deps.readStdin() : await deps.readFile(path);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return candidate;
  }
}

function queryValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseHeaders(values: string[]): Record<string, string> {
  const headerName = /^[!#$%&'*+.^_`|~\dA-Za-z-]+$/;
  const headers: Record<string, string> = {};
  for (const value of values) {
    const colon = value.indexOf(":");
    if (colon <= 0) throw new DiscordCliUsageError("headers must use name:value format");
    const name = value.slice(0, colon).trim();
    const headerValue = value.slice(colon + 1).trimStart();
    if (!headerName.test(name) || /[\u0000-\u0008\u000a-\u001f\u007f]/.test(headerValue)) {
      throw new DiscordCliUsageError("header contains invalid characters");
    }
    if (isProtectedDiscordBrokerRequestHeader(name)) {
      throw new DiscordCliUsageError(`header ${name} is owned by Rome Core`);
    }
    headers[name] = headerValue;
  }
  return headers;
}
