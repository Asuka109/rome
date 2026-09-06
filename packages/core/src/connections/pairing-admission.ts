import type { InboundMessage } from "@rome-os/app-runtime";
import type { PersonMappingRepository } from "../db/repositories/person-mapping.js";
import type { ChannelPairingRepository } from "../db/repositories/channel-pairing.js";
import type { InboundAdmission } from "./talk-router.js";

const PAIRING_CHANNELS = new Set(["telegram", "discord", "feishu"]);

export function createPairingAdmission(deps: {
  pairings: ChannelPairingRepository;
  people: PersonMappingRepository;
  instanceOrigin: string | null;
}): InboundAdmission {
  return async (service: string, message: InboundMessage) => {
    if (!PAIRING_CHANNELS.has(service)) return null;
    if (await deps.people.findByChannelUser(service, message.senderId)) return null;

    const request = deps.pairings.findOrCreate(
      service,
      message.senderId,
      message.senderDisplayName ?? null,
    );
    if (request.status === "rejected") {
      return "The guardian rejected this pairing request. You can ask them to try again after it expires.";
    }

    const link = deps.instanceOrigin
      ? ` Send this pairing link to the guardian: ${deps.instanceOrigin}/pairing/${request.id}#token=${request.token}`
      : "";
    return `This account is waiting for guardian approval.${link} The guardian can also review it in Rome Settings → Connections.`;
  };
}
