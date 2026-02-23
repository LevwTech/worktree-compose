import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import type { ComposeFile, ComposeService } from "./types.js";

function parseServicePorts(ports: unknown): string[] {
  if (!Array.isArray(ports)) return [];

  return ports.flatMap((p) => {
    if (typeof p === "string") return [p];
    if (typeof p === "number") return [String(p)];
    if (typeof p === "object" && p !== null) {
      const obj = p as Record<string, unknown>;
      if (obj.published != null && obj.target != null) {
        return [`${obj.published}:${obj.target}`];
      }
    }
    return [];
  });
}

function parseServiceBuild(
  build: unknown,
): ComposeService["build"] | undefined {
  if (typeof build === "string") {
    return { context: build };
  }
  if (typeof build === "object" && build !== null) {
    const obj = build as Record<string, unknown>;
    return {
      context: typeof obj.context === "string" ? obj.context : undefined,
      dockerfile:
        typeof obj.dockerfile === "string" ? obj.dockerfile : undefined,
    };
  }
  return undefined;
}

function parseEnvFile(envFile: unknown): string[] | undefined {
  if (typeof envFile === "string") return [envFile];
  if (Array.isArray(envFile)) {
    return envFile.filter((e) => typeof e === "string");
  }
  return undefined;
}

export function parseComposeFile(composePath: string): ComposeFile {
  const raw = fs.readFileSync(composePath, "utf-8");
  const doc = parseYaml(raw, { uniqueKeys: false });

  if (!doc || typeof doc !== "object" || !("services" in doc)) {
    return { services: [], composePath };
  }

  const servicesObj = doc.services as Record<string, Record<string, unknown>>;
  const services: ComposeService[] = Object.entries(servicesObj).map(
    ([name, svc]) => ({
      name,
      ports: parseServicePorts(svc.ports),
      build: parseServiceBuild(svc.build),
      envFile: parseEnvFile(svc.env_file),
    }),
  );

  return { services, composePath };
}
