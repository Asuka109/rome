import type { AgentPlan } from "@rome/api-types/trace-segments";
import { TurnSummaryGroup } from "@/components/chat/TurnSummaryGroup";

export function PlanPanel({ plan, live }: { plan?: AgentPlan | null; live: boolean }) {
  return <TurnSummaryGroup plan={plan} live={live} />;
}
