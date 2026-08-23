import {
  resolveRomeNewsDefinition,
  RomeNewsFeedSchema,
  type ResolvedRomeNewsItem,
  type RomeNewsDefinition,
} from "@rome-os/rome-web-components/news-item/schema";
import { getActiveLocale } from "@/i18n";

export type QuickEntry = ResolvedRomeNewsItem;
export type QuickEntryDefinition = RomeNewsDefinition;

export function getQuickEntries(
  definitions: RomeNewsDefinition[],
  locale: string = getActiveLocale(),
): QuickEntry[] {
  return definitions.map((definition) => resolveRomeNewsDefinition(definition, locale));
}

export async function fetchRomeNewsDefinitions(
  signal?: AbortSignal,
): Promise<RomeNewsDefinition[]> {
  const response = await fetch(`${import.meta.env.ROME_CLOUD_ORIGIN}/api/rome-news`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Rome News request failed with status ${response.status}`);
  }
  const parsed = RomeNewsFeedSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Rome News returned an invalid feed");
  }
  return parsed.data.items;
}
