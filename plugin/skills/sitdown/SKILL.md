---
name: sitdown
description: Call a sit-down — plan a piece of work into a contract-bound hit list at .capo/hits/<id>.yaml. No code is edited during a sit-down.
disable-model-invocation: true
argument-hint: [what the family is taking on]
allowed-tools: Read Write Grep Glob Bash(git log *) Bash(git status *) Bash(mkdir -p .capo/hits) Bash(cat .capo/*) Bash(capo *)
effort: high
---

## Repo state
- Branch / dirty files: !`git status --short --branch`
- Recent history: !`git log --oneline -15`
- Existing rulings: !`cat .capo/books.md 2>/dev/null || echo "(no Books yet)"`
- Open hits: !`ls .capo/hits/ 2>/dev/null || echo "(none)"`
- Board: !`capo board 2>/dev/null || echo "(no board yet)"`
- Rulings up for appeal: !`capo books appeal 2>/dev/null || echo "(no ledger yet)"`

## The sit-down

Target: $ARGUMENTS

Rules: read before you speak, no edits, no code. ultrathink.

1. **Read the ground.** Name the files that actually matter and why. If you cannot name them,
   explore first and say what you found.
2. **Surface the assumptions.** List the three assumptions that, if wrong, sink this plan.
   Say how each would be cheaply falsified.
3. **Cut the hit list.** Nodes small enough that one failure costs under an hour. For each node:

```yaml
- id: h1
  goal: <one sentence, verifiable>
  depends_on: []
  write_scope: ["src/auth/**"]
  forbidden: ["migrations/**", "**/*.lock"]
  accept: "pytest tests/auth -q"      # must exit 0
  budget: 25                           # max tool calls
  rollback: "git revert <sha>"
  soldier: refactor | test | research | security | docs
```

4. **Name the risk.** One node is the dangerous one. Say which, and what the blast radius is.
5. **Write the file** to `.capo/hits/<slug>.yaml` (create `.capo/hits/` if missing) with the
   top-level shape `id`, `title`, `created` (YYYY-MM-DD), `nodes`. Then run
   `capo hit validate <slug>` and fix every error it prints — an invalid contract is not a plan.
6. `capo ledger append --kind sitdown_open <slug> --payload '{"nodes":<n>}'`, print the path,
   then **stop**. Show the list and wait. Do not start work in the same turn.

If any node lacks a machine-checkable `accept`, either split it until it has one, or mark it
`human_verify: true` and state exactly what the Capo has to look at.
