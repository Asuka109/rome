export interface FileBrowserUploadEntry {
  file: File;
  relativePath: string;
}

function normalizeUploadRelativePath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized) return null;

  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }

  return segments.join("/");
}

function getFileInputRelativePath(file: File): string {
  const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return normalizeUploadRelativePath(webkitRelativePath || file.name) ?? file.name;
}

export function getUploadEntriesFromFileList(files: File[]): FileBrowserUploadEntry[] {
  return files.map((file) => ({
    file,
    relativePath: getFileInputRelativePath(file),
  }));
}

function readFileEntry(entry: FileSystemFileEntry): Promise<FileBrowserUploadEntry> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) =>
        resolve({
          file,
          relativePath: normalizeUploadRelativePath(entry.fullPath) ?? file.name,
        }),
      reject,
    );
  });
}

function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

async function walkDirectoryEntry(
  entry: FileSystemDirectoryEntry,
): Promise<FileBrowserUploadEntry[]> {
  const reader = entry.createReader();
  const files: FileBrowserUploadEntry[] = [];

  for (;;) {
    const batch = await readDirectoryEntries(reader);
    if (batch.length === 0) break;
    files.push(...(await walkEntries(batch)));
  }

  return files;
}

async function walkEntries(entries: FileSystemEntry[]): Promise<FileBrowserUploadEntry[]> {
  const files: FileBrowserUploadEntry[] = [];
  for (const entry of entries) {
    if (entry.isFile) {
      files.push(await readFileEntry(entry as FileSystemFileEntry));
    } else if (entry.isDirectory) {
      files.push(...(await walkDirectoryEntry(entry as FileSystemDirectoryEntry)));
    }
  }
  return files;
}

export async function getUploadEntriesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<FileBrowserUploadEntry[]> {
  const entryItems = Array.from(dataTransfer.items ?? [])
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (entryItems.length > 0) {
    return walkEntries(entryItems);
  }

  return getUploadEntriesFromFileList(Array.from(dataTransfer.files ?? []));
}
