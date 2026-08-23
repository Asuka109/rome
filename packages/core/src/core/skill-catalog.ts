import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AppOwnedArtifactLoadFailure, ArtifactMetadata } from "../apps/types.js";
import type { AppCatalog } from "../apps/catalog.js";
import { listCoreArtifactsByKind } from "../apps/core-artifacts.js";
import { toArtifactMetadata } from "../apps/artifact-ref-adapter.js";
import {
  claimLegacyArtifactNames,
  formatArtifactId,
  resolveArtifactId,
  type ArtifactIdentityContext,
} from "../apps/artifact-id.js";
import { parseSkillFrontmatterResult } from "../apps/packaging/skill-frontmatter.js";
export {
  parseSkillFrontmatter,
  parseSkillFrontmatterResult,
  type SkillFrontmatter,
  type SkillFrontmatterErrorReason,
  type SkillFrontmatterResult,
} from "../apps/packaging/skill-frontmatter.js";

export interface LoadedSkill {
  metadata: ArtifactMetadata;
  name: string;
  localName: string;
  description: string;
  tools?: string[];
  content: string;
}

export interface SkillMcpDefinition {
  name: string;
  description: string;
  tools?: string[];
  content: string;
  ownerType: ArtifactMetadata["ownerType"];
  ownerId: string;
}

export function stripSkillStructuredSection(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*/, "").trim();
}

export class SkillCatalog {
  private skills: LoadedSkill[] = [];
  private registryLoadFailures: AppOwnedArtifactLoadFailure[] = [];

  constructor(private readonly identity?: ArtifactIdentityContext) {}

  async loadFromCatalog(catalog: AppCatalog): Promise<LoadedSkill[]> {
    const coreRefs = await listCoreArtifactsByKind("skill");
    const appRefs = catalog.listArtifacts("skill");
    const refs = [...coreRefs, ...appRefs];
    const registryLoadFailures: AppOwnedArtifactLoadFailure[] = [];
    const loaded = refs
      .map((ref) => toArtifactMetadata(ref))
      .flatMap((metadata) => {
        const skillFile = join(metadata.sourcePath, "SKILL.md");
        try {
          const content = readFileSync(skillFile, "utf-8").trim();
          const parsed = parseSkillFrontmatterResult(content);
          if (!parsed.ok) {
            throw new Error(`Skill ${skillFile} has invalid frontmatter: ${parsed.message}`);
          }
          const meta = parsed.value;
          const artifactId = this.identity
            ? formatArtifactId(metadata.ownerId, meta.name)
            : meta.name;
          if (this.identity && (metadata.ownerType === "core" || metadata.formatVersion !== 2)) {
            const claim = claimLegacyArtifactNames(
              this.identity.legacyBindings,
              "skill",
              [meta.name, metadata.publicName, ...metadata.aliases],
              artifactId as ReturnType<typeof formatArtifactId>,
            );
            if (claim.conflicts.length > 0) {
              throw new Error(
                `Legacy skill name conflict: ${claim.conflicts
                  .map(
                    ({ legacyName, artifactId: owner }) =>
                      `${JSON.stringify(legacyName)} is bound to ${owner}`,
                  )
                  .join(", ")}`,
              );
            }
          }
          return [
            {
              metadata,
              name: artifactId,
              localName: meta.name,
              description: meta.description,
              tools: meta.tools,
              content,
            },
          ];
        } catch (err) {
          if (metadata.ownerType !== "app") {
            throw err;
          }

          registryLoadFailures.push({
            kind: metadata.kind,
            ownerId: metadata.ownerId,
            publicName: metadata.publicName,
            sourcePath: metadata.sourcePath,
            error: err instanceof Error ? err.message : String(err),
          });
          return [];
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    this.skills = loaded;
    this.registryLoadFailures = registryLoadFailures;
    return this.getAll();
  }

  getAll(): LoadedSkill[] {
    return [...this.skills];
  }

  get(name: string): LoadedSkill | undefined {
    const resolved = this.resolveName(name);
    return this.skills.find((skill) => skill.name === resolved);
  }

  getRegistryLoadFailures(): AppOwnedArtifactLoadFailure[] {
    return [...this.registryLoadFailures];
  }

  getMcpDefinitions(): SkillMcpDefinition[] {
    return this.skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      tools: skill.tools,
      content: stripSkillStructuredSection(skill.content),
      ownerType: skill.metadata.ownerType,
      ownerId: skill.metadata.ownerId,
    }));
  }

  private resolveName(name: string): string {
    if (!this.identity) return name;
    try {
      return resolveArtifactId({
        kind: "skill",
        value: name,
        legacyBindings: this.identity.legacyBindings,
      });
    } catch {
      return name;
    }
  }
}
