import { execSync, type ExecSyncOptions } from "node:child_process";

export function exec(cmd: string, opts?: ExecSyncOptions): string {
  const result = execSync(cmd, {
    encoding: "utf-8" as const,
    stdio: ["pipe", "pipe", "pipe"],
    ...opts,
  }) as string;
  return result.trim();
}

export function execLive(cmd: string, opts?: ExecSyncOptions): void {
  execSync(cmd, {
    stdio: "inherit",
    ...opts,
  });
}

export function execSafe(cmd: string, opts?: ExecSyncOptions): string | null {
  try {
    return exec(cmd, opts);
  } catch {
    return null;
  }
}
