# 0004. The forge dispatch carries a selection, not a plan

## Status
Accepted

## Context
The Android "forge" flow lets a phone (which cannot run `npx create-next-app` — there is
no shell) trigger a GitHub Actions workflow that scaffolds a project and pushes it as a new
repo. The naive design sends the app's fully-resolved `ScaffoldPlan` (which embeds literal
file contents for every `writeFile`/`patchJson` step) as the `workflow_dispatch` payload.

`workflow_dispatch` inputs are capped at 25 inputs and **65,535 characters total**, the
REST dispatch call returns HTTP 204 with no run id, and input values are visible in the
run's logs.

## Decision
The phone sends only the **selection**: `{ request_id, name, crew, options, visibility }`
— a few hundred bytes. The forge workflow checks out `capo` itself at a pinned tag
(`CAPO_REF` repo variable) and re-runs `capo compose` there, producing an identical plan
via the same `@capo/core` resolver/planner the phone already validated with.

The dispatched run is located afterward by listing
`GET /actions/runs?event=workflow_dispatch&created=>=<dispatch-time>` and matching
`run.name`, which is set via `run-name: "forge ${{ inputs.name }} [${{ inputs.request_id }}]"`
— `request_id` is a client-generated UUID, so this is race-safe even if the user dispatches
multiple forges close together.

## Consequences
- No 65KB ceiling risk, ever — a selection can never approach that size the way an
  embedded multi-file plan could for a large stack.
- No secrets, tokens, or file contents appear in workflow_dispatch inputs or run logs.
- The forge and the local desktop/CLI path share exactly one planner — there is no second
  "remote plan builder" to keep in sync with `@capo/core`.
- Reproducibility depends on `CAPO_REF` being pinned (not `main`) so a forge run today and
  next month produce the same recipes unless deliberately bumped.
