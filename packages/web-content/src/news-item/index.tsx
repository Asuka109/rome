"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ResolvedRomeNewsItem } from "./schema.js";

export interface NewsItemCardProps {
  item: ResolvedRomeNewsItem;
  onActivate?: (item: ResolvedRomeNewsItem) => void;
  placeholder?: ReactNode;
  className?: string;
}

export function NewsItemCard({ item, onActivate, placeholder, className }: NewsItemCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !loaded || failed;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [item.image]);

  return (
    <button
      type="button"
      onClick={() => onActivate?.(item)}
      aria-label={item.title}
      aria-disabled={onActivate ? undefined : true}
      className={["rome-news-item-card", className].filter(Boolean).join(" ")}
    >
      <span className="rome-news-item-media">
        {!failed ? (
          <img
            src={item.image}
            alt=""
            className="rome-news-item-image"
            data-loaded={loaded ? "true" : "false"}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : null}
        {showPlaceholder ? (
          <span className="rome-news-item-placeholder" data-loading={!failed ? "true" : "false"}>
            {placeholder}
          </span>
        ) : null}
      </span>
      <span className="rome-news-item-copy">
        <span className="rome-news-item-title">{item.title}</span>
        {item.subtitle ? <span className="rome-news-item-subtitle">{item.subtitle}</span> : null}
      </span>
    </button>
  );
}

export type { ResolvedRomeNewsItem } from "./schema.js";
