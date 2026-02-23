import type { PortAllocation } from "../ports/types.js";
export declare function stripOverrideBlock(content: string): string;
export declare function buildOverrideBlock(allocations: PortAllocation[], envOverrides?: Record<string, string>): string;
export declare function injectPortOverrides(envPath: string, allocations: PortAllocation[], envOverrides?: Record<string, string>): void;
export declare function copyBaseEnv(repoRoot: string, wtPath: string): void;
