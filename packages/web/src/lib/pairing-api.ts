import { fetchJson } from "@/lib/fetch-json";

export interface PairingRequest {
  id: string;
  channel: string;
  channelUserId: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  pairingUrl: string | null;
  cli: { approve: string; reject: string } | null;
}

export async function fetchPairings(): Promise<PairingRequest[]> {
  const value = await fetchJson<unknown>("/api/pairings", {
    fallback: "Could not load pairing requests.",
  });
  return Array.isArray(value) ? (value as PairingRequest[]) : [];
}

export async function resolvePairing(
  id: string,
  decision: "approve" | "reject",
  token?: string,
): Promise<void> {
  await fetchJson(`/api/pairings/${encodeURIComponent(id)}/${decision}`, {
    method: "POST",
    json: token ? { token } : {},
    fallback: "Could not update the pairing request.",
  });
}
