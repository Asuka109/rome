import { TurnSummaryGroup, type TurnRecapSummary } from "@/components/chat/TurnSummaryGroup";

export type TurnRecapBlockProps = TurnRecapSummary;

export function TurnRecapBlock({
  content,
  audioUrl,
  audioMimeType,
  audioDurationMs,
}: TurnRecapBlockProps) {
  return (
    <TurnSummaryGroup recap={{ content, audioUrl, audioMimeType, audioDurationMs }} live={false} />
  );
}
