import type { PortMapping, PortAllocation } from "./types.js";

const BASE_OFFSET = 20000;

export function allocatePort(
  defaultPort: number,
  worktreeIndex: number,
): number {
  let port = BASE_OFFSET + defaultPort + worktreeIndex;

  if (port > 65535) {
    port = defaultPort + 100 * worktreeIndex;
  }

  if (port > 65535 || port < 1024) {
    throw new Error(
      `Cannot allocate port for default ${defaultPort} at worktree index ${worktreeIndex}. ` +
        `Computed port ${port} is out of valid range (1024-65535).`,
    );
  }

  return port;
}

export function allocateWorktreePorts(
  mappings: PortMapping[],
  worktreeIndex: number,
): PortAllocation[] {
  const overridable = mappings.filter((m) => m.envVar !== null);

  const allocations: PortAllocation[] = overridable.map((m) => ({
    serviceName: m.serviceName,
    envVar: m.envVar!,
    port: allocatePort(m.defaultPort, worktreeIndex),
    containerPort: m.containerPort,
  }));

  const seen = new Set<number>();
  for (const a of allocations) {
    if (seen.has(a.port)) {
      throw new Error(
        `Port collision: ${a.port} is assigned to multiple services in worktree ${worktreeIndex}.`,
      );
    }
    seen.add(a.port);
  }

  return allocations;
}
