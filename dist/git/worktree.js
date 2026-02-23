import { exec, execSafe } from "../utils/exec.js";
export function getWorktrees(repoRoot) {
    const output = exec(`git -C "${repoRoot}" worktree list --porcelain`);
    const blocks = output.split("\n\n").filter(Boolean);
    const worktrees = [];
    for (const block of blocks) {
        const lines = block.split("\n");
        let wtPath = "";
        let branch = "detached";
        for (const line of lines) {
            if (line.startsWith("worktree ")) {
                wtPath = line.slice("worktree ".length);
            }
            if (line.startsWith("branch ")) {
                branch = line.slice("branch ".length).replace("refs/heads/", "");
            }
        }
        if (wtPath) {
            worktrees.push({
                path: wtPath,
                branch,
                isMain: worktrees.length === 0,
            });
        }
    }
    return worktrees;
}
export function getNonMainWorktrees(repoRoot) {
    return getWorktrees(repoRoot).filter((wt) => !wt.isMain);
}
export function getWorktreeByIndex(repoRoot, index) {
    const nonMain = getNonMainWorktrees(repoRoot);
    return nonMain[index - 1] ?? null;
}
export function getWorktreeBranch(wtPath) {
    return (execSafe(`git -C "${wtPath}" rev-parse --abbrev-ref HEAD`) ?? "detached");
}
export function getWorktreeHead(wtPath) {
    return exec(`git -C "${wtPath}" rev-parse HEAD`);
}
