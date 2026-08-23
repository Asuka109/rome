import "./styles.css";
import { useEffect, useState } from "react";
import type { RomeAppBootstrap } from "@rome-os/app-web-sdk";
import { Gallery } from "./pages/Gallery.js";
import { CasesPage } from "./pages/CasesPage.js";
import { ChatReplica } from "./pages/ChatReplica.js";
import { SessionReplica, SharedReplica } from "./pages/SessionReplica.js";

// Lightweight hash router (no router dependency). Routes:
//   #/                  → Showcase gallery (server-driven category cards)
//   #/cases             → Shared cases (browse cloud cases; publish gated)
//   #/shared/:presetId  → Replay a shared case streamed from Rome Cloud (no local copy)
//   #/trace/:id         → Chat replica for one trace
//   #/session/:id       → Multi-turn chat replica for one imported (local) session
function useHashRoute(): [string, (hash: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = (next: string) => {
    if (window.location.hash === next) setHash(next);
    else window.location.hash = next;
  };
  return [hash, navigate];
}

export default function App({ bootstrap: _bootstrap }: { bootstrap: RomeAppBootstrap }) {
  const [hash, navigate] = useHashRoute();
  const traceMatch = /^#\/trace\/(.+)$/.exec(hash);
  const sessionMatch = /^#\/session\/(.+)$/.exec(hash);
  const sharedMatch = /^#\/shared\/(.+)$/.exec(hash);
  const casesRoute = hash === "#/cases";
  const replicaRoute = !!sessionMatch || !!traceMatch || !!sharedMatch;

  return (
    <div
      className={
        replicaRoute
          ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
          : "flex min-h-dvh flex-col bg-background text-foreground"
      }
    >
      {sessionMatch ? (
        <SessionReplica collectionId={decodeURIComponent(sessionMatch[1])} navigate={navigate} />
      ) : sharedMatch ? (
        <SharedReplica presetId={decodeURIComponent(sharedMatch[1])} navigate={navigate} />
      ) : traceMatch ? (
        <ChatReplica traceId={decodeURIComponent(traceMatch[1])} navigate={navigate} />
      ) : casesRoute ? (
        <CasesPage navigate={navigate} />
      ) : (
        <Gallery />
      )}
    </div>
  );
}
