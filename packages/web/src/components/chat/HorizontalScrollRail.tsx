import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface HorizontalScrollRailProps {
  children: ReactNode;
  id: string;
}

export function HorizontalScrollRail({ children, id }: HorizontalScrollRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const maskImage =
    edges.left && edges.right
      ? "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)"
      : edges.left
        ? "linear-gradient(to right, transparent 0, black 24px, black 100%)"
        : edges.right
          ? "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)"
          : undefined;

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const next = {
      left: rail.scrollLeft > 1,
      right: rail.scrollLeft < maxScrollLeft - 1,
    };
    setEdges((current) =>
      current.left === next.left && current.right === next.right ? current : next,
    );
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const frame = window.requestAnimationFrame(updateEdges);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    resizeObserver?.observe(rail);
    window.addEventListener("resize", updateEdges);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [children, updateEdges]);

  return (
    <div className="relative overflow-visible">
      <div
        ref={railRef}
        onScroll={updateEdges}
        className="-mx-2 flex gap-3 overflow-x-auto overscroll-x-contain px-2 py-1 pb-3 [mask-image:var(--scroll-fade-mask)] [-webkit-mask-image:var(--scroll-fade-mask)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-horizontal-scroll={id}
        data-scroll-left={edges.left}
        data-scroll-right={edges.right}
        role="list"
        style={{ "--scroll-fade-mask": maskImage } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
