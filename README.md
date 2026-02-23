# worktree-compose (wtc)

Zero-config Docker Compose isolation for git worktrees.

Run multiple AI agents (or developers) in parallel, each in its own git worktree with its own database, cache, and ports. No conflicts. Compare results side by side.

## Install

```bash
npm install -D worktree-compose
# or
pnpm add -D worktree-compose
```

## Quick Start

```bash
# Create worktrees
git worktree add ../feature-1 feature-1
git worktree add ../feature-2 feature-2

# Start isolated stacks for all worktrees
wtc start

# See what's running
wtc list

# Pick the winner
wtc promote 1

# Clean up
wtc clean
```

## How It Works

`wtc` auto-detects your `docker-compose.yml`, finds every service with a `${VAR:-default}` port pattern, and assigns unique ports per worktree.

**Your compose file:**

```yaml
services:
  postgres:
    ports:
      - "${POSTGRES_PORT:-5434}:5432"
  backend:
    ports:
      - "${BACKEND_PORT:-8000}:8000"
  frontend:
    ports:
      - "${FRONTEND_PORT:-5173}:${FRONTEND_PORT:-5173}"
```

**What wtc does:**

| Service    | Main (default) | Worktree 1 | Worktree 2 |
|------------|---------------|------------|------------|
| postgres   | 5434          | 25435      | 25436      |
| backend    | 8000          | 28001      | 28002      |
| frontend   | 5173          | 25174      | 25175      |

Formula: `20000 + default_port + worktree_index`

Each worktree gets its own `COMPOSE_PROJECT_NAME` (`{repo}-wt-{N}-{branch}`), so containers, networks, and volumes are fully isolated.

## Commands

### `wtc start [indices...]`

Start Docker Compose stacks for worktrees.

```bash
wtc start       # all worktrees
wtc start 1     # worktree 1 only
wtc start 1 2 3 # worktrees 1, 2, and 3
```

On each start, wtc:
1. Syncs the compose file and Dockerfiles from main
2. Copies `.env` (or `.env.example`) and injects port overrides
3. Runs `docker compose up -d --build`

### `wtc stop [indices...]`

```bash
wtc stop        # all
wtc stop 1      # just worktree 1
```

### `wtc restart [indices...]`

Stop + start. Use after DB migrations, Dockerfile changes, or config updates.

```bash
wtc restart 1   # restart worktree 1 (re-syncs, rebuilds)
```

### `wtc list` / `wtc ls`

Show all worktrees with branch, status, ports, and URLs.

### `wtc promote <index>`

Copy changed files from a worktree into the current branch as uncommitted changes. Aborts if any of those files have local uncommitted changes (so nothing gets overwritten).

Auto-excludes `.env` and compose files (those are managed by wtc, not authored by agents).

### `wtc clean`

Stop all containers, remove all worktrees, prune stale Docker resources.

## Preparing Your docker-compose.yml

For wtc to isolate a service's port, the host port must use the `${VAR:-default}` pattern:

```yaml
# wtc CAN isolate this (has env var pattern)
ports:
  - "${BACKEND_PORT:-8000}:8000"

# wtc CANNOT isolate this (raw number)
ports:
  - "8080:8080"
```

If wtc finds raw ports, it warns you with the suggested fix:

```
Warning: Service "nginx" uses a raw port mapping (8080:80).
  To enable port isolation, change it to: "${NGINX_PORT:-8080}:80"
```

## Configuration (Optional)

wtc works zero-config. For project-specific needs, create `.wtcrc.json` in your repo root:

```json
{
  "sync": ["backend/alembic", "backend/alembic.ini"],
  "envOverrides": {
    "VITE_API_URL": "http://localhost:${BACKEND_PORT}"
  }
}
```

Or add a `"wtc"` key in your `package.json`:

```json
{
  "wtc": {
    "sync": ["backend/alembic"],
    "envOverrides": {
      "VITE_API_URL": "http://localhost:${BACKEND_PORT}"
    }
  }
}
```

### `sync`

Extra files/directories to copy from main into each worktree on start. Useful for migration configs or other infrastructure files that worktree branches may not have.

### `envOverrides`

Additional env vars to inject into each worktree's `.env`. Supports `${VAR}` interpolation with allocated port values. Use this for derived URLs like `VITE_API_URL` that depend on the backend port.

## MCP Server

wtc ships an MCP server so AI agents (Claude Code, Codex, etc.) can manage worktree stacks programmatically.

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

### Available Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `wtc_start` | `indices?: number[]` | Start worktree stacks |
| `wtc_stop` | `indices?: number[]` | Stop worktree stacks |
| `wtc_restart` | `indices?: number[]` | Restart stacks (after migrations, config changes) |
| `wtc_list` | none | List worktrees with status and ports |
| `wtc_promote` | `index: number` | Promote worktree changes to current branch |
| `wtc_clean` | none | Full cleanup |

### Agent Workflow

1. Human creates worktrees and runs `wtc start`
2. Agents are spawned in separate worktrees
3. An agent writes a DB migration, calls `wtc_restart` to apply it
4. Human compares results, runs `wtc promote` on the best one

## Requirements

- Node.js >= 18
- Git
- Docker with Compose v2 (`docker compose`)
- `docker-compose.yml` with `${VAR:-default}` port patterns

## License

MIT
