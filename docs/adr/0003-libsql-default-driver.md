# 0003. libSQL as the default Drizzle driver

## Status
Accepted

## Context
The `drizzle` recipe needs a default database driver that works out of the box in three
very different execution environments: the developer's desktop, a GitHub Actions "forge"
runner, and (later) a mobile-triggered scaffold with no persistent infrastructure. Candidates:
- `better-sqlite3`: native bindings (node-gyp); prebuilt binaries commonly lag the newest
  Node major, and CI/desktop toolchain drift causes install failures.
- `pg`: requires a running Postgres instance — no zero-config story, and directly
  conflicts with the "zero budget for paid/hosted services" constraint.
- `@libsql/client`: pure-JS-friendly client for SQLite/libSQL with prebuilt binaries that
  track current Node LTS closely; supports a local file (`file:local.db`) with no server,
  and the exact same config can point at a remote Turso database later.

## Decision
Default `drizzleDriver` is `libsql`, writing `drizzle.config.ts` with
`dialect: "sqlite"` and `url: process.env.DATABASE_URL ?? "file:local.db"`. `pg` and
`better-sqlite3` remain typed options in `StackOptions` for a future recipe variant, not
implemented in v1.

## Consequences
- `capo compose` produces a project that runs `pnpm db:generate && pnpm db:migrate` and
  has a working database with zero external setup, on the developer's desktop, in a forge
  CI run, or anywhere else Node runs.
- Switching to a hosted database later is a one-line env var change, not a driver rewrite.
- If a user's stack genuinely needs Postgres semantics, that's a deliberate future addition,
  not something v1 silently gets wrong by picking a driver that fails to install.
