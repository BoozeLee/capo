---
name: hit
description: Work the next node on the hit list under its contract — respecting write scope, budget, and acceptance command.
disable-model-invocation: true
argument-hint: [hit-file] [node-id]
allowed-tools: Read Edit Grep Glob Bash(git *) Bash(cat .capo/*)
---

## Contract
- Hit list: !`ls .capo/hits/`
- Books: !`cat .capo/books.md 2>/dev/null || echo "(no Books yet)"`
- Working tree: !`git status --short`

Work node $ARGUMENTS.

Sequence, no shortcuts:

1. Print the status line: `[hit <id>/<node> | scope | accept | budget 0/<max>]`.
2. Read every ruling in the Books whose `binds` matches a file in `write_scope`. Quote the ones
   that constrain this node. If a ruling blocks the goal, stop and raise it — do not route around it.
3. Edit only inside `write_scope`. Anything else is a **deviation**: stop, state it in one line,
   wait.
4. Run `accept`. Paste the real output. Exit code is the verdict; your judgement is not.
5. On failure: diagnose once, fix once, re-run. On the second failure, stop and report. Do not
   grind the budget down on the same wall.
6. Run `/loyalty-check` on your own diff before you report done.
7. Append to `.capo/ledger.jsonl`:
   `{"ts":"<iso>","hit":"<id>","node":"<n>","event":"done|deviation|failed","accept_exit":<n>,"files":[...],"note":"<one line>"}`
8. Report: what changed, what the acceptance command said, what you did not do and why.
