export class DiscordCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscordCliUsageError";
  }
}

export interface ApiFlagValue {
  kind: "field" | "raw-field";
  value: string;
}

export interface ParsedApiCommand {
  kind: "api";
  endpoint: string;
  method?: string;
  fields: ApiFlagValue[];
  headers: string[];
  input?: string;
  include: boolean;
  json: boolean;
  silent: boolean;
  verbose: boolean;
}

export type ParsedCommand =
  | { kind: "help"; text: string }
  | { kind: "auth"; json: boolean }
  | ParsedApiCommand;

export const TOP_LEVEL_HELP = `Use Discord's bot-authenticated REST API through Rome Core.

USAGE
  discord
  discord help [command]
  discord auth [status] [--json]
  discord api <endpoint> [flags]

COMMANDS
  auth   Check the live Discord bot identity connected through Rome
  api    Make an authenticated Discord API v10 request
  help   Show help for a command

Authentication is managed by Rome Settings -> Connections.
This CLI never receives, stores, or prints the Discord bot token.
`;

export const AUTH_HELP = `Check the Discord bot authentication managed by Rome.

USAGE
  discord auth [status] [--json]

FLAGS
      --json   Emit one versioned JSON result object
  -h, --help   Show help for command

Authentication is managed by Rome Settings -> Connections.
This command never receives, stores, or prints the Discord bot token.
`;

export const API_HELP = `Makes an authenticated HTTP request to the Discord API and prints the response.

The endpoint argument must be a path of a Discord API v10 endpoint. A leading
slash is optional. The endpoint is resolved relative to
\`https://discord.com/api/v10\`; absolute URLs are not accepted.

Authentication comes from the Discord bot connected in Rome Settings ->
Connections. The request is executed by the local Rome Core process. This
command does not receive, accept, store, or print a Discord token. If Discord is
not connected through Rome, the command exits with code 4.

The default HTTP request method is \`GET\` normally and \`POST\` if any parameters
or an input body were added. Override the method with \`--method\`.

Pass one or more \`-f/--raw-field\` values in \`key=value\` format to add string
parameters. Pass \`-F/--field\` to add typed parameters. Adding parameters
automatically switches the request method to \`POST\`. To send parameters as a
\`GET\` query string instead, use \`--method GET\`.

The \`-F/--field\` flag converts a value as follows:

- if the value starts with \`@\`, the rest is a filename to read; use \`@-\` to
  read from standard input;
- a valid JSON value is decoded, including objects, arrays, strings, booleans,
  numbers, and \`null\`;
- any other value is kept as a string.

Field names are top-level keys. To pass a nested value, use JSON as the field
value or pass a complete JSON body with \`--input\`. Use \`-\` with \`--input\` to
read the body from standard input. \`--input\` cannot be combined with \`--field\`
or \`--raw-field\`.

The \`-H/--header\` flag adds a request header. \`Authorization\`, \`Host\`,
\`User-Agent\`, \`Content-Length\`, and \`Content-Type\` are owned by Rome Core and
cannot be overridden.

By default, the response body is printed directly. Use \`--include\` to include
the response status and safe headers, or \`--silent\` to suppress the body.

Use \`--json\` to emit exactly one versioned JSON result object for success or
failure. JSON mode preserves the command's exit code. With \`--include\`, safe
response headers are placed in the JSON \`headers\` object. \`--json\` cannot be
combined with \`--silent\`.

Discord rate limits are coordinated by Rome Core's shared REST manager. The
command waits for ordinary limits and fails if the required wait exceeds its
deadline.

USAGE
  discord api <endpoint> [flags]

FLAGS
  -F, --field key=value       Add a typed query or JSON body parameter (use "@<path>" or "@-" to read a value)
  -H, --header key:value      Add an allowed HTTP request header
  -i, --include               Include HTTP response status and safe headers in the output
      --input file            Read the complete JSON request body from a file (use "-" for stdin)
      --json                  Emit one versioned JSON result object
  -X, --method string         The HTTP method for the request (default "GET")
  -f, --raw-field key=value   Add a string query or JSON body parameter
      --silent                Do not print the response body
      --verbose               Print redacted request and response diagnostics to stderr

INHERITED FLAGS
  -h, --help   Show help for command

EXAMPLES
  # Inspect the current bot user
  $ discord api users/@me

  # List the latest 20 messages in a channel
  $ discord api channels/$CHANNEL_ID/messages -X GET -F limit=20

  # Post a message without allowing generated text to trigger mentions
  $ discord api channels/$CHANNEL_ID/messages \\
      -F content='Hello from Rome' \\
      -F 'allowed_mentions={"parse":[]}'

  # Post a complete nested JSON payload from a file
  $ discord api channels/$CHANNEL_ID/messages --input payload.json

  # Add a Discord audit-log reason header
  $ discord api channels/$CHANNEL_ID \\
      -X PATCH \\
      -H 'X-Audit-Log-Reason:Updated by Rome' \\
      -F name='agent-updates'

  # Return a stable machine-readable result envelope
  $ discord api channels/$CHANNEL_ID/messages -X GET -F limit=20 --json

ENVIRONMENT VARIABLES
  INTERNAL_API_PORT: override the local Rome Core API port (default "4141")

LEARN MORE
  Use \`discord help <command>\` for more information about a command.
  Read the Discord API reference at https://docs.discord.com/developers/reference
  Manage Discord authentication in Rome Settings -> Connections.
`;

export function parseDiscordArgs(argv: string[]): ParsedCommand {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    if (argv.length > 1) throw new DiscordCliUsageError("unexpected arguments after --help");
    return { kind: "help", text: TOP_LEVEL_HELP };
  }

  const [command, ...rest] = argv;
  if (command === "help") return parseHelp(rest);
  if (command === "auth") return parseAuth(rest);
  if (command === "api") return parseApi(rest);
  throw new DiscordCliUsageError(`unknown command: ${command}`);
}

export function jsonWasRequested(argv: string[]): boolean {
  return argv.includes("--json") && argv[0] !== "help";
}

function parseHelp(args: string[]): ParsedCommand {
  const filtered = args.filter((arg) => arg !== "--json");
  if (filtered.length === 0) return { kind: "help", text: TOP_LEVEL_HELP };
  if (filtered.length > 1) throw new DiscordCliUsageError("help accepts at most one command");
  if (filtered[0] === "auth") return { kind: "help", text: AUTH_HELP };
  if (filtered[0] === "api") return { kind: "help", text: API_HELP };
  throw new DiscordCliUsageError(`unknown help topic: ${filtered[0]}`);
}

function parseAuth(args: string[]): ParsedCommand {
  if (args.includes("-h") || args.includes("--help")) {
    return { kind: "help", text: AUTH_HELP };
  }
  let json = false;
  let sawStatus = false;
  for (const arg of args) {
    if (arg === "--json") json = true;
    else if (arg === "status" && !sawStatus) sawStatus = true;
    else if (arg === "login" || arg === "logout") {
      throw new DiscordCliUsageError(
        `discord auth ${arg} is not supported; manage Discord in Rome Settings -> Connections`,
      );
    } else if (arg === "token") {
      throw new DiscordCliUsageError("discord auth token is not supported");
    } else {
      throw new DiscordCliUsageError(`unexpected auth argument: ${arg}`);
    }
  }
  return { kind: "auth", json };
}

function parseApi(args: string[]): ParsedCommand {
  if (args.includes("-h") || args.includes("--help")) {
    return { kind: "help", text: API_HELP };
  }

  const parsed: ParsedApiCommand = {
    kind: "api",
    endpoint: "",
    fields: [],
    headers: [],
    include: false,
    json: false,
    silent: false,
    verbose: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const long = splitLongFlag(arg);
    if (arg === "--json") parsed.json = true;
    else if (arg === "--silent") parsed.silent = true;
    else if (arg === "--verbose") parsed.verbose = true;
    else if (arg === "-i" || arg === "--include") parsed.include = true;
    else if (arg === "-X" || arg === "--method" || long?.name === "--method") {
      const [value, next] = flagValue(args, index, long?.value);
      parsed.method = value;
      index = next;
    } else if (arg === "-F" || arg === "--field" || long?.name === "--field") {
      const [value, next] = flagValue(args, index, long?.value);
      parsed.fields.push({ kind: "field", value });
      index = next;
    } else if (arg === "-f" || arg === "--raw-field" || long?.name === "--raw-field") {
      const [value, next] = flagValue(args, index, long?.value);
      parsed.fields.push({ kind: "raw-field", value });
      index = next;
    } else if (arg === "-H" || arg === "--header" || long?.name === "--header") {
      const [value, next] = flagValue(args, index, long?.value);
      parsed.headers.push(value);
      index = next;
    } else if (arg === "--input" || long?.name === "--input") {
      const [value, next] = flagValue(args, index, long?.value);
      if (parsed.input !== undefined) throw new DiscordCliUsageError("--input may be used once");
      parsed.input = value;
      index = next;
    } else if (arg.startsWith("-")) {
      throw new DiscordCliUsageError(`unknown api flag: ${arg}`);
    } else if (!parsed.endpoint) {
      parsed.endpoint = arg;
    } else {
      throw new DiscordCliUsageError(`unexpected api argument: ${arg}`);
    }
  }

  if (!parsed.endpoint) throw new DiscordCliUsageError("discord api requires an endpoint");
  if (parsed.json && parsed.silent) {
    throw new DiscordCliUsageError("--json cannot be combined with --silent");
  }
  if (parsed.input !== undefined && parsed.fields.length > 0) {
    throw new DiscordCliUsageError("--input cannot be combined with --field or --raw-field");
  }
  return parsed;
}

function splitLongFlag(arg: string): { name: string; value: string } | null {
  if (!arg.startsWith("--")) return null;
  const equals = arg.indexOf("=");
  return equals === -1 ? null : { name: arg.slice(0, equals), value: arg.slice(equals + 1) };
}

function flagValue(args: string[], index: number, inline: string | undefined): [string, number] {
  if (inline !== undefined) {
    if (!inline) throw new DiscordCliUsageError(`missing value for ${args[index].split("=")[0]}`);
    return [inline, index];
  }
  const value = args[index + 1];
  if (value === undefined) throw new DiscordCliUsageError(`missing value for ${args[index]}`);
  return [value, index + 1];
}
