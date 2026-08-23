// Standalone shim for `@radix-ui/react-icons`, used only by the vendored
// rome-core trace components under ../rome-core. Those components import a small
// set of named icons from "@radix-ui/react-icons"; we re-map them onto
// lucide-react (already an app dependency) so we don't add another package.
// See ../VENDOR.md for the import-line seams.

import { ChevronDown, ChevronRight, X, Download, type LucideProps } from "lucide-react";

type IconProps = LucideProps;

// Radix icons render at 15px with currentColor by default; match that footprint
// so the vendored layouts line up with the original chat UI.
export function ChevronDownIcon(props: IconProps) {
  return <ChevronDown size={15} {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <ChevronRight size={15} {...props} />;
}

export function Cross2Icon(props: IconProps) {
  return <X size={15} {...props} />;
}

export function DownloadIcon(props: IconProps) {
  return <Download size={15} {...props} />;
}
