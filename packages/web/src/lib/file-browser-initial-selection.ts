interface ResolveInitialSelectedFolderPathInput {
  initialSelectedFolderPath?: string;
  isDesktopViewport: boolean;
  selectInitialFolderOnMobile: boolean;
}

export function resolveInitialSelectedFolderPath({
  initialSelectedFolderPath,
  isDesktopViewport,
  selectInitialFolderOnMobile,
}: ResolveInitialSelectedFolderPathInput): string | null {
  if (!initialSelectedFolderPath) {
    return null;
  }

  if (selectInitialFolderOnMobile || isDesktopViewport) {
    return initialSelectedFolderPath;
  }

  return null;
}
