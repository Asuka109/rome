import { z } from "zod";

export const ROME_NEWS_FEED_VERSION = 1 as const;
export const ROME_NEWS_MAX_ITEMS = 10;

export const LocalizedTextSchema = z
  .object({
    en: z.string().trim().min(1).max(4_000),
    "zh-CN": z.string().trim().min(1).max(4_000),
  })
  .strict();

const promptTextSchema = z
  .string()
  .max(4_000)
  .refine((value) => value.trim().length > 0, "Prompt must not be empty");

const localizedPromptSchema = z
  .object({
    en: promptTextSchema,
    "zh-CN": promptTextSchema,
  })
  .strict();

export const RomeNewsItemIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

const imageUrlSchema = z
  .url()
  .max(2_000)
  .refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS");

const commonPayloadShape = {
  title: LocalizedTextSchema,
  subtitle: LocalizedTextSchema.optional(),
  image: imageUrlSchema,
};

const chatPayloadSchema = z
  .object({
    ...commonPayloadShape,
    type: z.literal("chat"),
    prompt: localizedPromptSchema,
    mode: z.enum(["draft", "start"]).optional(),
    skillName: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const appStorePayloadSchema = z
  .object({
    ...commonPayloadShape,
    type: z.literal("app-store"),
    url: z
      .url()
      .max(2_000)
      .refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === "https:" || protocol === "http:";
      }, "App Store URL must use HTTP or HTTPS"),
  })
  .strict();

const linkPayloadSchema = z
  .object({
    ...commonPayloadShape,
    type: z.literal("link"),
    href: z.string().trim().min(1).max(2_000),
    target: z.enum(["internal", "external"]).optional(),
  })
  .strict();

function validateLink(
  value: { type: string; href?: string; target?: "internal" | "external" },
  ctx: z.RefinementCtx,
) {
  if (value.type !== "link" || !value.href) return;
  if ((value.target ?? "internal") === "internal" && !value.href.startsWith("/")) {
    ctx.addIssue({
      code: "custom",
      path: ["href"],
      message: "Internal links must start with /",
    });
    return;
  }
  if (value.target === "external") {
    try {
      if (new URL(value.href).protocol !== "https:") throw new Error("not https");
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["href"],
        message: "External links must be valid HTTPS URLs",
      });
    }
  }
}

export const RomeNewsDefinitionSchema = z
  .discriminatedUnion("type", [
    chatPayloadSchema.extend({ id: RomeNewsItemIdSchema }),
    appStorePayloadSchema.extend({ id: RomeNewsItemIdSchema }),
    linkPayloadSchema.extend({ id: RomeNewsItemIdSchema }),
  ])
  .superRefine(validateLink);

export const RomeNewsFeedSchema = z
  .object({
    version: z.literal(ROME_NEWS_FEED_VERSION),
    items: z.array(RomeNewsDefinitionSchema).max(ROME_NEWS_MAX_ITEMS),
  })
  .strict()
  .superRefine((feed, ctx) => {
    const seen = new Set<string>();
    feed.items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "id"],
          message: `Duplicate Rome News id "${item.id}"`,
        });
      }
      seen.add(item.id);
    });
  });

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type RomeNewsDefinition = z.infer<typeof RomeNewsDefinitionSchema>;
export type RomeNewsFeed = z.infer<typeof RomeNewsFeedSchema>;

export type ResolvedRomeNewsItem =
  | {
      id: string;
      type: "chat";
      title: string;
      subtitle?: string;
      image: string;
      prompt: string;
      mode?: "draft" | "start";
      skillName?: string;
    }
  | {
      id: string;
      type: "app-store";
      title: string;
      subtitle?: string;
      image: string;
      url: string;
    }
  | {
      id: string;
      type: "link";
      title: string;
      subtitle?: string;
      image: string;
      href: string;
      target?: "internal" | "external";
    };

export function resolveRomeNewsDefinition(
  definition: RomeNewsDefinition,
  locale: string,
): ResolvedRomeNewsItem {
  const language = locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  const base = {
    id: definition.id,
    title: definition.title[language],
    image: definition.image,
    ...(definition.subtitle ? { subtitle: definition.subtitle[language] } : {}),
  };

  switch (definition.type) {
    case "chat":
      return {
        ...base,
        type: "chat",
        prompt: definition.prompt[language],
        mode: definition.mode,
        skillName: definition.skillName,
      };
    case "app-store":
      return { ...base, type: "app-store", url: definition.url };
    case "link":
      return {
        ...base,
        type: "link",
        href: definition.href,
        target: definition.target,
      };
  }
}
