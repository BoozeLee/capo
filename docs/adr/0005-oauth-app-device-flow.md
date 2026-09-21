# 0005. GitHub auth via OAuth App device flow (v1)

## Status
Accepted (v1 — see "Future" below)

## Context
The desktop and Android apps need to act on the user's GitHub account: check for/create
`capo-forge`, dispatch its workflow, and poll run status. Two standard options:
- **Device flow** (`login/device/code` → `login/oauth/access_token` polling): no client
  secret required, works from a webview/mobile app with no embedded backend, user
  approves via a code shown in-app and entered at `github.com/login/device`.
- **GitHub App** with fine-grained permissions: better least-privilege story
  (`Actions: write`, `Contents: read` scoped to just `capo-forge`), but needs the app to be
  registered with fine-grained per-installation setup and is more moving parts for a v1.

`github.com/login/*` sends no CORS headers, so this cannot be called from the webview's
`fetch` — it must go through a native HTTP client (`tauri-plugin-http`, backed by Rust
`reqwest`).

## Decision
v1 registers one GitHub **OAuth App** with the device flow enabled and requests the `repo`
scope. All device-flow HTTP calls happen in Rust (`tauri-plugin-http`), never from webview
`fetch`. The resulting token is stored via `tauri-plugin-store` in the app's data directory.

## Consequences
- `repo` scope is broader than strictly needed (it grants access to all the user's repos,
  not just `capo-forge`) — acceptable for v1, tracked as a known gap.
- Token storage via `plugin-store` is a plain (if sandboxed) file, not OS keychain-backed;
  acceptable for v1 on both desktop and Android's app-sandboxed storage, with a `keyring`
  crate upgrade noted as future hardening.
- No client secret to protect (device flow doesn't need one), so there's nothing to leak by
  the app being installed on end-user devices.

## Future
Migrate to a **GitHub App** with device flow and fine-grained permissions
(`Actions: write`, `Contents: read`) scoped to the `capo-forge` repository only, once the
forge flow is validated end-to-end and least-privilege matters more than v1 iteration speed.
