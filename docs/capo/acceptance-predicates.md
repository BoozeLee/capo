# Ten acceptance predicates for work already done

Blueprint §8: "write ten acceptance predicates for work you actually did last month. If you
can't write them, the contract model needs rethinking." Each row is a commit in this repo's
history, the `accept` command that would have gated it, and the real exit code when run on
2026-09-21 at `family/v0.1`.

| # | Commit | Node goal | accept | exit |
|---|---|---|---|---|
| 1 | 2db0d2f tech catalog | Catalog cross-references are valid | `pnpm --filter @capo/core exec vitest run test/validate-catalog.test.ts` | 0 |
| 2 | ae12049 resolver | Conflicting crew is negotiated, not silently dropped | `pnpm --filter @capo/core exec vitest run test/negotiate.test.ts test/resolve.test.ts` | 0 |
| 3 | cf0ee9c recipes+planner | nextjs+drizzle plan matches the golden plan | `pnpm --filter @capo/core exec vitest run test/golden-plan.test.ts` | 0 |
| 4 | a58ab43 progress reducer | Reducer is total over ScaffoldEvent | `ls packages/core/test/ \| grep -q reducer && pnpm --filter @capo/core exec vitest run test/ -t reducer` | **1** |
| 5 | dfb5a35 executors | DryRun executor never touches the filesystem | `pnpm --filter @capo/engine exec vitest run test/executors/dry-run.test.ts` | 0 |
| 6 | dfb5a35 executors | Node executor really runs a step | `pnpm --filter @capo/engine exec vitest run test/executors/node-real.test.ts` | 0 |
| 7 | fe2c1de compose cmd | `capo plan --json` emits a schema-valid plan | `node packages/cli/dist/cli.js plan --crew nextjs,drizzle --name t --json \| node --input-type=module -e "import {ScaffoldPlanSchema} from './packages/core/dist/index.js'; import fs from 'node:fs'; ScaffoldPlanSchema.parse(JSON.parse(fs.readFileSync(0,'utf8')))"` | 0 |
| 8 | 1bb73bf monorepo | Workspace builds from clean | `pnpm -r --if-present run build` | 0 |
| 9 | a9a3824 ci | CI fails on test failure | `grep -q 'pnpm run test' .github/workflows/ci.yml && ! grep -q continue-on-error .github/workflows/ci.yml` | 0 |
| 10 | e994512 license | package.json licenses agree with LICENSE | `test "$(grep -h '"license"' package.json packages/*/package.json \| sort -u \| wc -l)" = 1` | 0 |

## What the exercise found

- **#4 exit 1** — the progress reducer (`packages/core/src/progress/reducer.ts`) shipped with
  no test file. The predicate was easy to *write* and impossible to *pass*: the contract model
  works, the commit didn't meet it. Ruling candidate: no `@capo/core` module lands without a
  test file of the same name.
- **#7 first draft exit 1** — the predicate assumed a `{plan: …}` wrapper that `plan --json`
  does not emit. Predicates need one dry run before they go in a contract; the sit-down skill
  should run `accept` once against the current tree and expect a non-zero exit (red) rather
  than a parse error.
- **#10 passes for the wrong reason** — all four `package.json` files say `MIT` while `LICENSE`
  says PROPRIETARY / ALL RIGHTS RESERVED (e994512). The predicate checked internal agreement,
  not agreement with the source of truth. A better predicate:
  `! (grep -q PROPRIETARY LICENSE && grep -q '"MIT"' package.json)` → would exit 1 today.
  Ruling candidate for the next `/books`.

## What could not be written as a command

- **Ink screens (`packages/cli/src/ui/screens/*`)** — "the welcome screen shows the CAPO banner
  and the family hierarchy" has no exit code. `human_verify: true`, reason: visual. A weakest
  acceptable predicate is an `ink-testing-library` snapshot of `lastFrame()`; not adopted yet.
- **README theme copy (75f39a1, 1bc880f)** — "Sicilian and English mixed naturally" is taste.
  `human_verify: true`, reason: aesthetics.

## Reading

Ten of ten were writable; eight pass. The two that could not be commands are UI and copy —
exactly the leak the blueprint predicts. The two surprises (#4, #10) are the contract model
doing its job on past work: it found an untested module and a license contradiction that
review by eye had let through.

## Replay data points

- 2026-09-21 session `02d9af87` (this branch's build session): turns 45, transcript 9,127,329
  context tokens (mean 202,830 / peak 276,652), ledger render/turn 168 [est. chars/4],
  ratio 0.0008. **Not a go signal.** The node had zero events and the render carries no system
  prompt, tool output, or file slices — everything the transcript is made of. The number is the
  floor of the contract-rendered core; the real experiment is a hit worked end-to-end under
  `/hit` with `edit` events and file slices in the render, compared turn-for-turn. Re-run
  after `status-command` closes.

## Week-2 replay re-run (2026-09-21, after state-bearing denominator)

The first datapoint on this branch (session `02d9af87`, empty node, ratio ≈ 0.0008 against
full-context tokens) was **not a go signal** — the numerator was a contract-only floor and the
denominator included system prompt + cache.

After `replay-go-nogo` h1–h2:

| Fixture | ledger render/turn | state-bearing tokens | ratio | notes |
|---|---|---|---|---|
| Empty node (contract only, ~168 tok) × 2 turns | 168 | ~2010 (two ~4kB tool_result file reads) | ~0.17 | near floor |
| Edited node (both file slices in render) × 2 turns | ~2015 | ~2010 | ~2.0 | clearly above empty |
| Same fixtures via legacy full-context compare | 168 / ~2015 | (context ~404k) | ~0.001 / ~0.01 | both collapse to ~0 — the false go |

The metric now separates empty from edited. It does **not** yet answer D1 on a real
`/hit`-worked session with recorded `edit` events, which is the Capo's call in h4.

INCONCLUSIVE: D1 (ledger-as-context) — metric is honest enough to decide; awaiting a real worked-hit replay and Capo judgment.

### Real worked-hit replay (2026-09-22, session `277ad75d`, `status-command` h1–h3 worked under `/hit`)

54 assistant turns; full-context 4,584,815 tokens (mean 84,904); state-bearing 20,779 tokens
(83,116 chars across 48 tool_results).

| Node | ledger render/turn | ledger tokens (×54) | ratio |
|---|---|---|---|
| h1 | 340 | 18,700 | 0.87 |
| h2 | 281 | 15,174 | 0.73 |
| h3 | 260 | 14,300 | 0.66 |

Reading: the render is scaled by every turn in the session, so each row asks "what if the whole
session had been rendered from this node" — a session-level bound, not a per-node cost. None of
the three renders carried a file slice because the `/hit` ritual records `files` on `node_done`
but never emits an `edit` event; the render is contract + rulings + events only. Numbers sit in
the 0.60–0.80 band: not a go, not a cut.

INCONCLUSIVE: D1 — real-session ratios 0.66–0.87. Before calling it, `/hit` must emit `edit`
events so the render carries what a soldier actually reads, and the denominator must be
windowed to the node's own turns rather than the whole session.
