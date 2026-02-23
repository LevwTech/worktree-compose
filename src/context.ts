import { getRepoRoot, getRepoName, detectComposeFile } from "./compose/detect.js";
import { parseComposeFile } from "./compose/parse.js";
import { extractPortMappings } from "./ports/extract.js";
import { loadConfig } from "./config.js";
import { getNonMainWorktrees } from "./git/worktree.js";
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

export function buildContext(): WtcContext {
  const repoRoot = getRepoRoot();
  const repoName = getRepoName(repoRoot);

  const composePath = detectComposeFile(repoRoot);
  if (!composePath) {
    throw new Error(
      `No compose file found in ${repoRoot}. Expected one of: compose.yaml, compose.yml, docker-compose.yaml, docker-compose.yml`,
    );
  }

  const composeFile = parseComposeFile(composePath);
  const portMappings = extractPortMappings(composeFile.services);
  const config = loadConfig(repoRoot);
  const worktrees = getNonMainWorktrees(repoRoot);

  return { repoRoot, repoName, composeFile, portMappings, config, worktrees };
}

export function filterWorktrees(
  worktrees: WorktreeInfo[],
  indices: number[],
): WorktreeInfo[] {
  if (indices.length === 0) return worktrees;
  return indices
    .map((i) => {
      const wt = worktrees[i - 1];
      if (!wt) throw new Error(`Worktree index ${i} not found. Run 'wtc list' to see available worktrees.`);
      return wt;
    });
}
