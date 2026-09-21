# Capo — Claude Code plugin

Plan-first, contract-bound, ledger-backed coding under family rules.

## Install (project-local, no marketplace)

    ./plugin/install.sh        # symlinks skills+agents into ~/.claude, links `capo` into ~/.local/bin

Or by hand: copy `skills/*` to `~/.claude/skills/`, `agents/*` to `~/.claude/agents/`, and put
`capo` (packages/cli/dist/cli.js) on PATH. The skills call `capo board|hit|books|context`.

As a plugin, commands are namespaced: `/capo:sitdown`, `/capo:hit`, `/capo:books`.
Dropped into `~/.claude/skills/`, they are `/sitdown`, `/hit`, `/loyalty-check`, `/books`.

## Ritual loop

    /sitdown add session expiry to the auth layer   # plan -> .capo/hits/<slug>.yaml
    /hit auth-rework h1                             # execute one node under contract
    /loyalty-check                                  # hostile review of the diff
    /books                                          # commit + record a ruling

`capo` itself loads automatically when the work is multi-file or multi-session, or on
"capo mode". It sets the standing family rules for the session.

## State it writes

    .capo/hits/<slug>.yaml   contract DAG
    .capo/books.md           rulings (git-tracked, human-readable)
    .capo/ledger.jsonl       append-only event log

Commit `.capo/` — that is the point. The Books are the project's case law.

## Notes

- `loyalty-check` runs `context: fork` with `agent: Explore`, so it reviews the diff without
  the reasoning that produced it. That is what makes it adversarial rather than agreeable.
- `sitdown`, `hit` and `books` are `disable-model-invocation: true` — they have side effects
  and timing matters, so you invoke them, not Claude.
- Every `!`command`` block runs before the skill reaches Claude, so plans are grounded in the
  real tree rather than recalled from context.
