export interface FileSaveBaselineSequences {
  commit: number;
  disk: number;
}

export interface FileSaveBaselineUpdate {
  applyCommit: boolean;
  applyDisk: boolean;
  sequences: FileSaveBaselineSequences;
}

export function getSuccessfulFileSaveBaselineUpdate({
  commit,
  savedPath,
  selectedPath,
  sequence,
  sequences,
}: {
  commit: boolean;
  savedPath: string;
  selectedPath: string | null;
  sequence: number;
  sequences: FileSaveBaselineSequences;
}): FileSaveBaselineUpdate {
  const applyDisk = sequence > sequences.disk;
  const applyCommit = commit && sequence > sequences.commit;
  const isSelectedPath = selectedPath === savedPath;

  return {
    applyCommit: isSelectedPath && applyCommit,
    applyDisk: isSelectedPath && applyDisk,
    sequences: {
      commit: applyCommit ? sequence : sequences.commit,
      disk: applyDisk ? sequence : sequences.disk,
    },
  };
}
