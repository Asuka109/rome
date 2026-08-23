export const PROVIDER_EVENT_PREFIX = "provider:event:";

export function buildTopic(provider: string, eventType: string): string {
  return `${PROVIDER_EVENT_PREFIX}${provider.toLowerCase()}.${eventType.toLowerCase()}`;
}
