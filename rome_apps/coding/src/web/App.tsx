import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  buildAppUrl,
  fetchAppApi,
  getCurrentAppPath,
  navigateToApp,
  subscribeToAppPath,
  type RomeAppBootstrap,
} from "@rome-os/app-web-sdk";
import "./styles.css";

interface MockMeta {
  id: string;
  name: string;
  style: string;
  type: string;
  layout: "mobile" | "desktop";
  keywords: string;
  description: string;
  hasPrompt: boolean;
}

interface MockIndex {
  count: number;
  mocks: MockMeta[];
}

type Route = { view: "gallery" } | { view: "mock"; id: string };

// Virtual viewports the standalone mocks were authored against. Previews render
// the document at this size and scale it down to the card width, so the gallery
// gets a true waterfall (tall phones, wide dashboards) without screenshots.
const VIRTUAL: Record<MockMeta["layout"], { w: number; h: number }> = {
  desktop: { w: 1440, h: 900 },
  mobile: { w: 414, h: 896 },
};

const MOCK_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock allow-same-origin";

function parseRoute(path: string): Route {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "mock" && segments[1]) {
    return { view: "mock", id: segments[1] };
  }
  return { view: "gallery" };
}

export default function CodingApp({ bootstrap }: { bootstrap: RomeAppBootstrap }) {
  const [route, setRoute] = useState<Route>(() => parseRoute(getCurrentAppPath()));
  const [index, setIndex] = useState<MockIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeToAppPath((next) => setRoute(parseRoute(next))), []);

  useEffect(() => {
    let cancelled = false;
    fetchAppApi("mocks", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Gallery API returned ${response.status}`);
        return response.json() as Promise<MockIndex>;
      })
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (route.view === "mock") {
    return (
      <MockFullView
        id={route.id}
        meta={index?.mocks.find((mock) => mock.id === route.id)}
        bootstrap={bootstrap}
      />
    );
  }

  return <Gallery bootstrap={bootstrap} index={index} error={error} />;
}

function Gallery({
  bootstrap,
  index,
  error,
}: {
  bootstrap: RomeAppBootstrap;
  index: MockIndex | null;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  const types = useMemo(() => {
    if (!index) return [] as string[];
    return Array.from(new Set(index.mocks.map((mock) => mock.type))).sort();
  }, [index]);

  const filtered = useMemo(() => {
    if (!index) return [] as MockMeta[];
    const needle = query.trim().toLowerCase();
    return index.mocks.filter((mock) => {
      if (activeType && mock.type !== activeType) return false;
      if (!needle) return true;
      return `${mock.name} ${mock.style} ${mock.keywords} ${mock.id}`
        .toLowerCase()
        .includes(needle);
    });
  }, [index, query, activeType]);

  return (
    <div className="coding-app">
      <header className="gallery-head">
        <div className="gallery-head-row">
          <div>
            <p className="eyebrow">Coding · Frontend</p>
            <h1>Frontend Gallery</h1>
            <p className="lede">
              Browse {index?.count ?? "…"} interface styles as live previews. Tap any tile to open
              the full, interactive design.
            </p>
          </div>
          <input
            className="gallery-search"
            type="search"
            placeholder="Search styles, keywords…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search mocks"
          />
        </div>
        {types.length > 0 && (
          <div className="filter-row" role="tablist" aria-label="Filter by type">
            <FilterChip active={activeType === null} onClick={() => setActiveType(null)}>
              All
            </FilterChip>
            {types.map((type) => (
              <FilterChip
                key={type}
                active={activeType === type}
                onClick={() => setActiveType((current) => (current === type ? null : type))}
              >
                {type}
              </FilterChip>
            ))}
          </div>
        )}
      </header>

      {error ? (
        <p className="gallery-error">Couldn’t load the gallery: {error}</p>
      ) : !index ? (
        <div className="gallery-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div className="mock-card skeleton" key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="gallery-empty">No styles match “{query}”.</p>
      ) : (
        <div className="gallery-grid">
          {filtered.map((mock) => (
            <MockCard key={mock.id} meta={mock} bootstrap={bootstrap} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? "chip active" : "chip"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MockCard({ meta, bootstrap }: { meta: MockMeta; bootstrap: RomeAppBootstrap }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [seen, setSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const virtual = VIRTUAL[meta.layout];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const resize = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(width / virtual.w);
    });
    resize.observe(el);

    const intersect = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          intersect.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    intersect.observe(el);

    return () => {
      resize.disconnect();
      intersect.disconnect();
    };
  }, [virtual.w]);

  const frameStyle: CSSProperties = {
    width: virtual.w,
    height: virtual.h,
    transform: `scale(${scale})`,
  };

  return (
    <button
      type="button"
      className="mock-card"
      onClick={() => navigateToApp(`mock/${meta.id}`)}
      aria-label={`Open ${meta.style} — ${meta.name}`}
    >
      <div
        className={`mock-preview ${meta.layout}`}
        ref={wrapRef}
        style={{ aspectRatio: `${virtual.w} / ${virtual.h}` }}
      >
        {seen && scale > 0 && (
          <iframe
            className="mock-frame"
            src={`${bootstrap.apiBase}/mocks/${meta.id}`}
            title={meta.name}
            style={frameStyle}
            sandbox={MOCK_SANDBOX}
            tabIndex={-1}
            scrolling="no"
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        )}
        {!loaded && <span className="mock-shimmer" aria-hidden="true" />}
        <span className="mock-hover">
          <span className="mock-open">Open design →</span>
        </span>
      </div>
      <div className="mock-meta">
        <span className="mock-style">{meta.style}</span>
        <span className="mock-name">{meta.name}</span>
      </div>
      <span className="mock-badge">{meta.type}</span>
    </button>
  );
}

function MockFullView({
  id,
  meta,
  bootstrap,
}: {
  id: string;
  meta: MockMeta | undefined;
  bootstrap: RomeAppBootstrap;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const src = `${bootstrap.apiBase}/mocks/${id}`;

  // The app mounts inside a shadow-DOM host that only carries a min-height and
  // lives in a scrolling page, so percentage/vh heights collapse the iframe.
  // Measure the distance from the view's top to the viewport bottom and pin the
  // stage to it, so the mock always fills the screen and stays scrollable.
  useEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(520, Math.round(window.innerHeight - top - 12)));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Track the area available to the iframe so we can render the mock at its
  // authored width and scale it to fit — fixed-width desktop designs look
  // broken when squeezed below their target width, so we never do that.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!showPrompt || prompt !== null) return;
    let cancelled = false;
    fetchAppApi(`prompts/${id}`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error("no prompt"))))
      .then((text) => {
        if (!cancelled) setPrompt(text);
      })
      .catch(() => {
        if (!cancelled) setPrompt("Prompt unavailable for this style.");
      });
    return () => {
      cancelled = true;
    };
  }, [showPrompt, prompt, id]);

  const goBack = () => navigateToApp("");

  const virtual = VIRTUAL[meta?.layout ?? "desktop"];
  // Scale down to fit the panel, but never magnify past the authored size.
  const scale = size.w > 0 ? Math.min(1, size.w / virtual.w) : 0;
  const frameStyle: CSSProperties =
    scale > 0
      ? {
          width: virtual.w,
          height: Math.round(size.h / scale),
          transform: `translateX(${Math.max(
            0,
            Math.round((size.w - virtual.w * scale) / 2),
          )}px) scale(${scale})`,
        }
      : { width: "100%", height: "100%" };

  return (
    <div
      className="coding-app full-view"
      ref={rootRef}
      style={height ? { height: `${height}px` } : undefined}
    >
      <header className="full-bar">
        <a
          className="back"
          href={buildAppUrl("")}
          onClick={(event) => {
            event.preventDefault();
            goBack();
          }}
        >
          ← Frontend
        </a>
        <div className="full-title">
          <strong>{meta?.name ?? id}</strong>
          <span>{meta ? `${meta.style} · ${meta.type}` : id}</span>
        </div>
        <div className="full-actions">
          {(meta?.hasPrompt ?? true) && (
            <button
              type="button"
              className={showPrompt ? "chip active" : "chip"}
              onClick={() => setShowPrompt((value) => !value)}
            >
              Prompt
            </button>
          )}
          <a className="chip" href={src} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        </div>
      </header>
      <div className="full-stage">
        <div className="frame-wrap" ref={wrapRef}>
          <iframe
            className="full-frame"
            src={src}
            title={meta?.name ?? id}
            sandbox={MOCK_SANDBOX}
            style={frameStyle}
          />
        </div>
        {showPrompt && (
          <aside className="prompt-panel">
            <div className="prompt-head">
              <strong>Styling prompt</strong>
              <button type="button" className="chip" onClick={() => setShowPrompt(false)}>
                Close
              </button>
            </div>
            <pre>{prompt ?? "Loading…"}</pre>
          </aside>
        )}
      </div>
    </div>
  );
}
