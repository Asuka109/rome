import { defineAction, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  AppActionRuntimeDeps,
  ApprovalsRepository,
  PersonMappingRepository,
} from "@rome-os/app-runtime";
export type { AddPersonMappingOutput } from "./types.js";

export const addPersonMappingInputSchema = z.object({
  displayName: z.string().describe("The person's display name"),
  channel: z.string().describe("Channel identifier (e.g. telegram, whatsapp, wechat)"),
  channelUserId: z.string().describe("The user's ID on the channel platform"),
  bondLevel: z
    .enum(["inner-circle", "acquaintance", "other"])
    .describe("Relationship tier for this person"),
});

export type AddPersonMappingInput = z.infer<typeof addPersonMappingInputSchema>;

export interface AddPersonMappingDeps {
  personMappingRepo: PersonMappingRepository;
  approvalsRepo: ApprovalsRepository;
}

export async function addPersonMapping(
  input: AddPersonMappingInput,
  deps: AddPersonMappingDeps,
): Promise<{ personId: string; approvalId: string }> {
  // Check for existing person with the same display name
  const existing = await deps.personMappingRepo.findByName(input.displayName);
  if (existing.length > 0) {
    throw new Error(
      `Person with display name "${input.displayName}" already exists (id: ${existing[0].id}). ` +
        `Use a disambiguator (e.g. "${input.displayName} (work)") or add a channel mapping to the existing person.`,
    );
  }

  // Create person record (unapproved)
  const personId = await deps.personMappingRepo.create({
    displayName: input.displayName,
    bondLevel: input.bondLevel,
    approved: false,
    channelMappings: [
      {
        channel: input.channel,
        channelUserId: input.channelUserId,
      },
    ],
  });

  // Create approval request
  const approvalId = await deps.approvalsRepo.create({
    type: "person_mapping",
    requestedBy: "agent",
    description: `Add person mapping: ${input.displayName} (${input.channel}:${input.channelUserId}) as ${input.bondLevel}`,
    payload: {
      personId,
      displayName: input.displayName,
      channel: input.channel,
      channelUserId: input.channelUserId,
      bondLevel: input.bondLevel,
    },
  });

  return { personId, approvalId };
}

// --- Action factory ---

export function createAddPersonMappingAction(
  config: ActionConfig,
  deps: AddPersonMappingDeps,
): Action {
  return defineAction({
    config,
    schema: addPersonMappingInputSchema,
    execute: async (input) => {
      const result = await addPersonMapping(input, deps);
      return { status: "ok", data: result };
    },
  });
}

export function createAction(
  config: ActionConfig,
  deps: AppActionRuntimeDeps<AddPersonMappingDeps>,
): Action {
  return createAddPersonMappingAction(config, deps);
}
