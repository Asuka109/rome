export function getInternalApiBaseUrl(): string {
  const port = process.env.INTERNAL_API_PORT ?? "4141";
  return `http://127.0.0.1:${port}`;
}
