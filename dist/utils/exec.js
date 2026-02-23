import { execSync } from "node:child_process";
export function exec(cmd, opts) {
    const result = execSync(cmd, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        ...opts,
    });
    return result.trim();
}
export function execLive(cmd, opts) {
    execSync(cmd, {
        stdio: "inherit",
        ...opts,
    });
}
export function execSafe(cmd, opts) {
    try {
        return exec(cmd, opts);
    }
    catch {
        return null;
    }
}
