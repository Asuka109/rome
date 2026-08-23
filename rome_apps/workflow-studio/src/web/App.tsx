import "./styles.css";
import { useCallback, useState } from "react";
import { startChat, type RomeAppBootstrap } from "@rome-os/app-web-sdk";

const EXAMPLE_PROMPTS = [
  "Every morning, summarize my unread emails and post the digest to my chat.",
  "When I save a link to my reading list, fetch the article and add a short summary.",
];

// The app is a front door: describing an automation opens a fresh guardian chat
// with that message under the `design-workflow` skill, which shapes it into a
// short spec, gets the guardian's approval, and builds the workflow — all in that
// one conversation. There is no panel to mirror, so the page is just the launcher.
export default function App({ bootstrap: _bootstrap }: { bootstrap: RomeAppBootstrap }) {
  const [draft, setDraft] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    const message = draft.trim();
    if (!message || starting) return;
    setStarting(true);
    setError(null);
    try {
      await startChat({ message, skillName: "design-workflow" });
      // startChat navigates to the new chat on success; no further work here.
    } catch {
      setStarting(false);
      setError("Couldn't start a chat just now — try again.");
    }
  }, [draft, starting]);

  return (
    <div className="ws-root">
      <div className="ws-frontdoor">
        <h1>Build a workflow</h1>
        <p className="ws-lede">
          Describe an automation in plain language. Your guardian shapes it into a short spec you
          approve, then builds it into a runnable workflow — all in one conversation.
        </p>
        <textarea
          className="ws-input"
          rows={3}
          placeholder="e.g. Every morning, summarize my unread emails and post the digest to my chat."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={starting}
        />
        <div className="ws-cta-row">
          <button
            className="ws-cta"
            onClick={() => void start()}
            disabled={!draft.trim() || starting}
          >
            {starting ? "Starting…" : "Design this workflow"}
          </button>
        </div>
        {error && <p className="ws-error-line">{error}</p>}
        <div className="ws-examples">
          <span className="ws-examples-label">Try one of these</span>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="ws-example"
              onClick={() => setDraft(p)}
              disabled={starting}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
