# 0001. pnpm workspace monorepo

## Status
Accepted

## Context
capo is growing from a single CLI package into a CLI, an isomorphic domain-logic
package (`@capo/core`), a Node execution package (`@capo/engine`), a Tauri desktop/Android
app, and a GitHub Actions "forge" template repo's contents. These need to share code
(the tech catalog, resolver, planner, and progress event types must be identical between
the CLI and the desktop webview) without publishing intermediate packages to npm.

## Decision
Use a single pnpm workspace (`pnpm-workspace.yaml`: `packages/*`, `apps/*`) in one git
repository. `@capo/core` and `@capo/engine` are workspace-only packages (`"private": true`,
consumed via `workspace:*`), never published independently.

## Consequences
- One lockfile, one CI matrix, atomic cross-package commits (a change to `@capo/core`'s
  types and its consumers lands in one PR).
- pnpm chosen over npm/yarn workspaces: strict dependency isolation (no phantom
  dependencies), and it's what the desktop app's Tauri tooling documents natively.
- `forge/` is a plain directory (not a workspace package) — its contents get pushed to a
  separate `capo-forge` template repo; it doesn't build as part of this workspace.
