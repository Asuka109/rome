import type { SVGProps } from "react";

/** Two connected conversation bubbles, based on the branching-chat artwork. */
export function BranchingChatBubbleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2.75 6.25A3.75 3.75 0 0 1 6.5 2.5h5A3.75 3.75 0 0 1 15.25 6.25v2.5a3.75 3.75 0 0 1-3.75 3.75H7.25L4 14.75l.45-3.1a3.75 3.75 0 0 1-1.7-3.15Z" />
      <path d="M11.5 12.5v.25A4.25 4.25 0 0 0 15.75 17" />
      <path d="M15 16.25A2.75 2.75 0 0 1 17.75 13.5h1.5A2.75 2.75 0 0 1 22 16.25v.5a2.75 2.75 0 0 1-1.45 2.42l.28 1.83-2.08-1.5h-1A2.75 2.75 0 0 1 15 16.75Z" />
    </svg>
  );
}
