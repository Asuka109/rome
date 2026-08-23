import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";

export interface WebchatIncomingUpload {
  name: string;
  mimeType?: string;
  data: Buffer;
}

export interface SavedWebchatUpload {
  name: string;
  mimeType?: string;
  path: string;
  relativePath: string;
  linkPath: string;
  size: number;
}

function sanitizeUploadFileName(fileName: string): string {
  const stripped = basename(fileName).trim();
  const normalized = stripped.replace(/[\0-\x1f<>:"/\\|?*\u007f]+/g, "-").replace(/\s+/g, "-");
  const trimmed = normalized.replace(/^-+|-+$/g, "");

  if (!trimmed || trimmed === "." || trimmed === "..") {
    return "upload";
  }

  return trimmed;
}

async function resolveUniqueUploadPath(uploadDir: string, fileName: string): Promise<string> {
  const extension = extname(fileName);
  const stem = extension ? fileName.slice(0, -extension.length) : fileName;

  let attempt = 0;
  while (true) {
    const candidateName = attempt === 0 ? fileName : `${stem}-${attempt + 1}${extension}`;
    const candidatePath = join(uploadDir, candidateName);

    try {
      await access(candidatePath);
      attempt += 1;
    } catch {
      return candidatePath;
    }
  }
}

function uploadDatePath(now = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function virtualProjectPath(projectsRoot: string, path: string): string {
  const projectRelativePath = relative(projectsRoot, path).split("\\").join("/");
  if (
    !projectRelativePath ||
    projectRelativePath === ".." ||
    projectRelativePath.startsWith("../") ||
    /^[A-Za-z]:/.test(projectRelativePath)
  ) {
    throw new Error("Uploaded file is outside the projects root");
  }

  return `/projects/${projectRelativePath}`;
}

function escapeMarkdownLabel(label: string): string {
  return label.replace(/[\\[\]]/g, "\\$&");
}

function encodeMarkdownDestination(path: string): string {
  return path
    .split("/")
    .map((segment, index) =>
      index === 0 && segment === ""
        ? ""
        : encodeURIComponent(segment).replace(
            /[!'()*]/g,
            (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
          ),
    )
    .join("/");
}

function uploadLabel(relativePath: string): string {
  return relativePath.split("/").filter(Boolean).at(-1) ?? relativePath;
}

export async function saveWebchatUploads(
  workingDir: string,
  projectsRoot: string,
  uploads: WebchatIncomingUpload[],
  now = new Date(),
): Promise<SavedWebchatUpload[]> {
  if (uploads.length === 0) {
    return [];
  }

  const uploadDir = join(workingDir, uploadDatePath(now));
  await mkdir(uploadDir, { recursive: true });

  const savedUploads: SavedWebchatUpload[] = [];
  for (const upload of uploads) {
    const sanitizedName = sanitizeUploadFileName(upload.name);
    const fullPath = await resolveUniqueUploadPath(uploadDir, sanitizedName);
    await writeFile(fullPath, upload.data);

    savedUploads.push({
      name: basename(fullPath),
      mimeType: upload.mimeType,
      path: fullPath,
      relativePath: relative(workingDir, fullPath).split("\\").join("/"),
      linkPath: virtualProjectPath(projectsRoot, fullPath),
      size: upload.data.byteLength,
    });
  }

  return savedUploads;
}

export function appendUploadPathsToPrompt(
  text: string,
  uploads: Pick<SavedWebchatUpload, "linkPath" | "relativePath">[],
): string {
  if (uploads.length === 0) {
    return text.trim();
  }

  const promptText = text.trim();
  const lines = uploads.map(
    (upload, index) =>
      `- File ${index + 1}: [${escapeMarkdownLabel(uploadLabel(upload.relativePath))}](<${encodeMarkdownDestination(
        upload.linkPath,
      )}>)`,
  );

  return [promptText, lines.join("\n")].filter(Boolean).join("\n\n").trim();
}
