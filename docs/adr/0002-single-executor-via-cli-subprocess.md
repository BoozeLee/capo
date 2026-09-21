# 0002. One executor: desktop shells out to the built CLI

## Status
Accepted

## Context
The scaffold engine (`@capo/engine`'s `NodeExecutor`) needs to run in two hosts: the CLI
(plain Node) and the Tauri desktop app (a Rust host with a webview frontend). A tempting
design is a second, Rust-native executor that reimplements each step kind
(`run`/`writeFile`/`appendFile`/`patchJson`/`mkdir`) so the desktop app never shells out.

## Decision
There is exactly **one** executor implementation, in TypeScript, in `@capo/engine`. The
desktop app bundles the built CLI (`capo.cjs`, a single-file esbuild/tsup bundle) as a
Tauri resource and runs it as a subprocess:
`node capo.cjs compose --from-plan <tmp>/plan.json --json --gotommyguns`. A Rust command
(`run_plan`) spawns it via `tauri-plugin-shell`, reads NDJSON `ScaffoldEvent` lines from
stdout, and re-emits them as Tauri events (`capo://event/{run_id}`) for the webview.

## Consequences
- No duplicated step semantics, no risk of the two executors drifting (e.g. one honoring
  `ifExists` differently, or JSON deep-merge subtly disagreeing).
- Node becomes a hard runtime prerequisite for desktop scaffolding — acceptable, since
  every recipe already shells out to `pnpm`/`npx`-based tools that need Node anyway.
  `detect_toolchain()` surfaces a clear "missing made men" screen when it's absent.
- The webview does **not** get a `shell:allow-execute` capability; only the narrow
  `run_plan`/`cancel_run`/`detect_toolchain` Rust commands are exposed, so the webview can
  never spawn arbitrary commands.
- The webview still imports `@capo/core` directly (not via subprocess) for catalog
  browsing, stack resolution, and plan preview — those are pure and synchronous, no reason
  to round-trip through Node for them.
