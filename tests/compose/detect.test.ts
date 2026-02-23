import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectComposeFile } from "../../src/compose/detect.js";

describe("detectComposeFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wtc-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("finds compose.yaml first (highest precedence)", () => {
    fs.writeFileSync(path.join(tmpDir, "compose.yaml"), "");
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), "");

    const result = detectComposeFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "compose.yaml"));
  });

  it("finds compose.yml when compose.yaml is absent", () => {
    fs.writeFileSync(path.join(tmpDir, "compose.yml"), "");
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), "");

    const result = detectComposeFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "compose.yml"));
  });

  it("finds docker-compose.yaml", () => {
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yaml"), "");

    const result = detectComposeFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "docker-compose.yaml"));
  });

  it("finds docker-compose.yml", () => {
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), "");

    const result = detectComposeFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "docker-compose.yml"));
  });

  it("returns null when no compose file exists", () => {
    const result = detectComposeFile(tmpDir);
    expect(result).toBeNull();
  });
});
