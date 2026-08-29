# Legacy Modernizer — Modernization Spec

Track evidence document for the COMPASS modernization workflow.

## Quality gates

1. **Characterization tests first** — no production changes until baseline `mvn test` is green
2. **Cursor rules + CLAUDE.md** — no new dependencies, no migration edits, no public API changes
3. **Off-limits hook** — `preToolUse` blocks edits to controllers, DTOs, migrations
4. **Checkpoint/rewind** — git tags `lm-checkpoint-<sessionId>-<n>` for recovery

## Hard constraints

- No new dependencies (version bumps and direct replacements only)
- Do not touch migrations (flyway, liquibase, db/migration)
- Do not change public API (controllers, DTOs, URL paths)
- No behavioral improvements — if tests fail, refactor is wrong
- One component batch at a time

## Phase 1 status

- [x] Static Maven scanner
- [x] Assessment report UI
- [x] Safety file seeding into sandbox
- [x] Off-limits hook + guard CLI
- [x] Checkpoint/rewind API
- [x] Mock modernization
- [ ] Characterization test generation (Phase 2)
- [ ] Real agent refactors (Phase 2)
- [ ] GitHub MCP publish (Phase 3)

## Metrics (Phase 4)

_To be captured after Phase 2 refactors:_

- Cyclomatic complexity before/after
- Test coverage: ~0% → target N%
- Time-to-understand for new joiner

## Rejected diff log

_Phase 2: document at least one rejected agent diff where behavior was incorrectly changed._
