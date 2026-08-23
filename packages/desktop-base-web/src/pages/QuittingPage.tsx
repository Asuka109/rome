import { Spinner } from "@/components/ui/spinner";

export function QuittingPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="app-drag fixed inset-0" aria-hidden="true" />
      <div className="app-no-drag flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        <span>Rome exiting...</span>
      </div>
    </div>
  );
}
