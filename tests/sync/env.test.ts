import {
  stripOverrideBlock,
  buildOverrideBlock,
} from "../../src/sync/env.js";
import type { PortAllocation } from "../../src/ports/types.js";

const allocations: PortAllocation[] = [
  {
    serviceName: "backend",
    envVar: "BACKEND_PORT",
    port: 28001,
    containerPort: 8000,
  },
  {
    serviceName: "frontend",
    envVar: "FRONTEND_PORT",
    port: 25174,
    containerPort: 5173,
  },
];

describe("buildOverrideBlock", () => {
  it("creates a delimited block with port assignments", () => {
    const block = buildOverrideBlock(allocations);
    expect(block).toContain("# --- wtc port overrides ---");
    expect(block).toContain("BACKEND_PORT=28001");
    expect(block).toContain("FRONTEND_PORT=25174");
    expect(block).toContain("# --- end wtc ---");
  });

  it("interpolates envOverrides with port values", () => {
    const block = buildOverrideBlock(allocations, {
      VITE_API_URL: "http://localhost:${BACKEND_PORT}",
    });
    expect(block).toContain("VITE_API_URL=http://localhost:28001");
  });

  it("handles multiple envOverrides", () => {
    const block = buildOverrideBlock(allocations, {
      VITE_API_URL: "http://localhost:${BACKEND_PORT}",
      VITE_APP_URL: "http://localhost:${FRONTEND_PORT}",
    });
    expect(block).toContain("VITE_API_URL=http://localhost:28001");
    expect(block).toContain("VITE_APP_URL=http://localhost:25174");
  });
});

describe("stripOverrideBlock", () => {
  it("removes the override block from content", () => {
    const content = [
      "FOO=bar",
      "",
      "# --- wtc port overrides ---",
      "BACKEND_PORT=28001",
      "# --- end wtc ---",
      "",
    ].join("\n");

    const result = stripOverrideBlock(content);
    expect(result).toContain("FOO=bar");
    expect(result).not.toContain("BACKEND_PORT");
    expect(result).not.toContain("wtc port overrides");
  });

  it("returns content unchanged when no block exists", () => {
    const content = "FOO=bar\nBAZ=qux\n";
    expect(stripOverrideBlock(content)).toBe(content);
  });

  it("handles content with only the block", () => {
    const content = [
      "# --- wtc port overrides ---",
      "X=1",
      "# --- end wtc ---",
    ].join("\n");

    const result = stripOverrideBlock(content);
    expect(result.trim()).toBe("");
  });
});
