import { Cloud } from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { GoogleIcon } from "@/components/brand-icons/google-icon";

/** Maps a source id / icon hint to its brand logo. Source-agnostic: a new
 * source registers its glyph here and everything else stays the same. */
export function SourceIcon({ source, className }: { source?: string; className?: string }) {
  if (source === "git" || source === "github") {
    return <GithubIcon className={className} />;
  }
  if (source === "googledrive" || source === "google") {
    return <GoogleIcon className={className} />;
  }
  return <Cloud className={className} aria-hidden />;
}
