import fs from "node:fs";
import path from "node:path";
const BLOCK_START = "# --- wtc port overrides ---";
const BLOCK_END = "# --- end wtc ---";
export function stripOverrideBlock(content) {
    const startIdx = content.indexOf(BLOCK_START);
    if (startIdx === -1)
        return content;
    const endIdx = content.indexOf(BLOCK_END, startIdx);
    if (endIdx === -1)
        return content;
    const before = content.slice(0, startIdx).trimEnd();
    const after = content.slice(endIdx + BLOCK_END.length).trimStart();
    return [before, after].filter(Boolean).join("\n") + "\n";
}
export function buildOverrideBlock(allocations, envOverrides) {
    const lines = [BLOCK_START];
    const portValues = new Map();
    for (const a of allocations) {
        lines.push(`${a.envVar}=${a.port}`);
        portValues.set(a.envVar, a.port);
    }
    if (envOverrides) {
        for (const [key, template] of Object.entries(envOverrides)) {
            let value = template;
            for (const [envVar, port] of portValues) {
                value = value.replace(`\${${envVar}}`, String(port));
            }
            lines.push(`${key}=${value}`);
        }
    }
    lines.push(BLOCK_END);
    return lines.join("\n");
}
export function injectPortOverrides(envPath, allocations, envOverrides) {
    let content = "";
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, "utf-8");
    }
    content = stripOverrideBlock(content);
    const block = buildOverrideBlock(allocations, envOverrides);
    const result = content.trimEnd() + "\n\n" + block + "\n";
    fs.writeFileSync(envPath, result, "utf-8");
}
export function copyBaseEnv(repoRoot, wtPath) {
    const envSrc = path.join(repoRoot, ".env");
    const envExampleSrc = path.join(repoRoot, ".env.example");
    const envDst = path.join(wtPath, ".env");
    if (fs.existsSync(envSrc)) {
        fs.copyFileSync(envSrc, envDst);
    }
    else if (fs.existsSync(envExampleSrc)) {
        fs.copyFileSync(envExampleSrc, envDst);
    }
    else {
        fs.writeFileSync(envDst, "", "utf-8");
    }
}
