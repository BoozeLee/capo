# 0006. The family kernel ships in TypeScript inside this monorepo

## Status
Accepted (v0.1)

## Context
`capofiles/capo-blueprint.md` describes a second Capo product — a ledger-backed agentic
coding OS (sit-downs, contract-bound hits, the Books) — and recommends a Rust kernel
(ratatui/tokio/rusqlite/git2). This repo is the mafia-themed dev-stack scaffolder
(`@capo/core`, `@capo/engine`, Ink CLI). Same name, same theme, different product.
The blueprint's own roadmap says: ship the Claude Code plugin first, and treat the
week-2 replay experiment as the go/no-go for the ledger thesis before writing Rust.

## Decision
- The plugin lives at `plugin/` in this repo and is the source of truth; `plugin/install.sh`
  drops it into `~/.claude` per the plugin README.
- The v0.1 kernel is `@capo/kernel`, a TypeScript workspace package using the same
  idioms as `@capo/core` (zod schemas, `Result<T,E>`, vitest, biome). The `capo` CLI
  exposes it as `ledger` / `board` / `hit` / `books` / `context` / `rewind` / `replay`.
- Rust is deferred until `capo replay` shows ≥ 40% context-token reduction on real
  sessions (blueprint §5.1). Under 20% → cut D1, keep D2 + D3.

## Consequences
- One repo, one CI, one `capo` binary for both products; the scaffolder's `plan`/`compose`
  and the family's rituals do not share code paths.
- The 12 ms cold-start goal is not met by Node; acceptable for a plugin-driven v0.1
  where the model turn dominates latency.
- If the replay experiment passes, the Rust kernel must read the same `.capo/` files —
  the on-disk formats in `@capo/kernel` are the contract, not the TypeScript.
