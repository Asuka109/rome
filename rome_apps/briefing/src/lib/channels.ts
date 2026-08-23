/** Delivery channels the briefing app supports, with shared validation + hints. */

export const SUPPORTED_CHANNELS = ["email", "whatsapp"] as const;

export type SupportedChannel = (typeof SUPPORTED_CHANNELS)[number];

export function isSupportedChannel(value: unknown): value is SupportedChannel {
  return typeof value === "string" && (SUPPORTED_CHANNELS as readonly string[]).includes(value);
}

/** Appended to delivery errors so the guardian knows how to fix delivery. */
export function channelSetupHint(channel: string): string {
  if (channel === "whatsapp") {
    return "Make sure WhatsApp is connected in Settings → Channels and that the WhatsApp chat id is set in the briefing settings (or switch delivery to email).";
  }
  if (channel === "email") {
    return "Email delivery uses Rome's mail channel; confirm a recipient address is set in the briefing settings.";
  }
  return "Open the briefing settings and pick a supported delivery channel (email or whatsapp).";
}
