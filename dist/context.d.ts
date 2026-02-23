import type { ComposeFile } from "./compose/types.js";
import type { PortMapping } from "./ports/types.js";
import type { WtcConfig } from "./config.js";
import type { WorktreeInfo } from "./git/worktree.js";
export interface WtcContext {
    repoRoot: string;
    repoName: string;
    composeFile: ComposeFile;
    portMappings: PortMapping[];
    config: WtcConfig;
    worktrees: WorktreeInfo[];
}
export declare function buildContext(): WtcContext;
export declare function filterWorktrees(worktrees: WorktreeInfo[], indices: number[]): WorktreeInfo[];
