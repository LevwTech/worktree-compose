import { getRepoRoot } from "../compose/detect.js";
import {
  getWorktreeByIndex,
  getWorktreeBranch,
} from "../git/worktree.js";
import {
  getChangedFiles,
  getLocalDirtyFiles,
  findConflicts,
  promoteFiles,
} from "../git/promote.js";
import * as log from "../utils/log.js";

export function promoteCommand(index: number): void {
  const repoRoot = getRepoRoot();
  const wt = getWorktreeByIndex(repoRoot, index);

  if (!wt) {
    log.error(
      `Worktree index ${index} not found. Run 'wtc list' to see available worktrees.`,
    );
    process.exit(1);
  }

  const currentBranch = getWorktreeBranch(repoRoot);
  const displayCurrent = currentBranch === "HEAD" ? "detached HEAD" : currentBranch;

  log.info(`Promoting worktree ${index} (${wt.branch}) into ${displayCurrent}`);

  const files = getChangedFiles(repoRoot, wt.path, currentBranch, wt.branch);

  if (files.length === 0) {
    log.info("No changes to promote.");
    return;
  }

  const dirtyFiles = getLocalDirtyFiles(repoRoot);
  const conflicts = findConflicts(files, dirtyFiles);

  if (conflicts.length > 0) {
    log.error(
      "Abort: the following files have uncommitted changes and would be overwritten:",
    );
    for (const f of conflicts) {
      console.log(`  ${f}`);
    }
    console.log(
      "\nCommit or stash your local changes first, then re-run promote.",
    );
    process.exit(1);
  }

  promoteFiles(repoRoot, wt.path, files);
  log.success(`Promoted ${files.length} file(s). Changes are uncommitted in ${currentBranch}.`);

  for (const f of files) {
    console.log(`  ${f}`);
  }
}
