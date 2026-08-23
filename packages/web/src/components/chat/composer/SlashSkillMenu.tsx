import { forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listSkills } from "@/lib/chat-api";
import type { SkillSummary } from "@/lib/chat-types";
import {
  AppGroupedPickerMenu,
  type AppGroupedPickerMenuHandle,
  type PickerGroup,
} from "./AppGroupedPickerMenu";

export type SlashSkillMenuHandle = AppGroupedPickerMenuHandle;

export interface SlashSkillMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Filter string (the text the user typed after the leading `/`).
  query: string;
  onSelect: (skill: SkillSummary) => void;
  // Rendered as the popover anchor — typically a wrapper around the textarea.
  anchor: React.ReactNode;
}

function tokensMatch(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

// Mirror of AgentMentionMenu's grouping + cross-level filter, over the flat
// /api/skills list: skills group under their owning app; an app row matches by
// id/label (keeping all of its skills), otherwise only the skills whose
// name/description match survive. Apps first, core last — same ordering as the
// agents catalog.
function groupAndFilter(
  skills: SkillSummary[],
  query: string,
  fallbackDescription: (count: number) => string,
): Array<PickerGroup<SkillSummary>> {
  const groups = new Map<string, PickerGroup<SkillSummary> & { ownerType: "core" | "app" }>();
  for (const skill of skills) {
    let group = groups.get(skill.ownerId);
    if (!group) {
      group = {
        ownerId: skill.ownerId,
        ownerType: skill.ownerType,
        label: skill.ownerLabel,
        description: skill.ownerDescription,
        iconUrl: skill.iconUrl,
        items: [],
      };
      groups.set(skill.ownerId, group);
    }
    group.items.push(skill);
  }

  const out: Array<PickerGroup<SkillSummary> & { ownerType: "core" | "app" }> = [];
  for (const group of groups.values()) {
    const appMatches =
      !query || tokensMatch(group.ownerId, query) || tokensMatch(group.label, query);
    const skillMatches = appMatches
      ? group.items
      : group.items.filter(
          (skill) =>
            tokensMatch(skill.localName, query) ||
            tokensMatch(skill.name, query) ||
            tokensMatch(skill.description, query),
        );
    if (skillMatches.length === 0) continue;
    out.push({
      ...group,
      description: group.description || fallbackDescription(skillMatches.length),
      items: skillMatches,
    });
  }
  return out.sort((a, b) => {
    if (a.ownerType !== b.ownerType) {
      return a.ownerType === "app" ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}

/**
 * Autocomplete for `/<skill-name>` slash commands: an
 * AppGroupedPickerMenu adapter over `GET /api/skills`, grouped by owning app
 * like the `@` mention menu. Selecting pins the skill as a structured chip on
 * the composer, so any catalog name is invocable — the server receives it as
 * a field, not as parsed slash text.
 */
export const SlashSkillMenu = forwardRef<SlashSkillMenuHandle, SlashSkillMenuProps>(
  function SlashSkillMenu({ open, onOpenChange, query, onSelect, anchor }, ref) {
    const { t } = useTranslation("chat");
    const [skills, setSkills] = useState<SkillSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch on open, but only cache success: a failed load leaves `skills`
    // null so the next open retries instead of pinning a false-empty catalog
    // (listSkills throws on HTTP errors rather than degrading to []).
    useEffect(() => {
      if (!open || skills !== null) return;
      let cancelled = false;
      setError(null);
      listSkills()
        .then((data) => {
          if (cancelled) return;
          setSkills(data);
        })
        .catch(() => {
          if (cancelled) return;
          setError(t("slashSkill.loadFailed"));
        });
      return () => {
        cancelled = true;
      };
    }, [open, skills, t]);

    const filtered = useMemo(
      () => groupAndFilter(skills ?? [], query, (count) => t("slashSkill.skillCount", { count })),
      [skills, query, t],
    );

    return (
      <AppGroupedPickerMenu<SkillSummary>
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        query={query}
        anchor={anchor}
        title={t("slashSkill.menuTitle")}
        loading={skills === null}
        loadingText={t("slashSkill.loading")}
        error={error}
        emptyText={(skills ?? []).length === 0 ? t("slashSkill.empty") : t("slashSkill.noMatch")}
        pickGroupText={t("slashSkill.pickApp")}
        groups={filtered}
        getItemKey={(skill) => skill.name}
        renderItemLabel={(skill) => <span className="font-mono">/{skill.localName}</span>}
        getItemDescription={(skill) => skill.description}
        onSelect={(_group, skill) => onSelect(skill)}
      />
    );
  },
);
