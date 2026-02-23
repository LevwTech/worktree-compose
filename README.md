# worktree-compose (wtc)

Zero-config Docker Compose isolation for git worktrees.

Every worktree gets its own ports, database, cache, and containers — automatically.

```bash
npm install -D worktree-compose
```

## Usage

```bash
# Start isolated stacks for all worktrees
npx wtc start

# Start specific worktrees
npx wtc start 1
npx wtc start 1 2 3

# See what's running
npx wtc list

# Stop worktrees
npx wtc stop
npx wtc stop 1

# Restart (re-sync files, rebuild containers)
npx wtc restart 1

# Pull a worktree's changes into your current branch
npx wtc promote 1

# Tear down everything (containers, worktrees, volumes)
npx wtc clean
```

**Output of `wtc list`:**

```
┌───────┬───────────────┬────────┬────────────────────────┬─────────────────────────────────────────────────────────┐
│ Index │ Branch        │ Status │ URL                    │ Ports                                                   │
├───────┼───────────────┼────────┼────────────────────────┼─────────────────────────────────────────────────────────┤
│ -     │ main          │ -      │ -                      │ postgres:5434 redis:6380 backend:8000 frontend:5173     │
├───────┼───────────────┼────────┼────────────────────────┼─────────────────────────────────────────────────────────┤
│ 1     │ feature-auth  │ up     │ http://localhost:25174 │ postgres:25435 redis:26381 backend:28001 frontend:25174 │
├───────┼───────────────┼────────┼────────────────────────┼─────────────────────────────────────────────────────────┤
│ 2     │ fix-billing   │ down   │ http://localhost:25175 │ postgres:25436 redis:26382 backend:28002 frontend:25175 │
└───────┴───────────────┴────────┴────────────────────────┴─────────────────────────────────────────────────────────┘
```

## The Problem

Multiple developers or AI agents working in parallel on the same repo — each in a [git worktree](https://git-scm.com/docs/git-worktree) — share the same Docker Compose setup. This means port conflicts, shared databases, shared caches, and container collisions. You can't run two stacks side by side.

## The Solution

`wtc` reads your `docker-compose.yml`, finds every service that exposes a port via `${VAR:-default}`, assigns unique ports per worktree, injects them into each worktree's `.env`, and starts isolated containers. No configuration needed.

## Preparing Your docker-compose.yml

For `wtc` to isolate a service's port, the host port must use the `${VAR:-default}` pattern:

```yaml
# wtc CAN isolate this
ports:
  - "${BACKEND_PORT:-8000}:8000"

# wtc CANNOT isolate this (hardcoded)
ports:
  - "8080:8080"
```

If `wtc` finds hardcoded ports, it warns you and suggests the fix:

```
⚠ Service "nginx" uses a raw port mapping (8080:80).
  To enable port isolation, change it to: "${NGINX_PORT:-8080}:80"
```

### Supported port formats

```yaml
# Standard
- "${BACKEND_PORT:-8000}:8000"

# Same var for host and container
- "${FRONTEND_PORT:-5173}:${FRONTEND_PORT:-5173}"

# IP-bound
- "127.0.0.1:${API_PORT:-3000}:3000"

# With protocol
- "${BACKEND_PORT:-8000}:8000/tcp"

# Multiple ports per service
- "${BACKEND_PORT:-8000}:8000"
- "${DEBUG_PORT:-9229}:9229"

# Long-form syntax
- target: 8000
  published: "${BACKEND_PORT:-8000}"
  protocol: tcp
```

## How It Works

### Port Allocation

Each worktree N gets unique ports: `20000 + default_port + worktree_index`

| Service  | Main (default) | Worktree 1 | Worktree 2 | Worktree 3 |
|----------|---------------|------------|------------|------------|
| postgres | 5434          | 25435      | 25436      | 25437      |
| redis    | 6380          | 26381      | 26382      | 26383      |
| backend  | 8000          | 28001      | 28002      | 28003      |
| frontend | 5173          | 25174      | 25175      | 25176      |

### Container Isolation

Each worktree gets its own `COMPOSE_PROJECT_NAME`: `{repo}-wt-{index}-{branch}`. This means separate containers, networks, and volumes. Nothing is shared.

### File Sync

Before starting, `wtc` copies infrastructure files from main into the worktree: the compose file, every Dockerfile referenced in `build.dockerfile`, and `.env`. This ensures the worktree always has the latest Docker setup.

### Env Injection

After copying `.env`, `wtc` appends an idempotent block with allocated port overrides:

```bash
# existing .env content stays untouched...

# --- wtc port overrides ---
POSTGRES_PORT=25435
REDIS_PORT=26381
BACKEND_PORT=28001
FRONTEND_PORT=25174
# --- end wtc ---
```

## Commands

### `wtc start [indices...]`

Start Docker Compose stacks. Syncs files, injects ports, runs `docker compose up -d --build`.

```bash
npx wtc start         # all worktrees
npx wtc start 1       # worktree 1 only
npx wtc start 1 2 3   # worktrees 1, 2, and 3
```

### `wtc stop [indices...]`

Stop stacks. Runs `docker compose down`. Volumes are preserved.

```bash
npx wtc stop          # all
npx wtc stop 1        # worktree 1 only
```

### `wtc restart [indices...]`

Full restart: stop, re-sync files, re-inject env, rebuild, start. Use after migrations, Dockerfile changes, or config updates.

```bash
npx wtc restart 1
```

### `wtc list` / `wtc ls`

Show all worktrees with branch, status, URL, and ports.

```bash
npx wtc list
```

### `wtc promote <index>`

Copy changed files from a worktree into your current branch as uncommitted changes. Automatically excludes `.env` and compose files. Aborts if it would overwrite uncommitted local changes.

```bash
npx wtc promote 1
```

### `wtc clean`

Stop all containers, remove all worktrees, prune stale Docker resources.

```bash
npx wtc clean
```

## Configuration (Optional)

`wtc` works zero-config. For project-specific needs, create `.wtcrc.json` in your repo root:

```json
{
  "sync": ["backend/alembic", "backend/alembic.ini"],
  "envOverrides": {
    "VITE_API_URL": "http://localhost:${BACKEND_PORT}"
  }
}
```

Or use a `"wtc"` key in `package.json`.

### `sync`

Extra files/directories to copy from main into each worktree on start. Use for migration configs, seed scripts, or anything not on the worktree's branch.

### `envOverrides`

Additional env vars injected into `.env`. Supports `${VAR}` interpolation with allocated port values. Use when env vars depend on allocated ports (e.g. `VITE_API_URL`).

## MCP Server

Built-in [MCP](https://modelcontextprotocol.io/) server so AI agents can manage their stack programmatically.

### Setup

**Claude Code** (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "wtc": {
      "command": "npx",
      "args": ["wtc", "mcp"]
    }
  }
}
```

**Codex:**

```json
{
  "servers": {
    "wtc": {
      "command": "npx",
      "args": ["wtc", "mcp"]
    }
  }
}
```

### Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `wtc_start` | `indices?: number[]` | Start worktree stacks |
| `wtc_stop` | `indices?: number[]` | Stop worktree stacks |
| `wtc_restart` | `indices?: number[]` | Restart after migrations/config changes |
| `wtc_list` | none | List worktrees (returns JSON) |
| `wtc_promote` | `index: number` | Pull worktree changes into current branch |
| `wtc_clean` | none | Tear down everything |

## Full Example

```bash
cd myapp
pnpm add -D worktree-compose

git branch agent-1-auth
git branch agent-2-auth
git worktree add ../myapp-agent-1 agent-1-auth
git worktree add ../myapp-agent-2 agent-2-auth

npx wtc start
# Worktree 1: backend:28001 frontend:25174
# Worktree 2: backend:28002 frontend:25175

# Compare side by side
# http://localhost:25174  (agent 1)
# http://localhost:25175  (agent 2)

npx wtc promote 1
git add -A && git commit -m "feat: auth from agent 1"
npx wtc clean
```

## Requirements

- **Node.js** >= 18
- **Git** with worktree support
- **Docker** with Compose v2 (`docker compose`)
- `docker-compose.yml` with `${VAR:-default}` port patterns

## Troubleshooting

**"No compose file found"** — `wtc` looks in the git repo root, not the current directory.

**"No extra worktrees found"** — Create worktrees first: `git worktree add ../my-feature my-branch`

**Ports not changing** — Use `${VAR:-default}` for host ports, not hardcoded numbers.

**Stale containers** — Run `wtc clean`, or manually: `docker ps -a --filter "name=-wt-" -q | xargs docker rm -f`

## License

MIT
