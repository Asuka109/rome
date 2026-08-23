import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, isAbsolute, join } from "node:path";
import { createAppLogger, defineAction, getCurrentActionContext, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  ActionResult,
  GeneratedImage,
  ImageGenerationInterface,
  ImageGenerationProviderInfo,
} from "@rome-os/app-runtime";
import type { GenerateImageOutput } from "./types.js";
export type { GenerateImageOutput } from "./types.js";

const log = createAppLogger("generate-image");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const MAX_INPUT_IMAGES = 6;

export const generateImageInputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe(
      "The image prompt — describe the desired image (subject, style, composition, colors). " +
        "It is forwarded verbatim to the image model.",
    ),
  input_image_paths: z
    .array(z.string().min(1))
    .max(MAX_INPUT_IMAGES)
    .optional()
    .describe(
      `Optional: absolute local paths of up to ${MAX_INPUT_IMAGES} input images for the model to ` +
        "edit or combine (e.g. a previously generated imagePath, or a saved attachment path). " +
        "The prompt should say what to do with them.",
    ),
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export interface GenerateImageDeps {
  imageGeneration: ImageGenerationInterface;
}

function readEnvPath(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return undefined;
  return trimmed;
}

function getProfileDir(): string {
  return join(homedir(), ".rome", process.env.ROME_PROFILE || "default");
}

// Must stay in lockstep with send_message's attachment-root resolution so a
// generated image is always a valid attachment source.
function getProjectsRoot(): string {
  return (
    readEnvPath("ROME_PROJECTS_ROOT") ??
    readEnvPath("ROME_WEBCHAT_PROJECTS_ROOT") ??
    join(getProfileDir(), "projects")
  );
}

function describeUnavailable(
  providers: Array<ImageGenerationProviderInfo & { reason: string; remedy: string }>,
): string {
  if (providers.length === 0) {
    return "Image generation is not available: no image generation provider is configured.";
  }
  const detail = providers.map((p) => `${p.displayName}: ${p.reason}. ${p.remedy}`).join(" ");
  return `Image generation requires a connected image provider, but none is available right now. ${detail}`;
}

async function persistImage(
  image: GeneratedImage,
): Promise<{ imagePath: string; fileName: string; mimeType: string; bytes: number }> {
  const directory = join(getProjectsRoot(), ".rome", "generated-images");
  await mkdir(directory, { recursive: true });

  if (image.data) {
    const mimeType = image.mimeType ?? "image/png";
    const extension = EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? ".png";
    const fileName = `image-${randomUUID()}${extension}`;
    const imagePath = join(directory, fileName);
    const bytes = Buffer.from(image.data, "base64");
    if (bytes.byteLength === 0) {
      throw new Error("image generation returned empty image data");
    }
    await writeFile(imagePath, bytes);
    return { imagePath, fileName, mimeType, bytes: bytes.byteLength };
  }

  if (!image.sourcePath) {
    throw new Error("image generation result carried neither image data nor a source path");
  }
  const extension = extname(image.sourcePath).toLowerCase() || ".png";
  const fileName = `image-${randomUUID()}${extension}`;
  const imagePath = join(directory, fileName);
  await copyFile(image.sourcePath, imagePath);
  const file = await stat(imagePath);
  return {
    imagePath,
    fileName,
    mimeType: image.mimeType ?? MIME_BY_EXTENSION[extension] ?? "image/png",
    bytes: file.size,
  };
}

function assetUrl(fileName: string, bytes: number): string {
  const logicalPath = ["projects", ".rome", "generated-images", fileName].join("/");
  return (
    `/api/projects/asset/${encodeURIComponent(fileName)}` +
    `?path=${encodeURIComponent(logicalPath)}&v=${Date.now()}-${bytes}`
  );
}

/**
 * Creates the generate_image action: hands the prompt to the image generation
 * capability (which picks a connected provider — Codex today), then saves the
 * returned image under the projects root so both channels (send_message
 * attachments) and the dashboard (asset URL) can serve it.
 */
export function createGenerateImageAction(config: ActionConfig, deps: GenerateImageDeps): Action {
  return defineAction({
    config,
    schema: generateImageInputSchema,
    execute: async ({ prompt, input_image_paths }): Promise<ActionResult<GenerateImageOutput>> => {
      // Fail fast with a per-path message; the provider re-validates content
      // (byte sniffing, size caps) and also fails rather than dropping inputs.
      for (const path of input_image_paths ?? []) {
        if (!isAbsolute(path)) {
          return { status: "error", error: `input image path must be absolute: ${path}` };
        }
        try {
          const file = await stat(path);
          if (!file.isFile()) {
            return { status: "error", error: `input image is not a file: ${path}` };
          }
        } catch {
          return { status: "error", error: `input image not found: ${path}` };
        }
      }

      const outcome = await deps.imageGeneration.generate(
        {
          prompt,
          ...(input_image_paths?.length ? { inputImagePaths: input_image_paths } : {}),
        },
        { sharedContext: getCurrentActionContext()?.sharedContext },
      );

      if (outcome.status === "unavailable") {
        return { status: "error", error: describeUnavailable(outcome.providers) };
      }
      if (outcome.status === "failed") {
        return { status: "error", error: outcome.message };
      }

      try {
        const saved = await persistImage(outcome.image);
        log.info("generated image saved", {
          provider: outcome.providerId,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          bytes: saved.bytes,
        });
        return {
          status: "ok",
          data: {
            imagePath: saved.imagePath,
            imageUrl: assetUrl(saved.fileName, saved.bytes),
            mimeType: saved.mimeType,
            provider: outcome.providerId,
            ...(outcome.image.revisedPrompt ? { revisedPrompt: outcome.image.revisedPrompt } : {}),
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn("failed to persist generated image", { error: message });
        return { status: "error", error: `Failed to save the generated image: ${message}` };
      }
    },
    preview: ({ prompt }) => ({
      kind: "generic",
      title: "Generate an image",
      summary: prompt,
    }),
  });
}

export function createAction(config: ActionConfig, deps: GenerateImageDeps): Action {
  return createGenerateImageAction(config, deps);
}
