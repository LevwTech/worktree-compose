import type { PortMapping, PortAllocation } from "./types.js";
export declare function allocatePort(defaultPort: number, worktreeIndex: number): number;
export declare function allocateWorktreePorts(mappings: PortMapping[], worktreeIndex: number): PortAllocation[];
