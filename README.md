# worktree-compose (wtc)

Zero-config Docker Compose isolation for git worktrees.

## The Problem

You're running multiple AI agents (or developers) in parallel on the same repo, each in its own [git worktree](https://git-scm.com/docs/git-worktree). Without isolation, they all share the same Docker Compose setup — same Postgres, same Redis, same backend, same frontend. This means:

- **Port conflicts** — two stacks can't both bind to port 8000
- **Shared database** — agents overwrite each other's data
- **Shared cache** — one agent's Redis state leaks into another's
- **Container collisions** — `docker compose up` in one worktree kills the other's containers
- **No comparison** — you can't open two frontends side by side to compare agent outputs

You need each worktree to have its own fully isolated stack: its own database, its own cache, its own ports, its own containers. But setting this up manually for every worktree is tedious and error-prone.

## The Solution

`wtc` gives every git worktree its own Docker Compose stack automatically.

It reads your `docker-compose.yml`, finds every service that exposes a port, assigns unique ports per worktree, injects them into each worktree's `.env`, and starts isolated containers. No configuration needed.

Each worktree gets:
- **Its own ports** — no collisions
- **Its own database** — no shared state
- **Its own cache** — no leaking
- **Its own containers** — independent lifecycles
- **Its own URL** — open them side by side and compare

## Install

```bash
npm install -D worktree-compose
# or
pnpm add -D worktree-compose
# or
yarn add -D worktree-compose
```

This gives you the `wtc` command in your project.

## Quick Start

```bash
# 1. Create worktrees
git worktree add ../feature-1 feature-1
git worktree add ../feature-2 feature-2

# 2. Start isolated stacks for all worktrees
npx wtc start

# 3. See what's running
npx wtc list

# 4. Open each frontend in your browser and compare

# 5. Pick the best one and pull its changes into main
npx wtc promote 1

# 6. Clean up everything
npx wtc clean
```

## How It Works

### 1. Auto-Detection

`wtc` finds your compose file in the repo root, checking these names in order (matching Docker Compose's own precedence):

1. `compose.yaml`
2. `compose.yml`
3. `docker-compose.yaml`
4. `docker-compose.yml`

### 2. Port Parsing

It parses the YAML and scans every service's `ports:` array. For each port using the `${VAR:-default}` pattern, it extracts the env var name and default value.

**Your compose file:**

```yaml
services:
  postgres:
    image: postgres:15
    ports:
      - "${POSTGRES_PORT:-5434}:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "${REDIS_PORT:-6380}:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "${BACKEND_PORT:-8000}:8000"

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    # No ports — this service is ignored by wtc

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "${FRONTEND_PORT:-5173}:${FRONTEND_PORT:-5173}"
```

`wtc` detects 4 overridable ports (postgres, redis, backend, frontend) and ignores the worker (no port mapping).

### 3. Port Allocation

Each worktree N gets unique ports using the formula:

```
port = 20000 + default_port + worktree_index
```

| Service    | Main (default) | Worktree 1 | Worktree 2 | Worktree 3 |
|------------|---------------|------------|------------|------------|
| postgres   | 5434          | 25435      | 25436      | 25437      |
| redis      | 6380          | 26381      | 26382      | 26383      |
| backend    | 8000          | 28001      | 28002      | 28003      |
| frontend   | 5173          | 25174      | 25175      | 25176      |

The `20000` offset ensures worktree ports never collide with the main worktree's defaults or common system ports.

If a computed port exceeds 65535 (e.g. a service with a very high default port), wtc falls back to `default + 100 * N`. If even that overflows, it errors with a clear message.

### 4. Container Isolation

Each worktree gets its own `COMPOSE_PROJECT_NAME` following the pattern:

```
{repo-name}-wt-{index}-{branch}
```

For example: `myapp-wt-1-feature-auth`, `myapp-wt-2-fix-billing`.

This means each worktree has completely separate:
- **Containers** — `myapp-wt-1-feature-auth-postgres-1`, etc.
- **Networks** — `myapp-wt-1-feature-auth_default`
- **Volumes** — `myapp-wt-1-feature-auth_pg-data`

Nothing is shared between worktrees.

### 5. File Sync

Before starting a worktree's stack, wtc copies infrastructure files from main into the worktree:

- The compose file itself
- Every Dockerfile referenced in `build.dockerfile` fields
- `.env` (or `.env.example` if `.env` doesn't exist)

This ensures the worktree always has the latest Docker setup, even if the worktree's branch doesn't have recent infrastructure changes.

### 6. Env Injection

After copying `.env`, wtc appends a clearly delimited block with the allocated port overrides:

```bash
# existing .env content stays untouched...
OPENAI_API_KEY=sk-...
DATABASE_URL=...

# --- wtc port overrides ---
POSTGRES_PORT=25435
REDIS_PORT=26381
BACKEND_PORT=28001
FRONTEND_PORT=25174
# --- end wtc ---
```

This is **idempotent** — running `wtc start` again strips the old block and writes a fresh one.

## Commands

### `wtc start [indices...]`

Start Docker Compose stacks for worktrees.

```bash
npx wtc start         # start ALL worktrees
npx wtc start 1       # start worktree 1 only
npx wtc start 1 2 3   # start worktrees 1, 2, and 3
```

**What it does for each worktree:**

1. Syncs the compose file and Dockerfiles from main
2. Copies `.env` and injects port overrides
3. Runs `docker compose up -d --build` with the worktree's unique project name

**Output:**

```
=== Worktree 1: feature-auth ===
ℹ Path:    /Users/you/myapp-feature-auth
ℹ Project: myapp-wt-1-feature-auth
ℹ Ports:   POSTGRES_PORT=25435 REDIS_PORT=26381 BACKEND_PORT=28001 FRONTEND_PORT=25174
✔ Synced infrastructure files
✔ Injected port overrides into .env
[+] Running 5/5
 ✔ Container myapp-wt-1-feature-auth-postgres-1  Started
 ✔ Container myapp-wt-1-feature-auth-redis-1     Started
 ✔ Container myapp-wt-1-feature-auth-backend-1   Started
 ✔ Container myapp-wt-1-feature-auth-frontend-1  Started
✔ Worktree 1 started
```

After starting, it prints a table of all worktrees with their URLs.

### `wtc stop [indices...]`

Stop Docker Compose stacks for worktrees.

```bash
npx wtc stop          # stop ALL worktrees
npx wtc stop 1        # stop worktree 1 only
npx wtc stop 1 2      # stop worktrees 1 and 2
```

Runs `docker compose down` for each target worktree. Data in named volumes is preserved — only containers and networks are removed.

### `wtc restart [indices...]`

Stop and then start worktrees. This is a full restart: re-syncs files, re-injects env vars, and rebuilds containers.

```bash
npx wtc restart       # restart ALL worktrees
npx wtc restart 1     # restart worktree 1 only
npx wtc restart 1 2   # restart worktrees 1 and 2
```

**When to use restart:**
- An agent wrote a database migration that needs to run on startup
- Dockerfiles were changed and containers need rebuilding
- The compose file was modified
- `.env` values in main changed and need to be re-synced

### `wtc list` / `wtc ls`

Show all worktrees with their branch, status (up/down), URLs, and port assignments.

```bash
npx wtc list
```

**Output:**

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

- **Index** — the number you pass to other commands (`wtc start 1`, `wtc promote 2`)
- **Branch** — the git branch checked out in that worktree
- **Status** — whether Docker containers are currently running
- **URL** — the frontend URL (auto-detected from services named `frontend`, `web`, `app`, or `ui`)
- **Ports** — all allocated ports for that worktree

### `wtc promote <index>`

Copy all changed files from a worktree into your current branch as uncommitted changes.

```bash
npx wtc promote 1
```

**What it does:**

1. Finds the divergence point between your current branch and the worktree's branch (`git merge-base`)
2. Collects all files that changed in the worktree (committed, uncommitted, and untracked)
3. **Safety check** — aborts if any of those files have uncommitted changes in your current branch (prevents overwriting your work)
4. Copies changed files into your repo (or deletes files that were removed in the worktree)
5. Leaves everything as uncommitted changes so you can review before committing

**What it excludes automatically:**
- `.env` — this was injected by wtc, not authored by the agent
- `docker-compose.yml` / `compose.yml` — synced from main, not a real change

**Output:**

```
ℹ Promoting worktree 1 (feature-auth) into main
✔ Promoted 12 file(s). Changes are uncommitted in main.
  src/auth/login.ts
  src/auth/session.ts
  src/middleware/auth.ts
  ...
```

**If there's a conflict:**

```
✖ Abort: the following files have uncommitted changes and would be overwritten:
  src/auth/login.ts

Commit or stash your local changes first, then re-run promote.
```

### `wtc clean`

Stop all worktree containers, remove all worktrees (except your current one), and prune stale Docker resources.

```bash
npx wtc clean
```

**What it does:**

1. For each non-main worktree:
   - Stops its Docker Compose stack (`docker compose down`)
   - Removes the git worktree (`git worktree remove --force`)
2. Prunes stale git worktree references (`git worktree prune`)
3. Removes any orphaned Docker containers, networks, and volumes matching the `*-wt-*` pattern

**Output:**

```
ℹ Stopping containers for myapp-wt-1-feature-auth...
ℹ Removing worktree: /Users/you/myapp-feature-auth
ℹ Stopping containers for myapp-wt-2-fix-billing...
ℹ Removing worktree: /Users/you/myapp-fix-billing
✔ Cleanup complete.
```

### `wtc mcp`

Start the MCP (Model Context Protocol) server. This is not meant to be run manually — it's used by AI agents. See the [MCP Server](#mcp-server) section below.

## Preparing Your docker-compose.yml

For `wtc` to isolate a service's port, the host port must use the `${VAR:-default}` pattern:

```yaml
# wtc CAN isolate this (env var pattern)
ports:
  - "${BACKEND_PORT:-8000}:8000"

# wtc CANNOT isolate this (hardcoded number)
ports:
  - "8080:8080"
```

If `wtc` finds hardcoded ports, it warns you and suggests the fix:

```
⚠ Service "nginx" uses a raw port mapping (8080:80).
  To enable port isolation, change it to: "${NGINX_PORT:-8080}:80"
```

### Supported port formats

`wtc` handles all common Docker Compose port syntaxes:

```yaml
# Standard — most common
- "${BACKEND_PORT:-8000}:8000"

# Same var for host and container (when the app reads the port from env)
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

## Configuration (Optional)

`wtc` works zero-config out of the box. For project-specific needs, create a `.wtcrc.json` in your repo root:

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

Config is looked for in this order:
1. `.wtcrc.json` in repo root
2. `"wtc"` key in `package.json`
3. No config (zero-config defaults)

### `sync`

Extra files or directories to copy from main into each worktree on every start.

**Why this exists:** Git worktrees check out a branch's files, but the branch may not have the latest infrastructure files (migration configs, seed scripts, etc.). This setting ensures every worktree gets fresh copies of these files from main.

**Example:** Your backend uses Alembic for database migrations. The migration files live in `backend/alembic/` and the config in `backend/alembic.ini`. Without syncing these, a worktree on an older branch would have outdated migration files.

```json
{
  "sync": [
    "backend/alembic",
    "backend/alembic.ini"
  ]
}
```

Both files and directories are supported. Directories are copied recursively.

### `envOverrides`

Additional environment variables to inject into each worktree's `.env`. Supports `${VAR}` interpolation with the allocated port values.

**Why this exists:** Some env vars depend on allocated ports. For example, a frontend might need `VITE_API_URL` pointing to the backend's allocated port. Since `wtc` assigns different backend ports per worktree, this URL must be derived dynamically.

```json
{
  "envOverrides": {
    "VITE_API_URL": "http://localhost:${BACKEND_PORT}",
    "VITE_WS_URL": "ws://localhost:${BACKEND_PORT}/ws"
  }
}
```

With worktree 1 getting `BACKEND_PORT=28001`, this produces:

```bash
VITE_API_URL=http://localhost:28001
VITE_WS_URL=ws://localhost:28001/ws
```

You can reference any env var that `wtc` allocates (any `${VAR:-default}` port pattern found in your compose file).

## MCP Server

`wtc` ships a built-in [MCP](https://modelcontextprotocol.io/) server so AI agents can manage their worktree's Docker stack programmatically — without shelling out to the CLI.

### Why

When an AI agent is working in a worktree and makes changes that need a container restart (like adding a database migration), it needs a way to restart its stack. The MCP server exposes all `wtc` commands as tools that agents can call directly.

### Setup

The MCP server uses stdio transport. Configure it in your agent's MCP settings:

**Claude Code** (`.claude/settings.json` or `.claude/settings.local.json`):

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

### Available Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `wtc_start` | `indices?: number[]` | Start worktree stacks. Pass specific indices or omit for all. |
| `wtc_stop` | `indices?: number[]` | Stop worktree stacks. Pass specific indices or omit for all. |
| `wtc_restart` | `indices?: number[]` | Restart worktree stacks. Use after DB migrations, Dockerfile changes, or config updates that require fresh containers. |
| `wtc_list` | none | List all worktrees with branch, status (up/down), ports, and URLs. Returns structured JSON. |
| `wtc_promote` | `index: number` | Copy changed files from a worktree into the current branch as uncommitted changes. |
| `wtc_clean` | none | Stop all containers, remove all worktrees, prune stale Docker resources. |

### Agent Workflow Example

1. **Human** creates worktrees and runs `npx wtc start`
2. **Agents** are spawned in separate worktrees, each with its own isolated stack
3. An agent writes a database migration, then calls `wtc_restart` with its worktree index — containers restart, the migration runs on startup
4. The agent verifies the migration worked by hitting its own backend URL
5. **Human** opens each worktree's frontend URL, compares the results side by side
6. **Human** runs `npx wtc promote 1` to pull the best agent's changes into main
7. **Human** runs `npx wtc clean` to tear everything down

## Full Example Walkthrough

Here's a complete end-to-end example with a typical web app:

```bash
# You have a repo with docker-compose.yml containing postgres, redis, backend, frontend
cd myapp

# Install wtc
pnpm add -D worktree-compose

# Create branches for two AI agents to work on
git branch agent-1-auth
git branch agent-2-auth

# Create worktrees
git worktree add ../myapp-agent-1 agent-1-auth
git worktree add ../myapp-agent-2 agent-2-auth

# Start both stacks
npx wtc start

# Output shows:
# Worktree 1 (agent-1-auth): backend:28001 frontend:25174
# Worktree 2 (agent-2-auth): backend:28002 frontend:25175

# Point each agent at its worktree directory
# Agent 1 works in ../myapp-agent-1
# Agent 2 works in ../myapp-agent-2

# Check status anytime
npx wtc list

# Compare frontends side by side
# http://localhost:25174  (agent 1)
# http://localhost:25175  (agent 2)

# Agent 1 did a better job — promote its changes
npx wtc promote 1

# Review the changes
git diff

# Commit if happy
git add -A && git commit -m "feat: add auth (from agent 1)"

# Clean up
npx wtc clean
```

## Requirements

- **Node.js** >= 18
- **Git** with worktree support (any modern version)
- **Docker** with Compose v2 (`docker compose`, not the legacy `docker-compose`)
- A `docker-compose.yml` with `${VAR:-default}` port patterns for any service you want isolated

## Troubleshooting

### "No compose file found"

`wtc` looks for compose files in the git repo root (found via `git rev-parse --show-toplevel`), not the current directory. Make sure your compose file is in the repo root and named one of: `compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`.

### "No extra worktrees found"

You need to create git worktrees before using `wtc`. Create them with:

```bash
git worktree add ../my-feature my-feature-branch
```

### Ports not changing

Make sure your compose file uses `${VAR:-default}` for host ports, not hardcoded numbers. `wtc` can only override ports that use env var patterns.

### "Docker daemon not running"

Start Docker Desktop (or the Docker daemon) before running `wtc start`.

### Promote fails with "Not a valid object name detached"

This happened in older versions when a worktree was in detached HEAD state. Update to the latest version — this is now handled correctly.

### Stale containers after manual cleanup

If you manually removed worktrees without running `wtc clean`, orphaned containers may remain. Run `wtc clean` to remove them, or manually:

```bash
docker ps -a --filter "name=-wt-" -q | xargs docker rm -f
```

## License

MIT
