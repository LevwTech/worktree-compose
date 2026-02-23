import fs from "node:fs";
import path from "node:path";
export function loadConfig(repoRoot) {
    const rcPath = path.join(repoRoot, ".wtcrc.json");
    if (fs.existsSync(rcPath)) {
        return JSON.parse(fs.readFileSync(rcPath, "utf-8"));
    }
    const pkgPath = path.join(repoRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.wtc && typeof pkg.wtc === "object") {
            return pkg.wtc;
        }
    }
    return {};
}
