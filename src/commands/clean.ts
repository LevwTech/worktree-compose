import { getRepoRoot, getRepoName } from "../compose/detect.js";
import { getNonMainWorktrees } from "../git/worktree.js";
import { composeProjectName } from "../utils/sanitize.js";
import { exec, execSafe } from "../utils/exec.js";
import * as log from "../utils/log.js";

export function cleanCommand(): void {
  const repoRoot = getRepoRoot();
  const repoName = getRepoName(repoRoot);
  const worktrees = getNonMainWorktrees(repoRoot);

  const currentWt = execSafe("git rev-parse --show-toplevel") ?? repoRoot;

  for (let i = 0; i < worktrees.length; i++) {
    const wt = worktrees[i];
    const idx = i + 1;
    const project = composeProjectName(repoName, idx, wt.branch);

    log.info(`Stopping containers for ${project}...`);
    try {
      exec(`docker compose -p "${project}" down`, { cwd: wt.path });
    } catch {
      // already stopped
    }

    if (wt.path === currentWt) {
      log.warn(`Skipping removal of current worktree: ${wt.path}`);
      continue;
    }

    log.info(`Removing worktree: ${wt.path}`);
    try {
      exec(`git -C "${repoRoot}" worktree remove "${wt.path}" --force`);
    } catch {
      log.warn(`Could not remove ${wt.path}`);
    }
  }

  execSafe(`git -C "${repoRoot}" worktree prune`);

  const staleContainers = execSafe(
    `docker ps -aq --filter "label=com.docker.compose.project" --filter "name=-wt-"`,
  );
  if (staleContainers) {
    log.info("Removing stale worktree containers...");
    execSafe(`docker rm -f ${staleContainers}`);
  }

  const staleNetworks = execSafe(
    `docker network ls -q --filter "name=${repoName}-wt-"`,
  );
  if (staleNetworks) {
    execSafe(`docker network rm ${staleNetworks}`);
  }

  const staleVolumes = execSafe(
    `docker volume ls -q --filter "name=${repoName}-wt-"`,
  );
  if (staleVolumes) {
    execSafe(`docker volume rm ${staleVolumes}`);
  }

  log.success("Cleanup complete.");
}
