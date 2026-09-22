---
name: hit
description: Work the next node on the hit list under its contract — respecting write scope, budget, and acceptance command.
disable-model-invocation: true
argument-hint: [hit-id] [node-id]
allowed-tools: Read Edit Write Grep Glob Bash(git *) Bash(capo *) Bash(cat .capo/*)
---

## Contract
- Board: !`capo board 2>&1`
- Next runnable: !`capo hit next $0 2>&1`
- Working tree: !`git status --short`

Work node $ARGUMENTS. If only a hit id was given, take the node `capo hit next` printed.

Sequence, no shortcuts:

1. `capo hit start <hit> <node>` — it prints the status line. Open your reply with it.
2. `capo books bind <each glob in write_scope>` — quote every ruling it returns that constrains
   this node. If a ruling blocks the goal, stop and raise it; do not route around it.
3. Edit only inside `write_scope`. Anything else is a **deviation**:
   `capo hit deviation <hit> <node> --note "<what you need | why | what breaks without it>"`,
   then stop and wait for the Capo.
4. `capo hit done <hit> <node>` — it checks scope against the real tree, runs `accept`, and
   records the verdict. Exit code is the verdict; your judgement is not. Paste its output.
5. On failure: diagnose once, fix once, `capo hit done` again. On the second failure stop and
   report — the ledger already holds both attempts.
6. Run `/loyalty-check` on your own diff before you report done.
7. Report: what changed, what `accept` said, what you did not do and why.
