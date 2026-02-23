const ENV_VAR_PATTERN = /^\$\{([A-Z_][A-Z0-9_]*):-(\d+)\}$/;
function stripProtocol(port) {
    return port.replace(/\/(tcp|udp|sctp)$/i, "");
}
function splitPortString(raw) {
    const cleaned = stripProtocol(raw);
    const segments = [];
    let current = "";
    let depth = 0;
    for (const ch of cleaned) {
        if (ch === "$" || (depth > 0 && ch !== "}")) {
            current += ch;
            if (ch === "{")
                depth++;
            continue;
        }
        if (ch === "{" && current.endsWith("$")) {
            current += ch;
            depth++;
            continue;
        }
        if (ch === "}") {
            current += ch;
            depth--;
            continue;
        }
        if (ch === ":" && depth === 0) {
            segments.push(current);
            current = "";
            continue;
        }
        current += ch;
    }
    segments.push(current);
    if (segments.length === 1)
        return null;
    if (segments.length === 2)
        return { host: segments[0], container: segments[1] };
    if (segments.length === 3)
        return { host: segments[1], container: segments[2] };
    return null;
}
function resolveEnvVar(segment) {
    const match = segment.match(ENV_VAR_PATTERN);
    if (!match)
        return null;
    return { envVar: match[1], defaultPort: parseInt(match[2], 10) };
}
function resolvePort(segment) {
    const n = parseInt(segment, 10);
    return isNaN(n) ? null : n;
}
export function extractPortMappings(services) {
    const mappings = [];
    for (const svc of services) {
        for (const raw of svc.ports) {
            const split = splitPortString(raw);
            if (!split)
                continue;
            const envResult = resolveEnvVar(split.host);
            const containerEnv = resolveEnvVar(split.container);
            const containerPort = containerEnv?.defaultPort ?? resolvePort(split.container);
            if (containerPort === null)
                continue;
            if (envResult) {
                mappings.push({
                    serviceName: svc.name,
                    envVar: envResult.envVar,
                    defaultPort: envResult.defaultPort,
                    containerPort,
                    raw,
                });
            }
            else {
                const hostPort = resolvePort(split.host);
                if (hostPort !== null) {
                    mappings.push({
                        serviceName: svc.name,
                        envVar: null,
                        defaultPort: hostPort,
                        containerPort,
                        raw,
                    });
                }
            }
        }
    }
    return mappings;
}
export function suggestEnvVar(serviceName) {
    return `${serviceName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PORT`;
}
