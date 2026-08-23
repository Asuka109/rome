export const KEEPALIVE_MAX_BODY_BYTES = 64 * 1024;

export function createFileSaveRequestBody({
  commit,
  content,
  path,
}: {
  commit: boolean;
  content: string;
  path: string;
}): string {
  return JSON.stringify({ commit, content, path });
}

export function fitsKeepaliveFileSavePayload({
  commit,
  content,
  path,
}: {
  commit: boolean;
  content: string;
  path: string | null;
}): boolean {
  if (!path) {
    return false;
  }

  const body = createFileSaveRequestBody({ commit, content, path });
  return new TextEncoder().encode(body).byteLength <= KEEPALIVE_MAX_BODY_BYTES;
}
