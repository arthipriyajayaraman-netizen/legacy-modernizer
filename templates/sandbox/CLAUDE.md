# Legacy Modernizer — Agent Constraints

This repository is being modernized by the Legacy Modernizer agent. Follow these rules strictly.

## Hard constraints

1. **No new dependencies** — Only version bumps and replacements of existing dependencies in `pom.xml`. Do not add new `<dependency>` blocks unless swapping a direct equivalent (e.g. JUnit 4 → JUnit 5 BOM-managed).

2. **Do not touch migrations** — Off-limits paths:
   - `**/db/migration/**`
   - `**/migrations/**`
   - `**/flyway/**`
   - `**/liquibase/**`
   - `schema.sql`, `data.sql`

3. **Do not change the public API** — Off-limits:
   - Request/response shapes
   - URL paths and HTTP methods
   - Method signatures on `*Controller.java`
   - Public DTOs in `dto/` packages
   - Internal private methods may change only as required by the migration

4. **No behavioral improvements** — Modernize syntax and APIs only. If a test fails because behavior changed, the refactor is wrong.

5. **Scope narrowly** — One component batch at a time. No drive-by refactors.

## Workflow

1. Characterization tests must exist and pass before any production code changes.
2. Run `mvn test` after every change batch.
3. Run `npm run guard -- <path>` before editing files outside `pom.xml` and `src/`.
4. If tests fail, stop and report — do not attempt to "fix" behavior.
