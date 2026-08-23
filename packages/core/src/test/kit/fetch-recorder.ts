// fetchRecorder — outbound HTTP is a process edge; tests script the remote
// side and assert the outbound contract (URL, method, headers, body) instead
// of stubbing global fetch. Inject `recorder.fetch` through a module's
// `fetch?: typeof fetch` option (rome-cloud-listing-client, bundle-fetcher,
// instance-identity, rome-cloud-relay).
//
// Matching is strict: a string rule must equal the full request URL, so the
// test pins URL construction too. A request no rule matches rejects with
// FetchRecorderUnmatchedError — but beware that code under test often maps
// *any* fetch rejection to a benign result (e.g. "unreachable"), so a typo'd
// rule URL can silently satisfy a failure-path assertion. `calls` records
// every request and `unmatched` the misses; assert on them when the test's
// outcome alone can't distinguish "scripted failure" from "wrong URL".

export interface RecordedFetchCall {
  url: string;
  method: string;
  headers: Headers;
  /** UTF-8 request body, or null when the request had none. */
  body: string | null;
}

export interface FetchRule {
  /**
   * Respond with `status`. A `BodyInit` body (string, `Uint8Array`,
   * `ArrayBuffer`, `Blob`, …) is sent as-is; any other non-undefined body is
   * JSON-encoded with `content-type: application/json`.
   */
  reply(status: number, body?: unknown): void;
  /** Reject the fetch with `error` — a network-level failure (no response). */
  failWith(error: Error): void;
  /**
   * Never respond; reject with the request signal's reason once it aborts.
   * This is how a test makes an `AbortSignal.timeout(...)` branch win — only
   * use it when the code under test enforces an abort, or the fetch (and the
   * test) hangs forever.
   */
  hangUntilAborted(): void;
}

export interface FetchRecorder {
  /** Inject this wherever the code under test accepts a `fetch` override. */
  fetch: typeof fetch;
  /** Every request made, in order — matched or not. */
  calls: RecordedFetchCall[];
  /** Requests no rule matched (each also rejected the fetch promise). */
  unmatched: RecordedFetchCall[];
  /**
   * Script the response for `method` + `url`. A string `url` must match the
   * full request URL exactly; a RegExp is tested against it. First matching
   * rule wins; a rule answers every request that matches it.
   */
  when(method: string, url: string | RegExp): FetchRule;
}

export class FetchRecorderUnmatchedError extends Error {
  constructor(call: RecordedFetchCall, routes: string[]) {
    super(
      `fetchRecorder: no rule matches ${call.method} ${call.url}` +
        (routes.length > 0 ? ` (rules: ${routes.join(", ")})` : " (no rules registered)"),
    );
    this.name = "FetchRecorderUnmatchedError";
  }
}

interface Rule {
  method: string;
  url: string | RegExp;
  respond: (signal: AbortSignal) => Response | Promise<Response>;
}

function matchesUrl(ruleUrl: string | RegExp, url: string): boolean {
  if (typeof ruleUrl === "string") return ruleUrl === url;
  // `test()` advances `lastIndex` on /g and /y regexes, which would make a
  // rule miss the second of two identical requests; always match from 0.
  ruleUrl.lastIndex = 0;
  return ruleUrl.test(url);
}

/** Body values `Response` accepts natively — sent as-is, never JSON-encoded. */
function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof Uint8Array ||
    body instanceof ArrayBuffer ||
    body instanceof Blob ||
    body instanceof ReadableStream ||
    body instanceof URLSearchParams ||
    body instanceof FormData
  );
}

export function createFetchRecorder(): FetchRecorder {
  const rules: Rule[] = [];
  const calls: RecordedFetchCall[] = [];
  const unmatched: RecordedFetchCall[] = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    // Request normalizes every input form (string, URL, Request) into one
    // canonical view of the outbound contract.
    const request = new Request(input, init);
    const call: RecordedFetchCall = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body == null ? null : await request.text(),
    };
    calls.push(call);

    // Real fetch never sends an already-aborted request; it rejects with the
    // signal's reason. The attempt is still recorded in `calls` above so tests
    // can assert the code under test got as far as issuing it.
    if (request.signal.aborted) throw request.signal.reason;

    const rule = rules.find((r) => r.method === call.method && matchesUrl(r.url, call.url));
    if (!rule) {
      unmatched.push(call);
      throw new FetchRecorderUnmatchedError(
        call,
        rules.map((r) => `${r.method} ${r.url}`),
      );
    }
    return rule.respond(request.signal);
  };

  return {
    fetch: fetchImpl,
    calls,
    unmatched,
    when(method, url) {
      const base = { method: method.toUpperCase(), url };
      return {
        reply(status, body) {
          rules.push({
            ...base,
            respond: () =>
              body === undefined
                ? new Response(null, { status })
                : isBodyInit(body)
                  ? new Response(body, { status })
                  : new Response(JSON.stringify(body), {
                      status,
                      headers: { "content-type": "application/json" },
                    }),
          });
        },
        failWith(error) {
          rules.push({
            ...base,
            respond: () => {
              throw error;
            },
          });
        },
        hangUntilAborted() {
          rules.push({
            ...base,
            respond: (signal) =>
              new Promise<Response>((_, reject) => {
                signal.addEventListener("abort", () => reject(signal.reason), { once: true });
              }),
          });
        },
      };
    },
  };
}
