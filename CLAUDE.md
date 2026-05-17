# OpenClaw Railway Template

One-click Railway deployment template for OpenClaw — an Express wrapper server that proxies traffic to an internal OpenClaw gateway, with a browser-based setup wizard.

## Tech Stack

- **Runtime:** Node.js >= 22, ES Modules (`"type": "module"`)
- **Framework:** Express 5 (`express@^5.1.0`)
- **Proxy:** `http-proxy` for HTTP + WebSocket proxying
- **Test Runner:** Node.js native test runner (`node --test`)
- **Assertions:** `node:assert/strict`
- **Container:** Multi-stage Dockerfile (build OpenClaw from source → slim runtime)
- **Deployment:** Railway with persistent volume at `/data`
- **Process Manager:** `tini` (PID 1 zombie reaper)
- **No TypeScript, no bundler, no linter beyond `node -c`**

## Project Structure

```
src/server.js          # Main Express wrapper + gateway proxy (single-file server)
src/setup-app.js       # Browser-side setup wizard UI (vanilla JS)
test/*.test.js         # Unit tests (Node native test runner)
scripts/               # Utility scripts (bump refs, smoke test)
Dockerfile             # Multi-stage: openclaw-build → runtime
railway.toml           # Railway deployment manifest
```

## Commands

```bash
npm run dev            # Start the wrapper server locally
npm test               # Run all tests (node --test)
npm run lint           # Syntax-check src/server.js (node -c)
npm run smoke          # Container sanity check (requires built image)
```

## Architecture

**Request flow:** Client → Express wrapper (PORT) → HTTP proxy → OpenClaw gateway (127.0.0.1:18789)

- `/healthz` — Public health check (no auth)
- `/setup/healthz` — Railway healthcheck endpoint
- `/setup/*` — Setup wizard UI + API (protected by `SETUP_PASSWORD` via HTTP Basic auth)
- All other routes — Proxied to the internal gateway with token injection

**Key patterns:**
- Gateway token auto-generated on first boot, persisted to `gateway.token`
- Config stored as `openclaw.json` in state dir (auto-migrated from legacy `clawdbot.json`)
- Bootstrap hook: `/data/workspace/bootstrap.sh` runs on startup if present
- Legacy `CLAWDBOT_*` env vars auto-renamed to `OPENCLAW_*`

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | (Railway-injected) | Public listening port |
| `SETUP_PASSWORD` | (required) | HTTP Basic auth for `/setup` and dashboard |
| `OPENCLAW_STATE_DIR` | `/data/.openclaw` | Config + state persistence |
| `OPENCLAW_WORKSPACE_DIR` | `/data/workspace` | Workspace persistence |
| `OPENCLAW_GATEWAY_TOKEN` | (auto-generated) | Gateway auth token |
| `INTERNAL_GATEWAY_PORT` | `18789` | Internal gateway port |
| `INTERNAL_GATEWAY_HOST` | `127.0.0.1` | Internal gateway bind address |

## Testing Conventions

- Tests use `node:test` and `node:assert/strict` — no external test frameworks
- Since the server can't be imported without starting, tests extract functions via regex from `src/server.js` source text or validate source patterns
- Test files live in `test/` and follow `*.test.js` naming
- Tests are pure unit tests — no HTTP server spun up

## Development Guidelines

- **Single-file server:** All server logic lives in `src/server.js`. Keep it that way.
- **No build step** for wrapper code — it runs directly with `node src/server.js`
- **ES Modules only** — use `import`/`export`, not `require()`
- **Express 5** — note async error handling and different API from Express 4
- **Console logging** — prefix with `[wrapper]`, `[gateway]`, `[setup]` etc.
- **Security:** Always redact secrets in debug output. Validate device IDs to prevent path traversal.
- PRs should be small and focused (one fix per PR)
- Run `npm run lint && npm test` before submitting

## Dockerfile Notes

- **Stage 1 (openclaw-build):** Clones OpenClaw at pinned `OPENCLAW_GIT_REF`, builds with pnpm + Bun
- **Stage 2 (runtime):** Slim image with Node 22, tini, pnpm. No default PORT (Railway injects it)
- The `openclaw` CLI is a shell wrapper at `/usr/local/bin/openclaw` calling `node /openclaw/dist/entry.js`
- npm/pnpm install prefixes target `/data` for persistence across Railway restarts

## CI/CD

- `docker-build.yml` — Builds Docker image on push/PR (compile check only, no push)
- `bump-openclaw-ref.yml` — Daily cron checks for new OpenClaw releases, auto-creates PR

## Commit Style

Conventional commits: `fix:`, `feat:`, `docs:`, `chore:`, etc. with scope in parens when relevant (e.g., `fix(proxy):`, `fix(wrapper):`).
