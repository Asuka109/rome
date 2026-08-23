import { cn } from "@/lib/utils";

export interface MobileBackdropProps {
  /** Called when the user taps the backdrop. */
  onDismiss: () => void;
  /**
   * Accessible label for the backdrop button. Should describe what the dismiss
   * does (e.g. "Close sidebar", "Close trace panel").
   */
  label: string;
  /** Tailwind z-index class; defaults to z-30. */
  className?: string;
}

/**
 * Translucent full-viewport overlay shown only on mobile (`md:hidden`). Used
 * behind slide-out panels (sidebar, drawer) so tapping outside dismisses.
 * Renders as a `<button>` so it's keyboard-focusable and gets the accessible
 * label.
 */
export function MobileBackdrop({ onDismiss, label, className }: MobileBackdropProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onDismiss}
      className={cn("fixed inset-0 z-30 bg-overlay md:hidden", className)}
    />
  );
}
