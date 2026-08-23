import type { ArtifactRef } from "./state.js";
import type { ArtifactMetadata } from "./types.js";

/**
 * Translate the new triad's `ArtifactRef` (catalog-side) into the existing
 * `ArtifactMetadata` shape the legacy loaders expect. The only structural
 * difference is `absolutePath` (new) vs `sourcePath` (legacy). Once the
 * loaders are rewritten to operate directly on `ArtifactRef` this adapter
 * can be deleted.
 */
export function toArtifactMetadata(ref: ArtifactRef): ArtifactMetadata {
  return {
    formatVersion: ref.formatVersion,
    kind: ref.kind,
    ownerType: ref.ownerType,
    ownerId: ref.ownerId,
    publicName: ref.publicName,
    aliases: [...ref.aliases],
    sourcePath: ref.absolutePath,
  };
}
