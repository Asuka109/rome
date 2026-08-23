export interface FileBrowserPathChangeState {
  selectedFolderPath: string | null;
  selectedPath: string | null;
  selectedTreePaths: string[];
  selectionAnchorPath: string | null;
}

export interface FileBrowserPathChangeUpdate extends FileBrowserPathChangeState {
  changedPathToReveal: string;
}

function isPathWithin(path: string | null, parentPath: string): boolean {
  return Boolean(path && (path === parentPath || path.startsWith(`${parentPath}/`)));
}

function moveRequiredPathPrefix(path: string, oldPath: string, newPath: string): string {
  return isPathWithin(path, oldPath) ? newPath + path.slice(oldPath.length) : path;
}

function moveNullablePathPrefix(
  path: string | null,
  oldPath: string,
  newPath: string,
): string | null {
  return path ? moveRequiredPathPrefix(path, oldPath, newPath) : null;
}

export function getFileBrowserPathChangeUpdate({
  newPath,
  oldPath,
  selectedFolderPath,
  selectedPath,
  selectedTreePaths,
  selectionAnchorPath,
}: FileBrowserPathChangeState & {
  newPath: string;
  oldPath: string;
}): FileBrowserPathChangeUpdate {
  return {
    changedPathToReveal: newPath,
    selectedFolderPath: moveNullablePathPrefix(selectedFolderPath, oldPath, newPath),
    selectedPath: moveNullablePathPrefix(selectedPath, oldPath, newPath),
    selectedTreePaths: selectedTreePaths.map((path) =>
      moveRequiredPathPrefix(path, oldPath, newPath),
    ),
    selectionAnchorPath: moveNullablePathPrefix(selectionAnchorPath, oldPath, newPath),
  };
}
