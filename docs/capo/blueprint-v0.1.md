# CAPO — Design Blueprint v0.1

*A coding TUI where the transcript is a view, not the state.*

---

## 1. INNOVATION THESIS

Every agentic coding tool shipping today — Claude Code included — stores its working state in a
chat transcript. Plans are prose in the transcript. Progress is messages in the transcript.
Decisions are paragraphs in the transcript. Memory is a file that gets re-read into the
transcript. When the transcript is compacted, truncated, or closed, the state degrades. This is
the single root cause behind context rot, shallow multi-step reliability, weak multi-agent
coordination, and the fact that a tool which has lived in your repo for six months is no better
at it than on day one.

**Capo's thesis: make the transcript a *rendering* of a typed, on-disk, append-only ledger, and
almost every named weakness of 2026 agentic coding tools becomes a solved systems problem rather
than a prompting problem.**

Three consequences fall out immediately:

1. **Work becomes resumable and rewindable at the semantic level.** Not "undo the file edits" —
   rewind to *before the family decided to use the repository pattern*, keep everything after that
   didn't depend on it.
2. **Multi-agent stops being chaotic**, because agents no longer coordinate by summarizing text at
   each other. They coordinate through leased write-scopes and machine-checkable acceptance
   predicates, the way distributed systems have coordinated since the 1980s.
3. **Memory compounds instead of rotting**, because rulings are indexed by the *code they bind*
   (globs, symbols) rather than by embedding similarity, and every ruling carries its own death
   condition.

The mafia frame is not decoration. It encodes the actual control model: a small number of clearly
ranked roles, explicit contracts, loyalty checks, and a boss who can always call everyone into a
room. It is the most legible organizational metaphor available for hierarchical agency under human
authority — and it happens to be fun.

---

## 2. KEY INSIGHTS & ASSUMPTION SHATTERING

**A1. "Chat is the right primary interface." — FALSE.**
Chat is the right interface for *negotiating intent*, which is maybe 10% of a coding session. The
other 90% is supervision: what is running, what did it touch, what broke, what is it about to do.
That is an operations console, not a conversation. Capo's home screen is a board; chat is a modal
overlay you summon (`:sit`) when intent needs negotiating.

**A2. "The transcript is the state." — FALSE and expensive.**
State is `.capo/`: an append-only `ledger.jsonl`, a materialized board, hit-list YAML, and the
Books. The LLM context is reconstructed *from* state per turn, at whatever fidelity the task needs.
Compaction stops being a loss event and becomes a rendering choice.

**A3. "Memory is a vector store." — FALSE.**
Codebase memory is **case law**, not documents. A ruling has: what it binds (globs/symbols), the
situation that forced it, its evidence (sha, test, file:line), and its `overturn-if` condition.
Retrieval is a lookup — "which rulings bind `src/auth/**`?" — not a similarity search. Rulings can
be overturned, and overturned rulings stay in the record marked as such. Memory that cannot die
becomes dogma; dogma is a slower, more confident form of rot.

**A4. "A plan is a markdown checklist." — FALSE.**
A plan is a DAG of nodes, each carrying a *contract*: goal, `write_scope`, `forbidden`, `accept`
(a shell command that must exit 0), `budget`, `rollback`, assigned soldier. A checklist item can be
marked done by an optimistic model. A contract cannot — exit code 0 or it isn't done.

**A5. "The human approves diffs." — Wrong control surface.**
Reviewing every diff doesn't scale past two parallel agents and trains you to rubber-stamp. Capo
inverts it: the human approves *contracts* at the sit-down, then supervises *deviations*. A soldier
that wants to touch a file outside its scope, exceed budget, or contradict a ruling must raise. The
default is: keep working. The exception is: the Capo's attention.

**A6. "Self-critique is a prompt that says 'now critique yourself'." — Theatre.**
Critique needs an adversary with a different context and a scoring rubric. The Rat and the
`loyalty-check` fork see the diff and the contract, not the reasoning that produced it. They are
graded on findings that the acceptance command later confirms.

**A7. "Failures should be retried." — Waste.**
Anti-fragility means every failure leaves an artifact: a regression test, or a ruling. A project
that has run Capo for three months should measure *fewer tokens per completed hit* than in month
one. That metric is the whole product.

---

## 3. CHALLENGE DECONSTRUCTION

| Pain | Root cause | Capo's structural answer |
|---|---|---|
| Context rot | Transcript-as-state; compaction is lossy | Ledger-as-state; context is rendered per turn from typed events |
| Shallow planning | Plans are prose, unenforceable | Contract DAG with `accept` predicates in repo |
| Multi-agent chaos | Agents coordinate via text summaries | Write-scope leases + predicate-gated merges |
| Long-running state loss | State dies with the process | `capod` daemon; TUI/phone/editor are thin clients |
| Weak recovery | Retry loop with no memory | Every failure emits a test or a ruling |
| Memory rot | Undifferentiated accumulation, similarity retrieval | Rulings bound to code paths, with `overturn-if` |
| Chat-wrapper UX | Linear scroll, no addressable state | Spatial board; every pane single-key addressable |
| No cost control | Unbounded token spend per task | Per-node budgets; tiered routing; local dry-run first |
| Rubber-stamp review | Human sees everything, so sees nothing | Deviation feed; human sees only exceptions |

---

## 4. EXPLORATION MATRIX

Seven distinct directions for the core. Scored 1–5 (Risk is inverted: 5 = low risk).

| # | Direction | Core idea | Novelty | Delight | Feasibility | Leverage | Vision | Risk⁻¹ | New Ground | Σ |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | **Ledger-Kernel** | Event-sourced state; TUI and LLM context are both views | 5 | 4 | 4 | 5 | 5 | 4 | 5 | **32** |
| D2 | **Contract Ring** | Leased write-scopes + `accept` predicates gate every merge | 4 | 4 | 5 | 5 | 4 | 4 | 4 | **30** |
| D3 | **The Books as case law** | Rulings bound to globs/symbols, with overturn conditions | 5 | 4 | 4 | 5 | 5 | 4 | 5 | **32** |
| D4 | **The Table (spatial TUI)** | Board-first ops console; chat is a modal overlay | 3 | 5 | 4 | 4 | 4 | 4 | 3 | **27** |
| D5 | **The Dry Run** | Shadow worktree + local model produces plan skeleton + risk map before frontier spend | 4 | 3 | 3 | 4 | 4 | 3 | 4 | **25** |
| D6 | **The Rat (structured adversary)** | Scored adversarial review, graded against later acceptance outcomes | 3 | 4 | 4 | 3 | 3 | 4 | 3 | **24** |
| D7 | **The Family as daemon** | `capod` runs headless; TUI/SSH/editor are clients; work survives terminal death | 3 | 5 | 3 | 5 | 5 | 3 | 3 | **27** |

**Selection: D1 + D2 + D3 are the core** (they are mutually reinforcing — the ledger makes
contracts auditable, contracts generate the evidence that makes rulings trustworthy). **D4 is the
surface** they're delivered through. D5, D6, D7 are v0.5–v1.0.

---

## 5. DEEP DIVE — SELECTED PATHS

### 5.1 D1 — The Ledger-Kernel

**Why it's new ground.** No shipping agentic coding tool treats its own state as an event log.
Everyone treats the conversation as the record and the filesystem as the output. Capo treats the
event log as the record, the filesystem as a *materialized view*, and the conversation as a
rendering.

**Event schema** (`.capo/ledger.jsonl`, one object per line, append-only):

```jsonc
{"seq": 412, "ts": "2026-09-21T10:14:03Z", "actor": "soldier:refactor",
 "kind": "node_done",            // sitdown_open | node_start | edit | deviation |
                                 // accept_run | node_done | ruling_added | override
 "hit": "auth-rework", "node": "h3",
 "payload": {"files": ["src/auth/session.py"], "accept_exit": 0, "tokens": 18422},
 "parent": 409, "sig": "blake3:…"}
```

`parent` makes the log a DAG, not a line. That is what enables **semantic rewind**: `:rewind 409`
replays every event whose ancestry excludes the branch you're cutting, leaving unrelated work
intact. File state is reconstructed from git; decision state from the ledger.

**Context rendering.** Each turn, the kernel builds the model's context from: the active node's
contract, the rulings bound to its `write_scope`, the last *N* events on this node's branch, and
the file slices the contract names. Nothing else. Context size becomes a *function of the
contract*, not a function of how long you've been talking. This is the single biggest measurable
difference from Claude Code.

**Key interface (Rust):**

```rust
pub trait Kernel {
    fn append(&self, e: Event) -> Result<Seq>;
    fn board(&self, at: Option<Seq>) -> Board;            // materialized view
    fn render_context(&self, node: &NodeId, budget: Tokens) -> Context;
    fn rewind(&self, to: Seq, strategy: RewindStrategy) -> Result<Board>;
    fn bindings(&self, scope: &[Glob]) -> Vec<Ruling>;    // the Books lookup
}
```

**Validation experiment (week 2):** replay a real 40-turn Claude Code session through the kernel.
Measure tokens-per-completed-task under ledger rendering vs. transcript+compaction. Target: ≥40%
reduction with no drop in acceptance pass rate. If it's under 20%, D1 is ceremony and should be cut.

---

### 5.2 D2 — The Contract Ring

**Why it's new ground.** Current multi-agent coding is orchestrator-worker with natural-language
handoff: the subagent writes a summary, the orchestrator believes it. Capo replaces belief with
verification and replaces coordination-by-prose with coordination-by-lease.

**Three mechanisms:**

1. **Write-scope leases.** A soldier acquires a lease on globs before editing. Overlapping leases
   serialize. Non-overlapping soldiers run truly parallel in separate git worktrees. No merge
   conflicts by construction, because no two agents hold the same paths.
2. **Acceptance predicates.** `accept` is a shell command. The Underboss runs it in the real tree
   after merge. Exit 0 or the node reverts. A soldier's self-report has zero authority. This alone
   kills the most common agentic failure: confident completion of work that doesn't run.
3. **Budgets and deviations.** Every node carries a tool-call budget. Exhaustion is not an error —
   it's a deviation raised to the Capo with state intact. A soldier that hits a wall twice stops
   rather than grinding.

**The Capo's control surface is the deviation feed**, a single pane:

```
⚠ h3 refactor  wants  migrations/0042_session.sql   (outside scope)
   why: session table needs a nullable column for the new flow
   [a]llow once   [s]cope-extend   [n]ew node   [k]ill   [e]xplain
```

One keystroke. That is the whole review burden for a node that's going fine.

**Risk:** contract authoring overhead. Nobody writes acceptance predicates by hand. **Mitigation:**
the Consigliere drafts every contract during the sit-down; the Capo edits by exception. If the
generated `accept` is weak, the loyalty check catches it and the Books record a ruling about what a
real acceptance command looks like in this repo. The system teaches itself the repo's test idioms.

---

### 5.3 D3 — The Books

**Why it's new ground.** RAG-over-decisions is the standard 2026 answer and it fails predictably:
embeddings retrieve topically similar text, not *binding* constraints, and nothing ever gets
retired. Case law fixes both.

**Ruling format** (`.capo/books.md`, human-readable and git-diffable on purpose):

```markdown
## Session tokens are validated in middleware, never in route handlers
- binds: src/api/**, src/auth/session.py
- because: three separate handlers skipped expiry checks in the Jan rewrite
- evidence: 4a91c2e, tests/auth/test_expiry.py::test_handler_cannot_bypass
- overturn-if: middleware ordering becomes configurable per-route
- date: 2026-03-04
```

**Lookup, not search.** When a node declares `write_scope: ["src/api/**"]`, the kernel injects
exactly the rulings whose `binds` intersect that scope. Deterministic, cheap, auditable, and it
cannot miss a relevant rule because the phrasing differed.

**Lifecycle.** A ruling is written only at `make the books`, only when a decision would otherwise be
re-litigated. Every ruling must carry `overturn-if`. When a new ruling contradicts an old one, the
old is marked `OVERTURNED BY` and retained. The kernel tracks per-ruling telemetry: how often it
fired, and how often the Capo overrode it. **A ruling overridden three times is auto-flagged for
appeal at the next sit-down.** That is the mechanism that makes memory compound rather than calcify,
and nothing currently shipping has it.

---

### 5.4 D4 — The Table (interaction model)

```
┌─ HIT LIST ────────────┬─ FOCUS ─────────────────────────┬─ FAMILY ──────────┐
│ auth-rework           │ src/auth/session.py             │ consigliere  idle │
│  ✓ h1 map call sites  │ @@ -41,7 +41,9 @@               │ underboss   ●busy │
│  ✓ h2 add expiry test │ -  if token.exp < now():        │ refactor ● h3 18/25│
│  ● h3 middleware      │ +  if token.is_expired(clock):  │ test     ○        │
│  ○ h4 handler cleanup │ +      raise SessionExpired()   │ rat      ● review │
│  ⚠ h5 migration  BLK  │                                 │                   │
│                       │ accept: pytest tests/auth -q    │ spend  $0.42 / $5 │
├─ DEVIATIONS ──────────┴─────────────────────────────────┴───────────────────┤
│ ⚠ h3 wants migrations/0042_session.sql  [a]llow [s]cope [n]ode [k]ill       │
├──────────────────────────────────────────────────────────────────────────────┤
│ :sit  :hit h4  :books  :rewind 409  :rat h3  :pin src/auth  :spend           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Design rules:
- **No scrollback as primary navigation.** Everything is addressable: `:hit h4` jumps, `1`–`9`
  focus panes, `/` filters the ledger.
- **Chat is modal.** `:sit` opens a full-screen negotiation; it closes back to the board.
- **Every pane is a ledger query.** The UI has no state of its own, so it is trivially replayable,
  multi-client, and testable.
- **The theme never costs a keystroke.** Every family term has a plain alias (`:plan` = `:sit`).

---

## 6. IMPLEMENTATION ROADMAP

**Tech recommendation (high confidence):** single Rust binary — `ratatui` + `tokio` + `rusqlite`
(ledger index) + `git2`. Soldiers are **subprocesses speaking JSON-RPC over stdio**, so your
existing Python/Pydantic Axiombionic agents drop in as soldiers without a rewrite, and the hot
path (TUI render, ledger append, lease arbitration) stays in a language that starts in 12ms.
Do not write the kernel in Python; do not rewrite your agents in Rust.

**Model routing (matches your existing four-tier router):**
| Role | Tier | Why |
|---|---|---|
| Consigliere | frontier (Opus/Fable-class) | planning depth is where quality is decided |
| Underboss | mid (Sonnet-class) | sequencing, merging, high call volume |
| Soldiers (mechanical: refactor, test, docs) | local (Qwen3-coder via Ollama/NIM) | predicate-gated, so local errors are caught, not shipped |
| Rat / loyalty-check | mid | needs judgement, low volume |
| Embeddings / symbol index | local | always |

**v0.1 — "The family exists" (4–6 weeks)**
- Ledger kernel: append, board, rewind (linear only), SQLite index
- Hit-list YAML + contract schema; single soldier, serial execution
- `accept` enforcement + budget counting
- Books v0: rulings file, glob binding lookup
- TUI: three panes + command line, no parallelism
- **Ship the Claude Code plugin first** (see §5 companion files) — it validates the rituals against
  real work before a line of Rust is written. This is the cheapest possible experiment.

**v0.5 — "The family works" (+8 weeks)**
- Write-scope leases; parallel soldiers in git worktrees
- Deviation feed + one-key resolution
- Branching rewind
- Dry run (D5): local model shadow pass producing plan skeleton + risk map
- Rat (D6) with scored findings; grade findings against later acceptance outcomes
- Ruling telemetry + auto-appeal

**v1.0 — "The family outlives the terminal" (+12 weeks)**
- `capod` daemon (D7); TUI, SSH client, editor plugin as thin clients — your Galaxy A16 SSH node
  becomes a legitimate supervision surface
- Soldier SDK + plugin marketplace
- Eval harness: replay recorded repos, score acceptance pass rate and tokens/hit across versions
- Cross-project Books federation (family lore that survives a repo)

**Stretch:** Capo OS — the family as a persistent local service supervising several repos, with
routing that self-tunes from its own ledger telemetry.

---

## 7. SUCCESS METRICS & LONG-TERM EVOLUTION

Themed differently is not better. These are the numbers that decide it:

| Metric | Definition | v1.0 target |
|---|---|---|
| **Compounding coefficient** | tokens/completed-hit in month 3 ÷ month 1, same repo | **< 0.6** |
| Autonomous completion | hits completed with zero Capo intervention, ≥3 files | > 70% |
| Rework rate | diffs reverted or substantially rewritten within 48h | < 8% |
| Acceptance honesty | nodes reported done that fail `accept` on re-run | ~0% (structurally enforced) |
| Deviation precision | raised deviations the Capo acted on rather than blanket-allowed | > 60% |
| Resume rate | interrupted hits resumed successfully after process/machine death | > 95% |
| Ruling health | rulings that fire and are not overridden | > 80% |
| Control tax | Capo keystrokes per completed hit | < 5 |
| First paint | cold start to interactive board | < 150ms |

The compounding coefficient is the one that matters. Every other tool in this category is flat on
that metric by construction. If Capo is flat too, it is a reskin and should be abandoned.

---

## 8. SELF-REFLECTION & OPEN QUESTIONS

**What a skeptical staff engineer destroys first:**

- *"You've built a build system with a mob theme."* Partly fair. The defence is that the ledger has
  to buy three things nothing else offers — semantic rewind, crash-resume, and safe parallelism. If
  the week-2 replay experiment doesn't show a real token reduction, D1 is ceremony. Cut it and keep
  D2+D3, which stand alone.
- *"Acceptance predicates don't exist for the work that's actually hard."* True and serious. UI
  work, exploratory refactors, and anything aesthetic have no exit code. `human_verify: true` is an
  honest escape hatch but it's also where the whole discipline leaks. **Open question: what is the
  weakest acceptable predicate — a screenshot diff? a type-check? a reviewer agent's score?**
- *"Local soldiers will produce worse code more cheaply, which is not a win."* Correct unless
  predicate-gated and confined to mechanical work. Measure per-tier acceptance pass rate from day
  one and be willing to route everything to frontier if the data says so.
- *"Anthropic ships this in Claude Code next quarter."* Likely for parts of it. The durable moat is
  local-first ownership, your own routing, the ledger, and a memory model Anthropic is unlikely to
  ship because case law is opinionated. Build the parts that are opinionated.
- *"The theme will get old."* It will, for other people. Mitigation: every term has a plain alias
  and a `--plain` mode that renames the whole surface. Never make the joke load-bearing.

**Open questions I can't resolve from here:**
1. Should the ledger be signed/content-addressed (auditable, syncable) or plain append (simple)?
   Leaning content-addressed if federation is real, plain if not.
2. Do rulings belong in git (reviewable, merge-conflicting) or in a sidecar DB (clean, invisible)?
   Current answer — markdown in git — is a bet that reviewability beats cleanliness. `[spec]`
3. What's the right granularity for a hit node such that `accept` is writable but the node is still
   worth delegating? Empirical. Needs 20 real hit lists before guessing.
4. Does the human actually *want* exception-only supervision, or does removing the diff review feel
   like loss of control even when it's better? This is a psychology question and it decides the UX.
   Test it on yourself for two weeks before building the board.

**Immediate next three moves:**
1. Install the plugin (`capo-plugin/`) into a real project and run five sit-downs this week. Log
   where the rituals feel like friction — that log is the v0.1 spec.
2. Run the week-2 replay experiment on token cost. It is a go/no-go on the entire ledger thesis.
3. Write ten acceptance predicates for work you actually did last month. If you can't write them,
   the contract model needs rethinking before any Rust is written.
