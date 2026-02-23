export interface WorktreeInfo {
    path: string;
    branch: string;
    isMain: boolean;
}
export declare function getWorktrees(repoRoot: string): WorktreeInfo[];
export declare function getNonMainWorktrees(repoRoot: string): WorktreeInfo[];
export declare function getWorktreeByIndex(repoRoot: string, index: number): WorktreeInfo | null;
export declare function getWorktreeBranch(wtPath: string): string;
export declare function getWorktreeHead(wtPath: string): string;
