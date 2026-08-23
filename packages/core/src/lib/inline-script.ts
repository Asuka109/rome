// Breakout-safe embedding of server-side values into inline <script> bodies
//. JSON.stringify alone is not enough: a value containing
// "</script>" would close the surrounding tag mid-string. Escaping every "<"
// as \u003c keeps the emitted literal identical to the parser while making it
// inert to the HTML tokenizer. Values bound for URLs (e.g. the gtag loader
// query string) go through encodeURIComponent instead.
export function escapeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
