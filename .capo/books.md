# Books

## One executor: the desktop app shells out to the built CLI
- binds: packages/engine/**, apps/**
- because: a second Rust-native executor would drift from the TypeScript step semantics (ADR 0002)
- evidence: docs/adr/0002-single-executor-via-cli-subprocess.md
- overturn-if: a step kind cannot be expressed as a subprocess call, or Node stops being a prerequisite
- date: 2026-09-21

## libSQL is the default Drizzle driver
- binds: packages/core/src/recipes/drizzle.ts, packages/core/src/types/stack.ts
- because: better-sqlite3 needs node-gyp and pg needs a server; libsql runs anywhere Node does (ADR 0003)
- evidence: docs/adr/0003-libsql-default-driver.md
- overturn-if: a stack needs Postgres semantics that libsql cannot fake
- date: 2026-09-21

## The forge dispatch carries a selection, never a plan
- binds: forge/**, packages/core/src/planner/**
- because: workflow_dispatch inputs cap at 65535 chars and leak into run logs (ADR 0004)
- evidence: docs/adr/0004-forge-sends-selection-not-plan.md
- overturn-if: dispatch moves to repository_dispatch with an artifact upload
- date: 2026-09-21
