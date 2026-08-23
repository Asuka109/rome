import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="success">completed</Badge>;
  if (status === "skipped") return <Badge variant="muted">skipped · no findings</Badge>;
  if (status === "failed") return <Badge variant="destructive">failed</Badge>;
  if (status === "pending") return <Badge variant="warning">running</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}
