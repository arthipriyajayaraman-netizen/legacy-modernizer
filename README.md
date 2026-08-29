# Legacy Modernizer

AI-assisted Java/Maven repository modernization tool.

## Phase 1 features

- Connect to a public GitHub repo and shallow-clone into a sandbox
- Static Maven scan (Java version, Spring Boot, JUnit, logging)
- Assessment report with risks and recommended modernization order
- Safety scaffolding seeded into clone: `CLAUDE.md`, Cursor rules, off-limits hook
- Mock modernization with file change stats
- Checkpoint/rewind API stubs for sandbox git recovery
- Step 3 publish UI (mock until Phase 3 GitHub MCP)

## Quick start

```bash
cd C:\Users\107734\Documents\legacy-modernizer
copy .env.example .env
npm install
npm start
```

Open http://localhost:3000

Default demo repo: `CMOD-Lab/ResortsLite_ma` (Java 8 + Spring Boot 2.7.18)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Run server |
| `npm run dev` | Run with nodemon |
| `npm run guard -- <path>` | Check if path is off-limits |
| `npm run test:hook` | Verify off-limits hook denies Controller edits |

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Clone repo, scan, return sessionId |
| GET | `/api/sessions/:id/status` | Poll session status |
| GET | `/api/sessions/:id/assessment` | Full assessment report |
| POST | `/api/sessions/:id/checkpoint` | Create git checkpoint tag |
| POST | `/api/sessions/:id/rewind` | Rewind sandbox to checkpoint |
| POST | `/api/sessions/:id/modernize` | Mock apply selected components |

## Safety infrastructure

Every cloned repo receives:

- `CLAUDE.md` — agent constraints (no new deps, no API changes, no migrations)
- `.cursor/rules/modernization-constraints.mdc`
- `.cursor/hooks.json` + `block-off-limits.js` — blocks Controller/DTO/migration edits

## Phase 2 (planned)

- Characterization tests before any change
- Real agent refactors via Cursor SDK
- Test gate (`mvn test` must stay green)
- Diff viewer + rewind on failure

## Phase 3 (planned)

- GitHub MCP via `ghcr.io/github/github-mcp-server` (Docker)
- Requires `GITHUB_PERSONAL_ACCESS_TOKEN` and Docker Desktop
