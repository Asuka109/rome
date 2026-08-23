export interface BrowserSelectionInput {
  additive: boolean;
  anchorPath: string | null;
  orderedPaths: string[];
  range: boolean;
  selectedPaths: string[];
  targetPath: string;
}

export interface BrowserSelectionResult {
  anchorPath: string;
  selectedPaths: string[];
}

export interface PreserveDisplayedFileContentInput {
  currentPath: string | null;
  displayedFilePath: string | null;
  requestedPath: string;
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths));
}

function orderSelectedPaths(paths: string[], orderedPaths: string[]): string[] {
  const selected = new Set(paths);
  const ordered = orderedPaths.filter((path) => selected.has(path));
  const unordered = paths.filter((path) => !orderedPaths.includes(path));
  return uniquePaths([...ordered, ...unordered]);
}

export function getNextBrowserSelection({
  additive,
  anchorPath,
  orderedPaths,
  range,
  selectedPaths,
  targetPath,
}: BrowserSelectionInput): BrowserSelectionResult {
  if (range && anchorPath) {
    const anchorIndex = orderedPaths.indexOf(anchorPath);
    const targetIndex = orderedPaths.indexOf(targetPath);

    if (anchorIndex !== -1 && targetIndex !== -1) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const rangePaths = orderedPaths.slice(start, end + 1);
      return {
        anchorPath,
        selectedPaths: additive
          ? orderSelectedPaths([...selectedPaths, ...rangePaths], orderedPaths)
          : rangePaths,
      };
    }
  }

  if (additive) {
    const nextSelectedPaths = selectedPaths.includes(targetPath)
      ? selectedPaths.filter((path) => path !== targetPath)
      : [...selectedPaths, targetPath];

    return {
      anchorPath: targetPath,
      selectedPaths: orderSelectedPaths(nextSelectedPaths, orderedPaths),
    };
  }

  return { anchorPath: targetPath, selectedPaths: [targetPath] };
}

export function shouldPreserveDisplayedFileContent({
  currentPath,
  displayedFilePath,
  requestedPath,
}: PreserveDisplayedFileContentInput): boolean {
  return currentPath === requestedPath && displayedFilePath === requestedPath;
}
