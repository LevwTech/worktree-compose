import {
  allocatePort,
  allocateWorktreePorts,
} from "../../src/ports/allocate.js";
import type { PortMapping } from "../../src/ports/types.js";

describe("allocatePort", () => {
  it("computes 20000 + default + index", () => {
    expect(allocatePort(8000, 1)).toBe(28001);
    expect(allocatePort(5173, 2)).toBe(25175);
    expect(allocatePort(5434, 1)).toBe(25435);
    expect(allocatePort(6380, 3)).toBe(26383);
  });

  it("falls back for high default ports", () => {
    expect(allocatePort(50000, 1)).toBe(50100);
  });

  it("throws for impossible ports", () => {
    expect(() => allocatePort(60000, 100)).toThrow(/out of valid range/);
  });
});

describe("allocateWorktreePorts", () => {
  const mappings: PortMapping[] = [
    {
      serviceName: "postgres",
      envVar: "POSTGRES_PORT",
      defaultPort: 5434,
      containerPort: 5432,
      raw: "${POSTGRES_PORT:-5434}:5432",
    },
    {
      serviceName: "backend",
      envVar: "BACKEND_PORT",
      defaultPort: 8000,
      containerPort: 8000,
      raw: "${BACKEND_PORT:-8000}:8000",
    },
    {
      serviceName: "nginx",
      envVar: null,
      defaultPort: 8080,
      containerPort: 80,
      raw: "8080:80",
    },
  ];

  it("allocates ports for overridable services only", () => {
    const result = allocateWorktreePorts(mappings, 1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      serviceName: "postgres",
      envVar: "POSTGRES_PORT",
      port: 25435,
      containerPort: 5432,
    });
    expect(result[1]).toEqual({
      serviceName: "backend",
      envVar: "BACKEND_PORT",
      port: 28001,
      containerPort: 8000,
    });
  });

  it("skips raw port mappings (no envVar)", () => {
    const result = allocateWorktreePorts(mappings, 1);
    const names = result.map((a) => a.serviceName);
    expect(names).not.toContain("nginx");
  });

  it("produces different ports for different worktree indices", () => {
    const r1 = allocateWorktreePorts(mappings, 1);
    const r2 = allocateWorktreePorts(mappings, 2);

    expect(r1[0].port).not.toBe(r2[0].port);
    expect(r1[1].port).not.toBe(r2[1].port);
  });
});
