import { type ExecSyncOptions } from "node:child_process";
export declare function exec(cmd: string, opts?: ExecSyncOptions): string;
export declare function execLive(cmd: string, opts?: ExecSyncOptions): void;
export declare function execSafe(cmd: string, opts?: ExecSyncOptions): string | null;
