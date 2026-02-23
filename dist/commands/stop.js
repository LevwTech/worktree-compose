import { buildContext, filterWorktrees } from "../context.js";
import { composeProjectName } from "../utils/sanitize.js";
import { execLive } from "../utils/exec.js";
import * as log from "../utils/log.js";
export function stopCommand(indices) {
    const ctx = buildContext();
    if (ctx.worktrees.length === 0) {
        log.warn("No worktrees to stop.");
        return;
    }
    const targets = filterWorktrees(ctx.worktrees, indices);
    for (const wt of targets) {
        const idx = ctx.worktrees.indexOf(wt) + 1;
        const project = composeProjectName(ctx.repoName, idx, wt.branch);
        log.info(`Stopping ${project}...`);
        try {
            execLive(`docker compose -p "${project}" down`, { cwd: wt.path });
            log.success(`Stopped worktree ${idx} (${wt.branch})`);
        }
        catch {
            log.warn(`Could not stop ${project} (may already be stopped)`);
        }
    }
}
