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

const project = "myapp-wt-1-feature-auth";

describe("buildOverrideBlock", () => {
  it("creates a delimited block with the project name and port assignments", () => {
    const block = buildOverrideBlock(allocations, project);
    expect(block).toContain("# --- wtc port overrides ---");
    expect(block).toContain(`COMPOSE_PROJECT_NAME=${project}`);
    expect(block).toContain("BACKEND_PORT=28001");
    expect(block).toContain("FRONTEND_PORT=25174");
    expect(block).toContain("# --- end wtc ---");
  });

  it("always writes COMPOSE_PROJECT_NAME (required argument)", () => {
    const block = buildOverrideBlock(allocations, project);
    expect(block).toContain(`COMPOSE_PROJECT_NAME=${project}`);
  });

  it("interpolates envOverrides with port values", () => {
    const block = buildOverrideBlock(allocations, project, {
      VITE_API_URL: "http://localhost:${BACKEND_PORT}",
    });
    expect(block).toContain("VITE_API_URL=http://localhost:28001");
  });

  it("handles multiple envOverrides", () => {
    const block = buildOverrideBlock(allocations, project, {
      VITE_API_URL: "http://localhost:${BACKEND_PORT}",
      VITE_APP_URL: "http://localhost:${FRONTEND_PORT}",
    });
    expect(block).toContain("VITE_API_URL=http://localhost:28001");
    expect(block).toContain("VITE_APP_URL=http://localhost:25174");
  });

  it("interpolates ${COMPOSE_PROJECT_NAME} inside envOverrides", () => {
    const block = buildOverrideBlock(allocations, project, {
      STACK_LABEL: "stack:${COMPOSE_PROJECT_NAME}",
      MIXED: "${COMPOSE_PROJECT_NAME}-${BACKEND_PORT}",
    });
    expect(block).toContain(`STACK_LABEL=stack:${project}`);
    expect(block).toContain(`MIXED=${project}-28001`);
  });

  it("replaces every occurrence of an interpolation token", () => {
    const block = buildOverrideBlock(allocations, project, {
      DUP: "${BACKEND_PORT}/${BACKEND_PORT}",
    });
    expect(block).toContain("DUP=28001/28001");
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
