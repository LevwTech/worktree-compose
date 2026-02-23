import fs from "node:fs";
import path from "node:path";
import { exec } from "../utils/exec.js";
const COMPOSE_FILENAMES = [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yaml",
    "docker-compose.yml",
];
export function getRepoRoot(cwd) {
    return exec("git rev-parse --show-toplevel", {
        cwd: cwd ?? process.cwd(),
    });
}
export function getRepoName(repoRoot) {
    return path.basename(repoRoot);
}
export function detectComposeFile(repoRoot) {
    for (const name of COMPOSE_FILENAMES) {
        const full = path.join(repoRoot, name);
        if (fs.existsSync(full))
            return full;
    }
    return null;
}
