import { extname } from "node:path";
import mime from "mime/lite";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

const EXTENSION_OVERRIDES: Record<string, string> = {
  ".eot": "application/vnd.ms-fontobject",
  ".flac": "audio/flac",
  ".ico": "image/vnd.microsoft.icon",
  ".m4v": "video/x-m4v",
};

function withDefaultCharset(contentType: string): string {
  if (contentType.includes("charset=")) return contentType;
  const [mediaType] = contentType.split(";", 1);
  if (
    mediaType.startsWith("text/") ||
    mediaType === "application/json" ||
    mediaType === "application/xml" ||
    mediaType.endsWith("+json") ||
    mediaType.endsWith("+xml")
  ) {
    return `${contentType}; charset=utf-8`;
  }
  return contentType;
}

export function contentTypeForPath(path: string): string {
  const extension = extname(path).toLowerCase();
  const contentType =
    EXTENSION_OVERRIDES[extension] ?? mime.getType(extension.slice(1)) ?? FALLBACK_CONTENT_TYPE;
  return withDefaultCharset(contentType);
}
