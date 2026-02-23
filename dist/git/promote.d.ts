export declare function getChangedFiles(repoRoot: string, wtPath: string, currentBranch: string, wtBranch: string): string[];
export declare function getLocalDirtyFiles(repoRoot: string): string[];
export declare function findConflicts(files: string[], dirtyFiles: string[]): string[];
export declare function promoteFiles(repoRoot: string, wtPath: string, files: string[]): void;
