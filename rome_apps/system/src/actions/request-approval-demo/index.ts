import { createAppLogger } from "@rome-os/app-runtime";
import type { Action, ActionConfig, ActionResult, PreviewPayload } from "@rome-os/app-runtime";
import type {
  ApprovalDemoField,
  RequestApprovalDemoInput,
  RequestApprovalDemoOutput,
} from "./types.js";

export type {
  ApprovalDemoField,
  RequestApprovalDemoInput,
  RequestApprovalDemoOutput,
} from "./types.js";

const log = createAppLogger("request-approval-demo");

function coerceFields(raw: unknown): ApprovalDemoField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const fields = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const { label, value } = entry as Partial<ApprovalDemoField>;
      if (typeof label !== "string" || typeof value !== "string") return null;
      return { label, value };
    })
    .filter((entry): entry is ApprovalDemoField => entry !== null);
  return fields.length > 0 ? fields : undefined;
}

export function createRequestApprovalDemoAction(config: ActionConfig): Action {
  return {
    config,
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title shown at the top of the approval card.",
        },
        summary: {
          type: "string",
          description: "One-paragraph description of what would happen if approved.",
        },
        fields: {
          type: "array",
          description: "Optional key/value rows rendered under the summary.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
            required: ["label", "value"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "summary"],
      additionalProperties: false,
    },
    preview(args: Record<string, unknown>): PreviewPayload {
      const input = args as Partial<RequestApprovalDemoInput>;
      const fields = coerceFields(input.fields);
      return {
        kind: "generic",
        title: typeof input.title === "string" ? input.title : "Approval demo",
        summary:
          typeof input.summary === "string"
            ? input.summary
            : "Test fixture — no side effects will run on approval.",
        ...(fields ? { fields } : {}),
      };
    },
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const input = args as Partial<RequestApprovalDemoInput>;
      const title = typeof input.title === "string" ? input.title : "(untitled)";
      log.info("approval demo action approved", { title });
      const data: RequestApprovalDemoOutput = {
        approvedTitle: title,
        message: `Approval demo executed: "${title}". This is a no-op fixture confirming the approval flow worked end-to-end.`,
      };
      return { status: "ok", data };
    },
  };
}

export function createAction(config: ActionConfig, _deps: Record<string, unknown>): Action {
  return createRequestApprovalDemoAction(config);
}
