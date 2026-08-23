import type { ComponentProps } from "react";
import Markdown from "@/components/markdown";
import { ChatLink } from "./ChatLink";

// Markdown for chat messages: identical to the generic Markdown, but routes
// links through ChatLink so /projects and /apps links open in the workspace.
// Chat blocks import this instead of `@/components/markdown`.
export default function ChatMarkdown(props: ComponentProps<typeof Markdown>) {
  return <Markdown {...props} linkComponent={ChatLink} />;
}
