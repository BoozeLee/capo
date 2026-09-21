# Capo Family v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Blueprint v0.1 — "the family exists": the Claude Code plugin (sit-down / hit / loyalty-check / books rituals) backed by a typed, on-disk, append-only ledger kernel, so the transcript becomes a rendering of `.capo/` state rather than the state itself.

**Architecture:** A new workspace package `@capo/kernel` (pure TypeScript, same idioms as `@capo/core`) owns the ledger (JSONL events with parent pointers), the hit-list contract schema, the Books (rulings as case law, glob-bound lookup), scope checks, the `accept` runner, linear rewind, per-node context rendering, and the Claude Code session replay parser. The existing `capo` CLI gains `ledger` / `board` / `hit` / `books` / `context` / `rewind` / `replay` subcommands over the kernel. The plugin skills (source of truth in `plugin/`) call those subcommands instead of hand-rolling JSON, so the rituals are grounded in real state. Rust/ratatui is **deferred**: the blueprint's own roadmap says ship the plugin first and gate the kernel rewrite on the week-2 replay experiment, which this plan makes runnable.

**Tech Stack:** TypeScript 5 (strict, ES2022, bundler resolution), zod 4, yaml 2, picomatch, cross-spawn, vitest 1, biome 1.8, pnpm 11 workspace, Node ≥ 20.9.

**Spec:** `/home/kilisan/capofiles/capo-blueprint.md` (design), `/home/kilisan/capofiles/capo-plugin/` (plugin seed), `/home/kilisan/capofiles/README.md` (install/ritual loop). Copies land in-repo under `plugin/` and `docs/capo/blueprint-v0.1.md`.

## Global Constraints

- Ledger is append-only: never truncate or rewrite `.capo/ledger.jsonl`; rewind is itself an event (`kind: "rewind"`).
- Every event carries `seq`, `ts`, `actor`, `kind`, `parent` (DAG, not line) — blueprint §5.1.
- Every hit node carries `goal`, `write_scope`, `forbidden`, `accept` (shell command, exit 0 = done), `budget`, `rollback`; a node without `accept` must have `human_verify: true` — blueprint §5.2 / sitdown skill.
- Rulings: `## <imperative rule>` + `binds`, `because`, `evidence`, `overturn-if`, `date`; no ruling without `overturn-if`; overturned rulings are kept and marked `OVERTURNED BY <rule>` — blueprint §5.3.
- Books lookup is deterministic glob intersection, not similarity search.
- A ruling overridden ≥ 3 times is flagged for appeal.
- Every family term has a plain alias; the theme never costs a keystroke.
- Node ≥ 20.9.0, pnpm 11.1.2, zod `^4.6.5`, yaml `^2.9.1`, vitest `^1.6.1` (match `packages/core`).
- Biome: 2-space indent, line width 100, recommended rules; `pnpm run lint && pnpm run build && pnpm run test` is CI and must stay green after every task.
- Commit messages: `type(scope): imperative subject`, ≤ 60 chars, one concern per commit.
- Work happens on branch `family/v0.1` in `/home/kilisan/capo`. Do not touch `~/capofiles` except to read.

---

## File Structure

```
capo/
├── plugin/                                  # Claude Code plugin, source of truth (from capofiles)
│   ├── .claude-plugin/plugin.json
│   ├── README.md
│   ├── install.sh                           # symlinks into ~/.claude, links `capo` binary
│   ├── agents/{consigliere,underboss,rat}.md
│   └── skills/{capo,sitdown,hit,loyalty-check,books}/SKILL.md
├── docs/
│   ├── adr/0006-family-kernel-in-typescript.md
│   └── capo/
│       ├── blueprint-v0.1.md                # verbatim copy of capofiles/capo-blueprint.md
│       └── acceptance-predicates.md         # ten predicates for real past work (blueprint §8 move 3)
├── .capo/                                   # dogfood state, committed
│   ├── books.md
│   ├── ledger.jsonl
│   └── hits/status-command.yaml
└── packages/kernel/                         # @capo/kernel
    ├── package.json  tsconfig.json  vitest.config.ts
    ├── src/
    │   ├── index.ts
    │   ├── capo-dir.ts                      # locate/create .capo
    │   ├── ledger/event.ts                  # zod schema + types
    │   ├── ledger/codec.ts                  # parse/serialize JSONL (pure)
    │   ├── ledger/store.ts                  # file-backed append/read
    │   ├── hits/schema.ts                   # zod HitSchema/NodeSchema
    │   ├── hits/validate.ts                 # graph rules: unique ids, deps exist, acyclic, accept|human_verify
    │   ├── hits/io.ts                       # load/save YAML
    │   ├── board/materialize.ts             # events → node states, honoring rewind cuts
    │   ├── board/next.ts                    # next runnable node
    │   ├── books/ruling.ts                  # Ruling type + format
    │   ├── books/parse.ts                   # books.md → Ruling[]
    │   ├── books/bind.ts                    # glob-intersection lookup
    │   ├── books/edit.ts                    # appendRuling / markOverturned (string → string)
    │   ├── books/appeal.ts                  # override telemetry → appeal flags
    │   ├── scope/check.ts                   # changed files vs write_scope/forbidden
    │   ├── accept/run.ts                    # run accept command, capture exit/output
    │   ├── context/render.ts                # contract + rulings + events → budgeted markdown
    │   └── replay/claude-session.ts         # Claude Code JSONL → per-turn context tokens
    └── test/  (one file per src module, same relative name)
packages/cli/src/commands/family/
    ├── index.ts        # dispatch by subcommand
    ├── ledger.ts  board.ts  hit.ts  books.ts  context.ts  rewind.ts  replay.ts
    └── output.ts       # json|text printing helper
```

---

### Task 0: Land the WIP and branch

The working tree on `cli/compose-command` holds uncommitted, tested `plan`/`compose` command work (61 tests green). It must be committed before `cli.ts` is touched again, otherwise the family commits would swallow unrelated hunks.

**Files:**
- Modify (commit as-is): `packages/cli/package.json`, `packages/cli/src/cli.ts`, `packages/core/src/index.ts`, `pnpm-lock.yaml`, `packages/cli/src/commands/`, `packages/cli/src/package-version.ts`, `packages/cli/test/`, `packages/core/src/resolver/parse-crew.ts`, `packages/core/src/types/plan-schema.ts`, `packages/core/test/parse-crew.test.ts`

- [ ] **Step 1: Verify green**

Run: `cd /home/kilisan/capo && pnpm run lint && pnpm -r --if-present run test 2>&1 | grep -E "Tests|failed"`
Expected: three `Tests  N passed` lines, no `failed`.

- [ ] **Step 2: Commit WIP**

```bash
git add -A packages/cli packages/core pnpm-lock.yaml
git commit -m "feat(cli): plan and compose commands over @capo/engine"
```

- [ ] **Step 3: Branch**

```bash
git switch -c family/v0.1
```

---

### Task 1: Import the plugin and the blueprint; ADR 0006

**Files:**
- Create: `plugin/` (copy of `/home/kilisan/capofiles/capo-plugin/` verbatim), `plugin/install.sh`
- Create: `docs/capo/blueprint-v0.1.md` (copy of `/home/kilisan/capofiles/capo-blueprint.md`)
- Create: `docs/adr/0006-family-kernel-in-typescript.md`
- Modify: `README.md` (append a "The Family" section)

- [ ] **Step 1: Copy**

```bash
cd /home/kilisan/capo
mkdir -p plugin docs/capo
cp -r /home/kilisan/capofiles/capo-plugin/. plugin/
cp /home/kilisan/capofiles/capo-blueprint.md docs/capo/blueprint-v0.1.md
```

- [ ] **Step 2: Write `plugin/install.sh`**

```bash
#!/usr/bin/env bash
# Drop-in install per plugin/README.md: skills + agents go to ~/.claude, and the
# `capo` binary is linked so the skills' `!`capo …`` blocks resolve in any repo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p ~/.claude/skills ~/.claude/agents ~/.local/bin
for s in "$ROOT"/plugin/skills/*/; do
  name="$(basename "$s")"
  rm -rf ~/.claude/skills/"$name"
  ln -s "$s" ~/.claude/skills/"$name"
done
for a in "$ROOT"/plugin/agents/*.md; do
  ln -sf "$a" ~/.claude/agents/"$(basename "$a")"
done
(cd "$ROOT" && pnpm install --frozen-lockfile >/dev/null && pnpm run build >/dev/null)
ln -sf "$ROOT/packages/cli/dist/cli.js" ~/.local/bin/capo
chmod +x "$ROOT/packages/cli/dist/cli.js"
command -v capo >/dev/null || echo "warn: ~/.local/bin is not on PATH" >&2
echo "installed: $(ls ~/.claude/skills | tr '\n' ' ')"
```

`chmod +x plugin/install.sh`.

- [ ] **Step 3: Write ADR 0006**

```markdown
# 0006. The family kernel ships in TypeScript inside this monorepo

## Status
Accepted (v0.1)

## Context
`capofiles/capo-blueprint.md` describes a second Capo product — a ledger-backed agentic
coding OS (sit-downs, contract-bound hits, the Books) — and recommends a Rust kernel
(ratatui/tokio/rusqlite/git2). This repo is the mafia-themed dev-stack scaffolder
(`@capo/core`, `@capo/engine`, Ink CLI). Same name, same theme, different product.
The blueprint's own roadmap says: ship the Claude Code plugin first, and treat the
week-2 replay experiment as the go/no-go for the ledger thesis before writing Rust.

## Decision
- The plugin lives at `plugin/` in this repo and is the source of truth; `plugin/install.sh`
  drops it into `~/.claude` per the plugin README.
- The v0.1 kernel is `@capo/kernel`, a TypeScript workspace package using the same
  idioms as `@capo/core` (zod schemas, `Result<T,E>`, vitest, biome). The `capo` CLI
  exposes it as `ledger` / `board` / `hit` / `books` / `context` / `rewind` / `replay`.
- Rust is deferred until `capo replay` shows ≥ 40% context-token reduction on real
  sessions (blueprint §5.1). Under 20% → cut D1, keep D2 + D3.

## Consequences
- One repo, one CI, one `capo` binary for both products; the scaffolder's `plan`/`compose`
  and the family's rituals do not share code paths.
- The 12 ms cold-start goal is not met by Node; acceptable for a plugin-driven v0.1
  where the model turn dominates latency.
- If the replay experiment passes, the Rust kernel must read the same `.capo/` files —
  the on-disk formats in `@capo/kernel` are the contract, not the TypeScript.
```

- [ ] **Step 4: Append to `README.md`**

```markdown

## 🎩 The Family (Capo for Claude Code)

Same name, second product: a plan-first, contract-bound, ledger-backed way to run coding
sessions. Skills: `/sitdown`, `/hit`, `/loyalty-check`, `/books`. State lives in `.capo/`
(hit-list YAML, `books.md` rulings, `ledger.jsonl`). Install: `plugin/install.sh`.
Design: `docs/capo/blueprint-v0.1.md`. Decision record: `docs/adr/0006`.
```

- [ ] **Step 5: Commit**

```bash
git add plugin docs/capo docs/adr/0006-family-kernel-in-typescript.md README.md
git commit -m "feat(plugin): import Capo family plugin and blueprint"
```

---

### Task 2: `@capo/kernel` scaffold + ledger event codec

**Files:**
- Create: `packages/kernel/package.json`, `packages/kernel/tsconfig.json`, `packages/kernel/vitest.config.ts`
- Create: `packages/kernel/src/index.ts`, `packages/kernel/src/ledger/event.ts`, `packages/kernel/src/ledger/codec.ts`
- Test: `packages/kernel/test/ledger/codec.test.ts`

**Interfaces:**
- Produces: `EventSchema`, `LedgerEvent`, `NewEvent`, `EVENT_KINDS`, `parseLedger(text): Result<LedgerEvent[], LedgerParseError>`, `serializeEvent(e): string`.

- [ ] **Step 1: package files**

`packages/kernel/package.json`:
```json
{
  "name": "@capo/kernel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "biome lint ."
  },
  "dependencies": {
    "cross-spawn": "^7.0.6",
    "picomatch": "^4.0.2",
    "yaml": "^2.9.1",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/cross-spawn": "^6.0.6",
    "@types/node": "^20.10.0",
    "@types/picomatch": "^3.0.1",
    "typescript": "^5.3.2",
    "vitest": "^1.6.1"
  }
}
```

`packages/kernel/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "composite": true },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

`packages/kernel/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: {} });
```

Run: `cd /home/kilisan/capo && pnpm install` (lockfile updates; picomatch + types get added).

- [ ] **Step 2: Failing test**

`packages/kernel/test/ledger/codec.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { parseLedger, serializeEvent } from "../../src/ledger/codec.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const e1: LedgerEvent = {
  seq: 1,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "capo",
  kind: "sitdown_open",
  hit: "auth",
  parent: null,
  payload: { nodes: 3 },
};

describe("ledger codec", () => {
  test("round-trips events through JSONL", () => {
    const text = serializeEvent(e1) + serializeEvent({ ...e1, seq: 2, parent: 1, kind: "node_start", node: "h1" });
    const parsed = parseLedger(text);
    expect(parsed.ok && parsed.value.map((e) => e.seq)).toEqual([1, 2]);
  });

  test("serializes one line per event, newline-terminated", () => {
    expect(serializeEvent(e1).endsWith("\n")).toBe(true);
    expect(serializeEvent(e1).split("\n")).toHaveLength(2);
  });

  test("empty text is an empty ledger", () => {
    expect(parseLedger("")).toEqual({ ok: true, value: [] });
  });

  test("reports the line number of a corrupt line", () => {
    const parsed = parseLedger(`${serializeEvent(e1)}{not json\n`);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.line).toBe(2);
  });

  test("rejects a non-monotonic seq", () => {
    const parsed = parseLedger(serializeEvent(e1) + serializeEvent({ ...e1, seq: 1 }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.reason).toMatch(/seq/);
  });

  test("rejects a parent pointing forward", () => {
    const parsed = parseLedger(serializeEvent({ ...e1, parent: 5 }));
    expect(parsed.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `cd /home/kilisan/capo/packages/kernel && pnpm vitest run test/ledger/codec.test.ts`
Expected: FAIL — cannot resolve `../../src/ledger/codec.js`.

- [ ] **Step 4: Implement**

`packages/kernel/src/ledger/event.ts`:
```ts
import { z } from "zod";

export const EVENT_KINDS = [
  "sitdown_open",
  "node_start",
  "edit",
  "deviation",
  "accept_run",
  "node_done",
  "node_failed",
  "ruling_added",
  "override",
  "rewind",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const EventSchema = z
  .object({
    seq: z.number().int().positive(),
    ts: z.string().datetime(),
    actor: z.string().min(1),
    kind: z.enum(EVENT_KINDS),
    hit: z.string().optional(),
    node: z.string().optional(),
    parent: z.number().int().positive().nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type LedgerEvent = z.infer<typeof EventSchema>;

/** What a caller supplies; the store assigns seq/ts/parent. */
export interface NewEvent {
  readonly actor: string;
  readonly kind: EventKind;
  readonly hit?: string;
  readonly node?: string;
  readonly parent?: number | null;
  readonly payload?: Record<string, unknown>;
}
```

`packages/kernel/src/ledger/codec.ts`:
```ts
import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { EventSchema, type LedgerEvent } from "./event.js";

export interface LedgerParseError {
  readonly line: number;
  readonly reason: string;
}

export function serializeEvent(event: LedgerEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseLedger(text: string): Result<LedgerEvent[], LedgerParseError> {
  const events: LedgerEvent[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return err({ line: i + 1, reason: "invalid JSON" });
    }
    const parsed = EventSchema.safeParse(raw);
    if (!parsed.success) {
      return err({ line: i + 1, reason: parsed.error.issues[0]?.message ?? "invalid event" });
    }
    const event = parsed.data;
    const prevSeq = events.at(-1)?.seq ?? 0;
    if (event.seq <= prevSeq) {
      return err({ line: i + 1, reason: `seq ${event.seq} is not greater than ${prevSeq}` });
    }
    if (event.parent !== null && event.parent >= event.seq) {
      return err({ line: i + 1, reason: `parent ${event.parent} does not precede seq ${event.seq}` });
    }
    events.push(event);
  }
  return ok(events);
}
```

`packages/kernel/src/result.ts` — same shape as `@capo/core`'s, copied so the kernel has no dependency on the scaffolder:
```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

`packages/kernel/src/index.ts`:
```ts
export type { Result } from "./result.js";
export { err, ok } from "./result.js";
export { EVENT_KINDS, EventSchema } from "./ledger/event.js";
export type { EventKind, LedgerEvent, NewEvent } from "./ledger/event.js";
export { parseLedger, serializeEvent } from "./ledger/codec.js";
export type { LedgerParseError } from "./ledger/codec.js";
```

- [ ] **Step 5: Run to pass**

Run: `pnpm vitest run test/ledger/codec.test.ts` → 6 passed. Then `cd /home/kilisan/capo && pnpm run lint && pnpm run build`.

- [ ] **Step 6: Commit**

```bash
git add packages/kernel pnpm-lock.yaml
git commit -m "feat(kernel): ledger event schema and JSONL codec"
```

---

### Task 3: File-backed ledger store + `.capo` dir resolution

**Files:**
- Create: `packages/kernel/src/capo-dir.ts`, `packages/kernel/src/ledger/store.ts`
- Test: `packages/kernel/test/ledger/store.test.ts`, `packages/kernel/test/capo-dir.test.ts`

**Interfaces:**
- Produces: `findCapoDir(cwd): Promise<string | null>`, `ensureCapoDir(cwd): Promise<string>` (creates `.capo/`, `.capo/hits/`), `createFileLedger(capoDir, { now? }): LedgerStore` with `read(): Promise<Result<LedgerEvent[], LedgerParseError>>` and `append(e: NewEvent): Promise<LedgerEvent>`.

- [ ] **Step 1: Failing tests**

`packages/kernel/test/capo-dir.test.ts`:
```ts
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ensureCapoDir, findCapoDir } from "../src/capo-dir.js";

describe("capo dir", () => {
  test("finds .capo walking up from a nested cwd", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "capo-"));
    await mkdir(path.join(root, ".capo"));
    await mkdir(path.join(root, "a", "b"), { recursive: true });
    expect(await findCapoDir(path.join(root, "a", "b"))).toBe(path.join(root, ".capo"));
  });

  test("returns null when no .capo exists", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "capo-"));
    expect(await findCapoDir(root)).toBeNull();
  });

  test("ensureCapoDir creates .capo and .capo/hits", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "capo-"));
    const dir = await ensureCapoDir(root);
    expect(dir).toBe(path.join(root, ".capo"));
    expect(await findCapoDir(path.join(root))).toBe(dir);
  });
});
```

`packages/kernel/test/ledger/store.test.ts`:
```ts
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ensureCapoDir } from "../../src/capo-dir.js";
import { createFileLedger } from "../../src/ledger/store.js";

async function fresh() {
  const dir = await ensureCapoDir(await mkdtemp(path.join(tmpdir(), "capo-")));
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 8, 21, 10, 0, tick++)).toISOString();
  return { dir, ledger: createFileLedger(dir, { now }) };
}

describe("file ledger", () => {
  test("empty ledger reads as no events", async () => {
    const { ledger } = await fresh();
    expect(await ledger.read()).toEqual({ ok: true, value: [] });
  });

  test("append assigns seq, ts and parent = previous seq", async () => {
    const { ledger } = await fresh();
    const a = await ledger.append({ actor: "capo", kind: "sitdown_open", hit: "x" });
    const b = await ledger.append({ actor: "capo", kind: "node_start", hit: "x", node: "h1" });
    expect([a.seq, a.parent, b.seq, b.parent]).toEqual([1, null, 2, 1]);
    expect(a.ts).toBe("2026-09-21T10:00:00.000Z");
  });

  test("explicit parent is honored", async () => {
    const { ledger } = await fresh();
    await ledger.append({ actor: "capo", kind: "sitdown_open", hit: "x" });
    await ledger.append({ actor: "capo", kind: "node_start", hit: "x", node: "h1" });
    const c = await ledger.append({ actor: "capo", kind: "node_start", hit: "x", node: "h2", parent: 1 });
    expect(c.parent).toBe(1);
  });

  test("appends are durable JSONL lines", async () => {
    const { dir, ledger } = await fresh();
    await ledger.append({ actor: "capo", kind: "sitdown_open", hit: "x" });
    const text = await readFile(path.join(dir, "ledger.jsonl"), "utf8");
    expect(text.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(text).payload).toEqual({});
  });

  test("append refuses to extend a corrupt ledger", async () => {
    const { dir, ledger } = await fresh();
    const { appendFile } = await import("node:fs/promises");
    await appendFile(path.join(dir, "ledger.jsonl"), "garbage\n");
    await expect(ledger.append({ actor: "capo", kind: "sitdown_open" })).rejects.toThrow(/line 1/);
  });
});
```

- [ ] **Step 2: Run to fail** — `pnpm vitest run test/capo-dir.test.ts test/ledger/store.test.ts` → module not found.

- [ ] **Step 3: Implement**

`packages/kernel/src/capo-dir.ts`:
```ts
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

export const CAPO_DIR_NAME = ".capo";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Walk up from cwd until a `.capo/` directory is found; null if none. */
export async function findCapoDir(cwd: string): Promise<string | null> {
  let dir = path.resolve(cwd);
  for (;;) {
    const candidate = path.join(dir, CAPO_DIR_NAME);
    if (await exists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Create `<cwd>/.capo` and `<cwd>/.capo/hits` if missing; returns the `.capo` path. */
export async function ensureCapoDir(cwd: string): Promise<string> {
  const dir = path.join(path.resolve(cwd), CAPO_DIR_NAME);
  await mkdir(path.join(dir, "hits"), { recursive: true });
  return dir;
}

export function ledgerPath(capoDir: string): string {
  return path.join(capoDir, "ledger.jsonl");
}

export function booksPath(capoDir: string): string {
  return path.join(capoDir, "books.md");
}

export function hitPath(capoDir: string, slug: string): string {
  return path.join(capoDir, "hits", `${slug}.yaml`);
}
```

`packages/kernel/src/ledger/store.ts`:
```ts
import { appendFile, readFile } from "node:fs/promises";
import { ledgerPath } from "../capo-dir.js";
import type { Result } from "../result.js";
import { type LedgerParseError, parseLedger, serializeEvent } from "./codec.js";
import type { LedgerEvent, NewEvent } from "./event.js";

export interface LedgerStore {
  read(): Promise<Result<LedgerEvent[], LedgerParseError>>;
  /** Appends with seq = last+1, parent = last seq unless given. Throws on a corrupt ledger. */
  append(event: NewEvent): Promise<LedgerEvent>;
}

export interface LedgerStoreOptions {
  readonly now?: () => string;
}

export class LedgerCorruptError extends Error {
  constructor(readonly line: number, reason: string) {
    super(`ledger corrupt at line ${line}: ${reason}`);
    this.name = "LedgerCorruptError";
  }
}

async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export function createFileLedger(capoDir: string, opts: LedgerStoreOptions = {}): LedgerStore {
  const file = ledgerPath(capoDir);
  const now = opts.now ?? (() => new Date().toISOString());
  return {
    async read() {
      return parseLedger(await readText(file));
    },
    async append(input) {
      const current = parseLedger(await readText(file));
      if (!current.ok) throw new LedgerCorruptError(current.error.line, current.error.reason);
      const last = current.value.at(-1);
      const event: LedgerEvent = {
        seq: (last?.seq ?? 0) + 1,
        ts: now(),
        actor: input.actor,
        kind: input.kind,
        ...(input.hit !== undefined ? { hit: input.hit } : {}),
        ...(input.node !== undefined ? { node: input.node } : {}),
        parent: input.parent === undefined ? (last?.seq ?? null) : input.parent,
        payload: input.payload ?? {},
      };
      await appendFile(file, serializeEvent(event), "utf8");
      return event;
    },
  };
}
```

Add to `index.ts`:
```ts
export { CAPO_DIR_NAME, booksPath, ensureCapoDir, findCapoDir, hitPath, ledgerPath } from "./capo-dir.js";
export { LedgerCorruptError, createFileLedger } from "./ledger/store.js";
export type { LedgerStore, LedgerStoreOptions } from "./ledger/store.js";
```

- [ ] **Step 4: Run to pass** — 8 tests pass; `pnpm run lint && pnpm run build` from root green.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): file-backed ledger store and .capo lookup"
```

---

### Task 4: Hit-list contract schema, validation, YAML IO

**Files:**
- Create: `packages/kernel/src/hits/schema.ts`, `packages/kernel/src/hits/validate.ts`, `packages/kernel/src/hits/io.ts`
- Test: `packages/kernel/test/hits/validate.test.ts`, `packages/kernel/test/hits/io.test.ts`

**Interfaces:**
- Produces: `HitSchema`, `NodeSchema`, `Hit`, `HitNode`, `SOLDIERS`, `validateHit(raw: unknown): Result<Hit, HitValidationError[]>`, `loadHit(capoDir, slug): Promise<Result<Hit, HitValidationError[]>>`, `saveHit(capoDir, hit): Promise<void>`, `listHits(capoDir): Promise<string[]>`.

- [ ] **Step 1: Failing tests**

`packages/kernel/test/hits/validate.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { validateHit } from "../../src/hits/validate.js";

const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  goal: `do ${id}`,
  write_scope: ["src/**"],
  accept: "true",
  budget: 10,
  ...extra,
});

const base = { id: "auth", title: "Auth rework", created: "2026-09-21", nodes: [node("h1")] };

describe("validateHit", () => {
  test("accepts a minimal valid hit and fills defaults", () => {
    const r = validateHit(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nodes[0].depends_on).toEqual([]);
      expect(r.value.nodes[0].forbidden).toEqual([]);
      expect(r.value.nodes[0].human_verify).toBe(false);
    }
  });

  test("rejects a node with neither accept nor human_verify", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { accept: undefined })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/accept.*human_verify/);
  });

  test("accepts human_verify without accept when a reason is given", () => {
    const r = validateHit({
      ...base,
      nodes: [node("h1", { accept: undefined, human_verify: true, human_verify_reason: "visual" })],
    });
    expect(r.ok).toBe(true);
  });

  test("rejects duplicate node ids", () => {
    const r = validateHit({ ...base, nodes: [node("h1"), node("h1")] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/duplicate/);
  });

  test("rejects depends_on pointing at an unknown node", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { depends_on: ["h9"] })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/unknown node h9/);
  });

  test("rejects a dependency cycle", () => {
    const r = validateHit({
      ...base,
      nodes: [node("h1", { depends_on: ["h2"] }), node("h2", { depends_on: ["h1"] })],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/cycle/);
  });

  test("rejects unknown keys (contracts are strict)", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { vibes: "good" })] });
    expect(r.ok).toBe(false);
  });
});
```

`packages/kernel/test/hits/io.test.ts`:
```ts
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ensureCapoDir } from "../../src/capo-dir.js";
import { listHits, loadHit, saveHit } from "../../src/hits/io.js";
import type { Hit } from "../../src/hits/schema.js";

const hit: Hit = {
  id: "auth",
  title: "Auth rework",
  created: "2026-09-21",
  nodes: [
    {
      id: "h1",
      goal: "map call sites",
      depends_on: [],
      write_scope: ["docs/**"],
      forbidden: [],
      accept: "test -f docs/callsites.md",
      human_verify: false,
      budget: 10,
      rollback: "git checkout docs/",
      soldier: "research",
    },
  ],
};

describe("hit io", () => {
  test("save then load round-trips and lists the slug", async () => {
    const dir = await ensureCapoDir(await mkdtemp(path.join(tmpdir(), "capo-")));
    await saveHit(dir, hit);
    expect(await listHits(dir)).toEqual(["auth"]);
    expect(await loadHit(dir, "auth")).toEqual({ ok: true, value: hit });
  });

  test("loading a missing hit is an error, not a throw", async () => {
    const dir = await ensureCapoDir(await mkdtemp(path.join(tmpdir(), "capo-")));
    const r = await loadHit(dir, "nope");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/not found/);
  });
});
```

- [ ] **Step 2: Run to fail** — module not found.

- [ ] **Step 3: Implement**

`packages/kernel/src/hits/schema.ts`:
```ts
import { z } from "zod";

export const SOLDIERS = ["refactor", "test", "research", "security", "docs"] as const;
export type Soldier = (typeof SOLDIERS)[number];

const ID = z.string().regex(/^[a-z][a-z0-9_-]*$/, "ids are lowercase slugs");

export const NodeSchema = z
  .object({
    id: ID,
    goal: z.string().min(1),
    depends_on: z.array(ID).default([]),
    write_scope: z.array(z.string().min(1)).min(1),
    forbidden: z.array(z.string().min(1)).default([]),
    accept: z.string().min(1).optional(),
    human_verify: z.boolean().default(false),
    human_verify_reason: z.string().min(1).optional(),
    budget: z.number().int().positive(),
    rollback: z.string().min(1).optional(),
    soldier: z.enum(SOLDIERS).optional(),
  })
  .strict();

export const HitSchema = z
  .object({
    id: ID,
    title: z.string().min(1),
    created: z.string().min(1),
    nodes: z.array(NodeSchema).min(1),
  })
  .strict();

export type HitNode = z.infer<typeof NodeSchema>;
export type Hit = z.infer<typeof HitSchema>;
```

`packages/kernel/src/hits/validate.ts`:
```ts
import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { type Hit, HitSchema } from "./schema.js";

export interface HitValidationError {
  readonly path: string;
  readonly message: string;
}

function findCycle(nodes: Hit["nodes"]): string[] | null {
  const deps = new Map(nodes.map((n) => [n.id, n.depends_on]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === "done") return null;
    if (s === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const d of deps.get(id) ?? []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  };
  for (const n of nodes) {
    const c = visit(n.id);
    if (c) return c;
  }
  return null;
}

/** Schema + graph rules. Errors are collected, not thrown; the first is the most severe. */
export function validateHit(raw: unknown): Result<Hit, HitValidationError[]> {
  const parsed = HitSchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const hit = parsed.data;
  const errors: HitValidationError[] = [];
  const ids = new Set<string>();
  for (const [i, n] of hit.nodes.entries()) {
    const at = `nodes.${i}`;
    if (ids.has(n.id)) errors.push({ path: at, message: `duplicate node id ${n.id}` });
    ids.add(n.id);
    if (n.accept === undefined && !n.human_verify) {
      errors.push({ path: at, message: `node ${n.id} needs accept or human_verify: true` });
    }
    if (n.human_verify && n.human_verify_reason === undefined) {
      errors.push({ path: at, message: `node ${n.id} has human_verify without a reason` });
    }
  }
  for (const [i, n] of hit.nodes.entries()) {
    for (const d of n.depends_on) {
      if (!ids.has(d)) errors.push({ path: `nodes.${i}`, message: `unknown node ${d}` });
    }
  }
  if (errors.length === 0) {
    const cycle = findCycle(hit.nodes);
    if (cycle) errors.push({ path: "nodes", message: `dependency cycle: ${cycle.join(" -> ")}` });
  }
  return errors.length > 0 ? err(errors) : ok(hit);
}
```

`packages/kernel/src/hits/io.ts`:
```ts
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import { hitPath } from "../capo-dir.js";
import type { Result } from "../result.js";
import { err } from "../result.js";
import type { Hit } from "./schema.js";
import { type HitValidationError, validateHit } from "./validate.js";

export async function loadHit(
  capoDir: string,
  slug: string,
): Promise<Result<Hit, HitValidationError[]>> {
  let text: string;
  try {
    text = await readFile(hitPath(capoDir, slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return err([{ path: "", message: `hit ${slug} not found` }]);
    }
    throw error;
  }
  return validateHit(parse(text));
}

export async function saveHit(capoDir: string, hit: Hit): Promise<void> {
  await writeFile(hitPath(capoDir, hit.id), stringify(hit), "utf8");
}

export async function listHits(capoDir: string): Promise<string[]> {
  try {
    const entries = await readdir(path.join(capoDir, "hits"));
    return entries.filter((f) => f.endsWith(".yaml")).map((f) => f.slice(0, -5)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
```

Add to `index.ts`:
```ts
export { HitSchema, NodeSchema, SOLDIERS } from "./hits/schema.js";
export type { Hit, HitNode, Soldier } from "./hits/schema.js";
export { validateHit } from "./hits/validate.js";
export type { HitValidationError } from "./hits/validate.js";
export { listHits, loadHit, saveHit } from "./hits/io.js";
```

- [ ] **Step 4: Run to pass**; root lint/build green.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): hit-list contract schema, validation, YAML io"
```

---

### Task 5: Board materialization, next runnable node, rewind semantics

**Files:**
- Create: `packages/kernel/src/board/materialize.ts`, `packages/kernel/src/board/next.ts`
- Test: `packages/kernel/test/board/materialize.test.ts`, `packages/kernel/test/board/next.test.ts`

**Interfaces:**
- Produces: `NodeStatus`, `NodeState`, `Board`, `materialize(events, hits): Board`, `liveEvents(events): LedgerEvent[]` (events surviving all rewind cuts), `nextRunnable(hit, board): HitNode | null`, `rewindEvent(to): NewEvent` helper.
- Rewind rule (linear, blueprint v0.1): a `rewind` event with `payload.to = N` cuts every event with `N < seq < rewind.seq`. Cut events are ignored by the board but remain in the file.

- [ ] **Step 1: Failing tests**

`packages/kernel/test/board/materialize.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { liveEvents, materialize } from "../../src/board/materialize.js";
import type { Hit } from "../../src/hits/schema.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const hit: Hit = {
  id: "auth",
  title: "t",
  created: "2026-09-21",
  nodes: [
    { id: "h1", goal: "a", depends_on: [], write_scope: ["a/**"], forbidden: [], accept: "true", human_verify: false, budget: 5 },
    { id: "h2", goal: "b", depends_on: ["h1"], write_scope: ["b/**"], forbidden: [], accept: "true", human_verify: false, budget: 5 },
  ],
};

let seq = 0;
const ev = (kind: LedgerEvent["kind"], node?: string, payload: Record<string, unknown> = {}): LedgerEvent => ({
  seq: ++seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "capo",
  kind,
  hit: "auth",
  ...(node ? { node } : {}),
  parent: seq - 1 || null,
  payload,
});

describe("materialize", () => {
  test("nodes start pending; deps make later nodes blocked", () => {
    seq = 0;
    const b = materialize([ev("sitdown_open")], [hit]);
    expect(b.hits.auth.nodes.h1.status).toBe("pending");
    expect(b.hits.auth.nodes.h2.status).toBe("blocked");
  });

  test("node_start → running; node_done with accept 0 → done and unblocks dependents", () => {
    seq = 0;
    const b = materialize(
      [ev("sitdown_open"), ev("node_start", "h1"), ev("edit", "h1"), ev("edit", "h1"), ev("accept_run", "h1", { exit: 0 }), ev("node_done", "h1", { accept_exit: 0 })],
      [hit],
    );
    expect(b.hits.auth.nodes.h1).toMatchObject({ status: "done", toolCalls: 2, acceptExit: 0 });
    expect(b.hits.auth.nodes.h2.status).toBe("pending");
  });

  test("node_failed → failed; deviations are counted", () => {
    seq = 0;
    const b = materialize([ev("node_start", "h1"), ev("deviation", "h1"), ev("node_failed", "h1")], [hit]);
    expect(b.hits.auth.nodes.h1).toMatchObject({ status: "failed", deviations: 1 });
  });

  test("rewind cuts events between `to` and the rewind event", () => {
    seq = 0;
    const events = [
      ev("sitdown_open"), // 1
      ev("node_start", "h1"), // 2
      ev("node_done", "h1", { accept_exit: 0 }), // 3
      ev("node_start", "h2"), // 4
      ev("rewind", undefined, { to: 3 }), // 5 → cuts 4
    ];
    expect(liveEvents(events).map((e) => e.seq)).toEqual([1, 2, 3, 5]);
    const b = materialize(events, [hit]);
    expect(b.hits.auth.nodes.h1.status).toBe("done");
    expect(b.hits.auth.nodes.h2.status).toBe("pending");
    expect(b.lastSeq).toBe(5);
  });

  test("events for unknown hits are ignored, not fatal", () => {
    seq = 0;
    const b = materialize([{ ...ev("node_start", "zz"), hit: "ghost" }], [hit]);
    expect(Object.keys(b.hits)).toEqual(["auth"]);
  });
});
```

`packages/kernel/test/board/next.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { materialize } from "../../src/board/materialize.js";
import { nextRunnable } from "../../src/board/next.js";
import type { Hit } from "../../src/hits/schema.js";

const hit: Hit = {
  id: "auth",
  title: "t",
  created: "2026-09-21",
  nodes: [
    { id: "h1", goal: "a", depends_on: [], write_scope: ["a/**"], forbidden: [], accept: "true", human_verify: false, budget: 5 },
    { id: "h2", goal: "b", depends_on: ["h1"], write_scope: ["b/**"], forbidden: [], accept: "true", human_verify: false, budget: 5 },
    { id: "h3", goal: "c", depends_on: [], write_scope: ["c/**"], forbidden: [], accept: "true", human_verify: false, budget: 5 },
  ],
};

describe("nextRunnable", () => {
  test("first pending node in declaration order whose deps are done", () => {
    expect(nextRunnable(hit, materialize([], [hit]))?.id).toBe("h1");
  });

  test("skips running and done nodes", () => {
    const b = materialize(
      [
        { seq: 1, ts: "2026-09-21T10:00:00.000Z", actor: "c", kind: "node_start", hit: "auth", node: "h1", parent: null, payload: {} },
      ],
      [hit],
    );
    expect(nextRunnable(hit, b)?.id).toBe("h3");
  });

  test("null when nothing is runnable", () => {
    const b = materialize(
      [
        { seq: 1, ts: "2026-09-21T10:00:00.000Z", actor: "c", kind: "node_start", hit: "auth", node: "h1", parent: null, payload: {} },
        { seq: 2, ts: "2026-09-21T10:00:00.000Z", actor: "c", kind: "node_start", hit: "auth", node: "h3", parent: 1, payload: {} },
      ],
      [hit],
    );
    expect(nextRunnable(hit, b)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement**

`packages/kernel/src/board/materialize.ts`:
```ts
import type { Hit } from "../hits/schema.js";
import type { LedgerEvent } from "../ledger/event.js";

export type NodeStatus = "pending" | "blocked" | "running" | "done" | "failed";

export interface NodeState {
  readonly id: string;
  readonly status: NodeStatus;
  readonly toolCalls: number;
  readonly deviations: number;
  readonly acceptExit: number | null;
  readonly startedSeq: number | null;
  readonly finishedSeq: number | null;
}

export interface HitState {
  readonly nodes: Record<string, NodeState>;
}

export interface Board {
  readonly hits: Record<string, HitState>;
  readonly lastSeq: number;
}

/** Events that survive every `rewind` cut. Linear rule: rewind{to:N} at seq R cuts N < seq < R. */
export function liveEvents(events: readonly LedgerEvent[]): LedgerEvent[] {
  const cut = new Set<number>();
  for (const e of events) {
    if (e.kind !== "rewind") continue;
    const to = typeof e.payload.to === "number" ? e.payload.to : Number.NaN;
    if (!Number.isInteger(to)) continue;
    for (const v of events) {
      if (v.seq > to && v.seq < e.seq && !cut.has(v.seq)) cut.add(v.seq);
    }
  }
  return events.filter((e) => !cut.has(e.seq));
}

type Mutable = { -readonly [K in keyof NodeState]: NodeState[K] };

function applyEvent(state: Mutable, e: LedgerEvent): void {
  switch (e.kind) {
    case "node_start":
      state.status = "running";
      state.startedSeq = e.seq;
      state.finishedSeq = null;
      state.acceptExit = null;
      break;
    case "edit":
      state.toolCalls += 1;
      break;
    case "deviation":
      state.deviations += 1;
      break;
    case "accept_run":
      state.acceptExit = typeof e.payload.exit === "number" ? e.payload.exit : null;
      break;
    case "node_done":
      state.status = "done";
      state.finishedSeq = e.seq;
      if (typeof e.payload.accept_exit === "number") state.acceptExit = e.payload.accept_exit;
      break;
    case "node_failed":
      state.status = "failed";
      state.finishedSeq = e.seq;
      break;
    default:
      break;
  }
}

export function materialize(events: readonly LedgerEvent[], hits: readonly Hit[]): Board {
  const board: Record<string, Record<string, Mutable>> = {};
  for (const hit of hits) {
    board[hit.id] = Object.fromEntries(
      hit.nodes.map((n) => [
        n.id,
        { id: n.id, status: "pending", toolCalls: 0, deviations: 0, acceptExit: null, startedSeq: null, finishedSeq: null },
      ]),
    );
  }
  for (const e of liveEvents(events)) {
    if (!e.hit || !e.node) continue;
    const node = board[e.hit]?.[e.node];
    if (node) applyEvent(node, e);
  }
  for (const hit of hits) {
    for (const n of hit.nodes) {
      const s = board[hit.id][n.id];
      if (s.status !== "pending") continue;
      const blocked = n.depends_on.some((d) => board[hit.id][d]?.status !== "done");
      if (blocked) s.status = "blocked";
    }
  }
  return {
    hits: Object.fromEntries(Object.entries(board).map(([id, nodes]) => [id, { nodes }])),
    lastSeq: events.at(-1)?.seq ?? 0,
  };
}
```

`packages/kernel/src/board/next.ts`:
```ts
import type { Hit, HitNode } from "../hits/schema.js";
import type { Board } from "./materialize.js";

/** Declaration order wins among runnable nodes: the sit-down already ordered them by risk. */
export function nextRunnable(hit: Hit, board: Board): HitNode | null {
  const states = board.hits[hit.id]?.nodes ?? {};
  return hit.nodes.find((n) => states[n.id]?.status === "pending") ?? null;
}
```

Add to `index.ts`:
```ts
export { liveEvents, materialize } from "./board/materialize.js";
export type { Board, HitState, NodeState, NodeStatus } from "./board/materialize.js";
export { nextRunnable } from "./board/next.js";
```

- [ ] **Step 4: Run to pass; root lint/build green.**

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): board materialization, next node, linear rewind"
```

---

### Task 6: The Books — parse, format, bind, overturn, appeal

**Files:**
- Create: `packages/kernel/src/books/ruling.ts`, `books/parse.ts`, `books/bind.ts`, `books/edit.ts`, `books/appeal.ts`
- Test: `packages/kernel/test/books/parse.test.ts`, `books/bind.test.ts`, `books/edit.test.ts`, `books/appeal.test.ts`

**Interfaces:**
- Produces: `Ruling { title, binds: string[], because, evidence, overturnIf, date, overturnedBy: string | null }`, `formatRuling(r): string`, `parseBooks(md): Result<Ruling[], BooksParseError[]>`, `bindings(rulings, scope: string[]): Ruling[]`, `appendRuling(md, r): string`, `markOverturned(md, oldTitle, newTitle): Result<string, string>`, `appeals(rulings, events, threshold = 3): Appeal[]`.
- Glob intersection rule: ruling `binds` pattern B intersects scope pattern S when `picomatch(B)(base(S))` or `picomatch(S)(base(B))`, where `base()` is the longest literal path prefix (picomatch's `scan().base`). Exact equality also counts.
- Override telemetry: an `override` event with `payload.ruling === title`.

- [ ] **Step 1: Failing tests**

`packages/kernel/test/books/parse.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { parseBooks } from "../../src/books/parse.js";
import { formatRuling } from "../../src/books/ruling.js";

const md = `# Books

## Session tokens are validated in middleware, never in route handlers
- binds: src/api/**, src/auth/session.py
- because: three handlers skipped expiry checks
- evidence: 4a91c2e, tests/auth/test_expiry.py
- overturn-if: middleware ordering becomes configurable per-route
- date: 2026-03-04

## Old rule
- binds: src/old/**
- because: reasons
- evidence: abc
- overturn-if: never
- date: 2026-01-01
- OVERTURNED BY: Session tokens are validated in middleware, never in route handlers
`;

describe("parseBooks", () => {
  test("parses rulings with all fields", () => {
    const r = parseBooks(md);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(r.value[0]).toEqual({
      title: "Session tokens are validated in middleware, never in route handlers",
      binds: ["src/api/**", "src/auth/session.py"],
      because: "three handlers skipped expiry checks",
      evidence: "4a91c2e, tests/auth/test_expiry.py",
      overturnIf: "middleware ordering becomes configurable per-route",
      date: "2026-03-04",
      overturnedBy: null,
    });
    expect(r.value[1].overturnedBy).toBe(r.value[0].title);
  });

  test("a ruling without overturn-if is an error naming the ruling", () => {
    const r = parseBooks("## No death\n- binds: a/**\n- because: b\n- evidence: c\n- date: 2026-01-01\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0]).toMatchObject({ title: "No death", message: expect.stringMatching(/overturn-if/) });
  });

  test("empty or heading-only text is an empty Books", () => {
    expect(parseBooks("")).toEqual({ ok: true, value: [] });
    expect(parseBooks("# Books\n")).toEqual({ ok: true, value: [] });
  });

  test("formatRuling round-trips through parseBooks", () => {
    const r = parseBooks(md);
    if (!r.ok) throw new Error("parse failed");
    const again = parseBooks(r.value.map(formatRuling).join("\n"));
    expect(again).toEqual(r);
  });
});
```

`packages/kernel/test/books/bind.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { bindings } from "../../src/books/bind.js";
import type { Ruling } from "../../src/books/ruling.js";

const ruling = (title: string, binds: string[], overturnedBy: string | null = null): Ruling => ({
  title, binds, because: "b", evidence: "e", overturnIf: "o", date: "2026-01-01", overturnedBy,
});

describe("bindings", () => {
  const api = ruling("api", ["src/api/**"]);
  const session = ruling("session", ["src/auth/session.py"]);
  const dead = ruling("dead", ["src/**"], "api");

  test("scope narrower than bind matches", () => {
    expect(bindings([api], ["src/api/handlers/*.ts"]).map((r) => r.title)).toEqual(["api"]);
  });

  test("scope wider than bind matches", () => {
    expect(bindings([session], ["src/auth/**"]).map((r) => r.title)).toEqual(["session"]);
  });

  test("disjoint paths do not match", () => {
    expect(bindings([api, session], ["docs/**"])).toEqual([]);
  });

  test("overturned rulings are never returned", () => {
    expect(bindings([dead], ["src/api/**"])).toEqual([]);
  });

  test("exact literal equality matches", () => {
    expect(bindings([session], ["src/auth/session.py"]).map((r) => r.title)).toEqual(["session"]);
  });
});
```

`packages/kernel/test/books/edit.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { appendRuling, markOverturned } from "../../src/books/edit.js";
import { parseBooks } from "../../src/books/parse.js";
import type { Ruling } from "../../src/books/ruling.js";

const r = (title: string): Ruling => ({
  title, binds: ["src/**"], because: "b", evidence: "e", overturnIf: "o", date: "2026-09-21", overturnedBy: null,
});

describe("books edit", () => {
  test("appendRuling adds a parseable ruling with a blank line before it", () => {
    const md = appendRuling("# Books\n", r("First"));
    const parsed = parseBooks(md);
    expect(parsed.ok && parsed.value.map((x) => x.title)).toEqual(["First"]);
    expect(md).toMatch(/\n\n## First\n/);
  });

  test("appendRuling on empty text creates the heading", () => {
    expect(appendRuling("", r("First"))).toMatch(/^# Books\n/);
  });

  test("markOverturned adds the marker line and keeps the ruling", () => {
    const md = appendRuling(appendRuling("", r("Old")), r("New"));
    const out = markOverturned(md, "Old", "New");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const parsed = parseBooks(out.value);
    expect(parsed.ok && parsed.value.find((x) => x.title === "Old")?.overturnedBy).toBe("New");
  });

  test("markOverturned on an unknown title is an error", () => {
    expect(markOverturned("", "Nope", "New")).toEqual({ ok: false, error: "no ruling titled Nope" });
  });
});
```

`packages/kernel/test/books/appeal.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { appeals } from "../../src/books/appeal.js";
import type { Ruling } from "../../src/books/ruling.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const ruling: Ruling = {
  title: "Use middleware", binds: ["src/**"], because: "b", evidence: "e", overturnIf: "o", date: "2026-01-01", overturnedBy: null,
};
const override = (seq: number, title: string): LedgerEvent => ({
  seq, ts: "2026-09-21T10:00:00.000Z", actor: "capo", kind: "override", parent: seq - 1 || null, payload: { ruling: title },
});

describe("appeals", () => {
  test("flags a ruling overridden three times", () => {
    const out = appeals([ruling], [override(1, "Use middleware"), override(2, "Use middleware"), override(3, "Use middleware")]);
    expect(out).toEqual([{ ruling, overrides: 3 }]);
  });

  test("two overrides is not an appeal", () => {
    expect(appeals([ruling], [override(1, "Use middleware"), override(2, "Use middleware")])).toEqual([]);
  });

  test("overrides of other rulings do not count", () => {
    expect(appeals([ruling], [override(1, "x"), override(2, "x"), override(3, "x")])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement**

`packages/kernel/src/books/ruling.ts`:
```ts
export interface Ruling {
  readonly title: string;
  readonly binds: readonly string[];
  readonly because: string;
  readonly evidence: string;
  readonly overturnIf: string;
  readonly date: string;
  readonly overturnedBy: string | null;
}

export const OVERTURNED_KEY = "OVERTURNED BY";

export function formatRuling(r: Ruling): string {
  const lines = [
    `## ${r.title}`,
    `- binds: ${r.binds.join(", ")}`,
    `- because: ${r.because}`,
    `- evidence: ${r.evidence}`,
    `- overturn-if: ${r.overturnIf}`,
    `- date: ${r.date}`,
  ];
  if (r.overturnedBy !== null) lines.push(`- ${OVERTURNED_KEY}: ${r.overturnedBy}`);
  return `${lines.join("\n")}\n`;
}
```

`packages/kernel/src/books/parse.ts`:
```ts
import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { OVERTURNED_KEY, type Ruling } from "./ruling.js";

export interface BooksParseError {
  readonly title: string;
  readonly message: string;
}

const FIELD = /^- ([A-Za-z -]+?):\s*(.*)$/;

function finish(title: string, fields: Map<string, string>): Result<Ruling, BooksParseError> {
  const need = ["binds", "because", "evidence", "overturn-if", "date"] as const;
  for (const k of need) {
    if (!fields.has(k)) return err({ title, message: `missing ${k}` });
  }
  return ok({
    title,
    binds: (fields.get("binds") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    because: fields.get("because") ?? "",
    evidence: fields.get("evidence") ?? "",
    overturnIf: fields.get("overturn-if") ?? "",
    date: fields.get("date") ?? "",
    overturnedBy: fields.get(OVERTURNED_KEY) ?? null,
  });
}

/** `## title` opens a ruling; `- key: value` lines fill it. Anything else is ignored. */
export function parseBooks(md: string): Result<Ruling[], BooksParseError[]> {
  const rulings: Ruling[] = [];
  const errors: BooksParseError[] = [];
  let title: string | null = null;
  let fields = new Map<string, string>();
  const close = () => {
    if (title === null) return;
    const r = finish(title, fields);
    if (r.ok) rulings.push(r.value);
    else errors.push(r.error);
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      close();
      title = line.slice(3).trim();
      fields = new Map();
      continue;
    }
    const m = title !== null ? FIELD.exec(line) : null;
    if (m) fields.set(m[1].trim(), m[2].trim());
  }
  close();
  return errors.length > 0 ? err(errors) : ok(rulings);
}
```

`packages/kernel/src/books/bind.ts`:
```ts
import picomatch from "picomatch";
import type { Ruling } from "./ruling.js";

function base(pattern: string): string {
  return picomatch.scan(pattern).base;
}

/** Deterministic intersection: either pattern matches the other's literal prefix. */
export function globsIntersect(a: string, b: string): boolean {
  if (a === b) return true;
  const ma = picomatch(a, { dot: true });
  const mb = picomatch(b, { dot: true });
  const ba = base(a);
  const bb = base(b);
  return (bb !== "" && ma(bb)) || (ba !== "" && mb(ba));
}

/** Active rulings whose `binds` intersect any glob in `scope`. Lookup, not search. */
export function bindings(rulings: readonly Ruling[], scope: readonly string[]): Ruling[] {
  return rulings.filter(
    (r) => r.overturnedBy === null && r.binds.some((b) => scope.some((s) => globsIntersect(b, s))),
  );
}
```

`packages/kernel/src/books/edit.ts`:
```ts
import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { OVERTURNED_KEY, type Ruling, formatRuling } from "./ruling.js";

const HEADING = "# Books\n";

export function appendRuling(md: string, ruling: Ruling): string {
  const body = md === "" ? HEADING : md.endsWith("\n") ? md : `${md}\n`;
  return `${body}\n${formatRuling(ruling)}`;
}

/** Inserts `- OVERTURNED BY: <new>` after the old ruling's `- date:` line. The ruling stays. */
export function markOverturned(md: string, oldTitle: string, newTitle: string): Result<string, string> {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `## ${oldTitle}`);
  if (start === -1) return err(`no ruling titled ${oldTitle}`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end === -1) end = lines.length;
  const dateAt = lines.findIndex((l, i) => i > start && i < end && l.startsWith("- date:"));
  const insertAt = dateAt === -1 ? end : dateAt + 1;
  lines.splice(insertAt, 0, `- ${OVERTURNED_KEY}: ${newTitle}`);
  return ok(lines.join("\n"));
}
```

`packages/kernel/src/books/appeal.ts`:
```ts
import type { LedgerEvent } from "../ledger/event.js";
import type { Ruling } from "./ruling.js";

export interface Appeal {
  readonly ruling: Ruling;
  readonly overrides: number;
}

/** A ruling the Capo has overridden `threshold` times is up for appeal at the next sit-down. */
export function appeals(
  rulings: readonly Ruling[],
  events: readonly LedgerEvent[],
  threshold = 3,
): Appeal[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== "override" || typeof e.payload.ruling !== "string") continue;
    counts.set(e.payload.ruling, (counts.get(e.payload.ruling) ?? 0) + 1);
  }
  return rulings
    .filter((r) => r.overturnedBy === null && (counts.get(r.title) ?? 0) >= threshold)
    .map((r) => ({ ruling: r, overrides: counts.get(r.title) ?? 0 }));
}
```

Add to `index.ts`:
```ts
export { OVERTURNED_KEY, formatRuling } from "./books/ruling.js";
export type { Ruling } from "./books/ruling.js";
export { parseBooks } from "./books/parse.js";
export type { BooksParseError } from "./books/parse.js";
export { bindings, globsIntersect } from "./books/bind.js";
export { appendRuling, markOverturned } from "./books/edit.js";
export { appeals } from "./books/appeal.js";
export type { Appeal } from "./books/appeal.js";
```

- [ ] **Step 4: Run to pass; root lint/build green.**

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): the Books as case law with glob-bound lookup"
```

---

### Task 7: Scope check and `accept` runner

**Files:**
- Create: `packages/kernel/src/scope/check.ts`, `packages/kernel/src/accept/run.ts`
- Test: `packages/kernel/test/scope/check.test.ts`, `packages/kernel/test/accept/run.test.ts`

**Interfaces:**
- Produces: `checkScope(node: Pick<HitNode,"write_scope"|"forbidden">, changed: string[]): ScopeReport { ok, outside: string[], forbidden: string[] }`, `runAccept(cmd, { cwd, timeoutMs? }): Promise<AcceptResult { exit, stdout, stderr, durationMs, timedOut }>`.

- [ ] **Step 1: Failing tests**

`packages/kernel/test/scope/check.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { checkScope } from "../../src/scope/check.js";

const node = { write_scope: ["src/auth/**", "tests/auth/**"], forbidden: ["**/*.lock", "migrations/**"] };

describe("checkScope", () => {
  test("all changes inside scope is ok", () => {
    expect(checkScope(node, ["src/auth/a.ts", "tests/auth/a.test.ts"])).toEqual({ ok: true, outside: [], forbidden: [] });
  });

  test("a file outside write_scope is reported", () => {
    expect(checkScope(node, ["src/api/x.ts"])).toEqual({ ok: false, outside: ["src/api/x.ts"], forbidden: [] });
  });

  test("a forbidden file is reported as forbidden even if inside scope", () => {
    const r = checkScope({ write_scope: ["**"], forbidden: ["**/*.lock"] }, ["pnpm-lock.yaml", "a.lock"]);
    expect(r).toEqual({ ok: false, outside: [], forbidden: ["a.lock"] });
  });

  test("no changes is ok", () => {
    expect(checkScope(node, []).ok).toBe(true);
  });
});
```

`packages/kernel/test/accept/run.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { runAccept } from "../../src/accept/run.js";

describe("runAccept", () => {
  test("exit 0 with captured stdout", async () => {
    const r = await runAccept("echo ok", { cwd: process.cwd() });
    expect(r.exit).toBe(0);
    expect(r.stdout.trim()).toBe("ok");
    expect(r.timedOut).toBe(false);
  });

  test("non-zero exit is returned, not thrown", async () => {
    const r = await runAccept("echo nope >&2; exit 3", { cwd: process.cwd() });
    expect(r.exit).toBe(3);
    expect(r.stderr.trim()).toBe("nope");
  });

  test("timeout kills the command and reports it", async () => {
    const r = await runAccept("sleep 5", { cwd: process.cwd(), timeoutMs: 200 });
    expect(r.timedOut).toBe(true);
    expect(r.exit).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement**

`packages/kernel/src/scope/check.ts`:
```ts
import picomatch from "picomatch";
import type { HitNode } from "../hits/schema.js";

export interface ScopeReport {
  readonly ok: boolean;
  readonly outside: string[];
  readonly forbidden: string[];
}

export function checkScope(
  node: Pick<HitNode, "write_scope" | "forbidden">,
  changed: readonly string[],
): ScopeReport {
  const inScope = picomatch(node.write_scope, { dot: true });
  const isForbidden = node.forbidden.length > 0 ? picomatch(node.forbidden, { dot: true }) : () => false;
  const forbidden = changed.filter((f) => isForbidden(f));
  const outside = changed.filter((f) => !isForbidden(f) && !inScope(f));
  return { ok: forbidden.length === 0 && outside.length === 0, outside, forbidden };
}
```

`packages/kernel/src/accept/run.ts`:
```ts
import spawn from "cross-spawn";

export interface AcceptOptions {
  readonly cwd: string;
  readonly timeoutMs?: number;
}

export interface AcceptResult {
  readonly exit: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

/** Runs the node's acceptance predicate through `sh -c`. Exit code is the verdict. */
export function runAccept(cmd: string, opts: AcceptOptions): Promise<AcceptResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", cmd], {
      cwd: opts.cwd,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString("utf8");
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    const timer =
      opts.timeoutMs === undefined
        ? null
        : setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
          }, opts.timeoutMs);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        exit: code ?? (timedOut ? 124 : 1),
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
  });
}
```

Add to `index.ts`:
```ts
export { checkScope } from "./scope/check.js";
export type { ScopeReport } from "./scope/check.js";
export { runAccept } from "./accept/run.js";
export type { AcceptOptions, AcceptResult } from "./accept/run.js";
```

- [ ] **Step 4: Run to pass; root lint/build green.**

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): write-scope check and accept predicate runner"
```

---

### Task 8: Context rendering and Claude Code session replay

**Files:**
- Create: `packages/kernel/src/context/render.ts`, `packages/kernel/src/replay/claude-session.ts`
- Test: `packages/kernel/test/context/render.test.ts`, `packages/kernel/test/replay/claude-session.test.ts`

**Interfaces:**
- Produces: `estimateTokens(text): number` (`ceil(len/4)`), `renderContext({ hit, node, rulings, events, budgetTokens }): RenderedContext { text, tokens, eventsIncluded, eventsDropped }`, `parseSessionTurns(jsonl): SessionTurn[]` (one per unique assistant `message.id`: `{ id, ts, contextTokens, outputTokens }` where `contextTokens = input + cache_read + cache_creation`), `summarizeSession(turns): SessionSummary { turns, totalContextTokens, meanContextTokens, peakContextTokens }`, `compareToLedger(summary, renderedTokens): { transcriptTokens, ledgerTokens, ratio }` (`ledgerTokens = renderedTokens * turns`).

- [ ] **Step 1: Failing tests**

`packages/kernel/test/context/render.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { estimateTokens, renderContext } from "../../src/context/render.js";
import type { Hit } from "../../src/hits/schema.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const hit: Hit = {
  id: "auth", title: "Auth", created: "2026-09-21",
  nodes: [{ id: "h1", goal: "add expiry", depends_on: [], write_scope: ["src/auth/**"], forbidden: ["**/*.lock"], accept: "pytest -q", human_verify: false, budget: 20, rollback: "git revert HEAD" }],
};
const ev = (seq: number, kind: LedgerEvent["kind"], note: string): LedgerEvent => ({
  seq, ts: "2026-09-21T10:00:00.000Z", actor: "soldier", kind, hit: "auth", node: "h1", parent: seq - 1 || null, payload: { note },
});
const rulings = [{ title: "Validate in middleware", binds: ["src/auth/**"], because: "b", evidence: "e", overturnIf: "o", date: "2026-01-01", overturnedBy: null }];

describe("renderContext", () => {
  test("includes contract, bound rulings and events, newest last", () => {
    const r = renderContext({ hit, node: hit.nodes[0], rulings, events: [ev(1, "node_start", "go"), ev(2, "edit", "touched")], budgetTokens: 10_000 });
    expect(r.text).toContain("accept: pytest -q");
    expect(r.text).toContain("## Validate in middleware");
    expect(r.text.indexOf("go")).toBeLessThan(r.text.indexOf("touched"));
    expect(r).toMatchObject({ eventsIncluded: 2, eventsDropped: 0 });
    expect(r.tokens).toBe(estimateTokens(r.text));
  });

  test("drops the oldest events first to fit the budget", () => {
    const events = Array.from({ length: 50 }, (_, i) => ev(i + 1, "edit", `event number ${i + 1} with some padding text`));
    const r = renderContext({ hit, node: hit.nodes[0], rulings: [], events, budgetTokens: 250 });
    expect(r.eventsDropped).toBeGreaterThan(0);
    expect(r.text).toContain("event number 50");
    expect(r.text).not.toContain("event number 1 ");
    expect(r.tokens).toBeLessThanOrEqual(250);
  });

  test("ignores events from other nodes", () => {
    const other = { ...ev(3, "edit", "elsewhere"), node: "h2" };
    const r = renderContext({ hit, node: hit.nodes[0], rulings: [], events: [other], budgetTokens: 1000 });
    expect(r.text).not.toContain("elsewhere");
  });
});
```

`packages/kernel/test/replay/claude-session.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { compareToLedger, parseSessionTurns, summarizeSession } from "../../src/replay/claude-session.js";

const line = (o: unknown) => `${JSON.stringify(o)}\n`;
const assistant = (id: string, usage: Record<string, number>, ts: string) =>
  line({ type: "assistant", timestamp: ts, message: { id, role: "assistant", usage, content: [] } });

const jsonl =
  line({ type: "user", timestamp: "2026-09-21T10:00:00Z", message: { role: "user", content: "hi" } }) +
  assistant("m1", { input_tokens: 2, cache_read_input_tokens: 1000, cache_creation_input_tokens: 500, output_tokens: 50 }, "2026-09-21T10:00:01Z") +
  assistant("m1", { input_tokens: 2, cache_read_input_tokens: 1000, cache_creation_input_tokens: 500, output_tokens: 50 }, "2026-09-21T10:00:02Z") +
  assistant("m2", { input_tokens: 2, cache_read_input_tokens: 1500, cache_creation_input_tokens: 100, output_tokens: 20 }, "2026-09-21T10:00:05Z") +
  "not json\n";

describe("claude session replay", () => {
  test("one turn per unique assistant message id; context = input + cache read + cache creation", () => {
    const turns = parseSessionTurns(jsonl);
    expect(turns).toEqual([
      { id: "m1", ts: "2026-09-21T10:00:01Z", contextTokens: 1502, outputTokens: 50 },
      { id: "m2", ts: "2026-09-21T10:00:05Z", contextTokens: 1602, outputTokens: 20 },
    ]);
  });

  test("summary totals", () => {
    expect(summarizeSession(parseSessionTurns(jsonl))).toEqual({
      turns: 2, totalContextTokens: 3104, meanContextTokens: 1552, peakContextTokens: 1602,
    });
  });

  test("compareToLedger scales rendered tokens by turns", () => {
    expect(compareToLedger(summarizeSession(parseSessionTurns(jsonl)), 400)).toEqual({
      transcriptTokens: 3104, ledgerTokens: 800, ratio: 800 / 3104,
    });
  });

  test("empty session", () => {
    expect(summarizeSession([])).toEqual({ turns: 0, totalContextTokens: 0, meanContextTokens: 0, peakContextTokens: 0 });
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement**

`packages/kernel/src/context/render.ts`:
```ts
import { stringify } from "yaml";
import { type Ruling, formatRuling } from "../books/ruling.js";
import type { Hit, HitNode } from "../hits/schema.js";
import type { LedgerEvent } from "../ledger/event.js";

export interface RenderInput {
  readonly hit: Hit;
  readonly node: HitNode;
  readonly rulings: readonly Ruling[];
  readonly events: readonly LedgerEvent[];
  readonly budgetTokens: number;
}

export interface RenderedContext {
  readonly text: string;
  readonly tokens: number;
  readonly eventsIncluded: number;
  readonly eventsDropped: number;
}

/** Rough but stable: 4 chars ≈ 1 token. Good enough to compare renderings against each other. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function eventLine(e: LedgerEvent): string {
  const payload = Object.keys(e.payload).length > 0 ? ` ${JSON.stringify(e.payload)}` : "";
  return `- #${e.seq} ${e.ts} ${e.actor} ${e.kind}${payload}`;
}

/**
 * Context is a function of the contract, not of session length: the node's contract, the
 * rulings bound to its write_scope, and as many of this node's most recent events as fit.
 */
export function renderContext(input: RenderInput): RenderedContext {
  const head = [
    `# ${input.hit.title} — node ${input.node.id}`,
    "",
    "## Contract",
    "```yaml",
    stringify(input.node).trimEnd(),
    "```",
    "",
    "## Rulings that bind this scope",
    input.rulings.length > 0 ? input.rulings.map(formatRuling).join("\n") : "(none)",
    "",
    "## Recent events on this node",
  ].join("\n");
  const own = input.events.filter((e) => e.hit === input.hit.id && e.node === input.node.id);
  let kept = own.length;
  for (;;) {
    const lines = own.slice(own.length - kept).map(eventLine);
    const text = `${head}\n${lines.length > 0 ? lines.join("\n") : "(none)"}\n`;
    const tokens = estimateTokens(text);
    if (tokens <= input.budgetTokens || kept === 0) {
      return { text, tokens, eventsIncluded: kept, eventsDropped: own.length - kept };
    }
    kept -= 1;
  }
}
```

`packages/kernel/src/replay/claude-session.ts`:
```ts
export interface SessionTurn {
  readonly id: string;
  readonly ts: string;
  readonly contextTokens: number;
  readonly outputTokens: number;
}

export interface SessionSummary {
  readonly turns: number;
  readonly totalContextTokens: number;
  readonly meanContextTokens: number;
  readonly peakContextTokens: number;
}

export interface LedgerComparison {
  readonly transcriptTokens: number;
  readonly ledgerTokens: number;
  readonly ratio: number;
}

interface AssistantRecord {
  type: "assistant";
  timestamp?: string;
  message?: { id?: string; usage?: Record<string, unknown> };
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/** Claude Code writes one record per content block; dedupe by message id to get real API turns. */
export function parseSessionTurns(jsonl: string): SessionTurn[] {
  const seen = new Set<string>();
  const turns: SessionTurn[] = [];
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let rec: unknown;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const r = rec as Partial<AssistantRecord>;
    if (r.type !== "assistant" || !r.message?.id || !r.message.usage) continue;
    if (seen.has(r.message.id)) continue;
    seen.add(r.message.id);
    const u = r.message.usage;
    turns.push({
      id: r.message.id,
      ts: r.timestamp ?? "",
      contextTokens:
        num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens),
      outputTokens: num(u.output_tokens),
    });
  }
  return turns;
}

export function summarizeSession(turns: readonly SessionTurn[]): SessionSummary {
  const total = turns.reduce((s, t) => s + t.contextTokens, 0);
  return {
    turns: turns.length,
    totalContextTokens: total,
    meanContextTokens: turns.length === 0 ? 0 : Math.round(total / turns.length),
    peakContextTokens: turns.reduce((m, t) => Math.max(m, t.contextTokens), 0),
  };
}

/** What the session would have cost if every turn were rendered from the ledger instead. */
export function compareToLedger(summary: SessionSummary, renderedTokens: number): LedgerComparison {
  const ledgerTokens = renderedTokens * summary.turns;
  return {
    transcriptTokens: summary.totalContextTokens,
    ledgerTokens,
    ratio: summary.totalContextTokens === 0 ? 0 : ledgerTokens / summary.totalContextTokens,
  };
}
```

Add to `index.ts`:
```ts
export { estimateTokens, renderContext } from "./context/render.js";
export type { RenderInput, RenderedContext } from "./context/render.js";
export { compareToLedger, parseSessionTurns, summarizeSession } from "./replay/claude-session.js";
export type { LedgerComparison, SessionSummary, SessionTurn } from "./replay/claude-session.js";
```

- [ ] **Step 4: Run to pass; root lint/build green.**

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): per-node context rendering and session replay"
```

---

### Task 9: CLI family commands

**Files:**
- Create: `packages/cli/src/commands/family/index.ts`, `output.ts`, `ledger.ts`, `board.ts`, `hit.ts`, `books.ts`, `context.ts`, `rewind.ts`, `replay.ts`
- Modify: `packages/cli/package.json` (add `"@capo/kernel": "workspace:*"`), `packages/cli/src/cli.ts` (help text + flags + dispatch)
- Test: `packages/cli/test/family.test.ts`

**Interfaces:**
- Consumes everything exported by `@capo/kernel`.
- Produces: `runFamilyCommand(input: string[], flags: FamilyFlags, io: FamilyIo): Promise<number>` where `FamilyFlags = { json: boolean; kind?: string; payload?: string; note?: string; budget?: number; actor?: string; to?: number }` and `FamilyIo = { cwd: string; stdout(line: string): void; stderr(line: string): void; now?: () => string }`.
- Command surface (plain aliases in parentheses):
  - `capo ledger tail [n]` — last n live events (default 20)
  - `capo ledger append --kind <kind> [<hit> [<node>]] [--payload '{"..."}'] [--actor a]`
  - `capo board [<hit>]` (`status`) — node table
  - `capo hit validate <hit>`
  - `capo hit next <hit>` — prints next runnable node contract
  - `capo hit start <hit> <node>` — appends `node_start` with `payload.head = git rev-parse HEAD`
  - `capo hit done <hit> <node>` — scope check on `git diff --name-only HEAD` + untracked, runs `accept`, appends `accept_run` then `node_done`/`node_failed`; exit code = accept exit (scope violation → exit 3, no accept run)
  - `capo hit deviation <hit> <node> --note "..."` — appends `deviation`
  - `capo books bind <glob>...` — rulings bound to the given globs
  - `capo books appeal` — rulings overridden ≥ 3 times
  - `capo books override "<ruling title>" --note "..."` — appends `override`
  - `capo context <hit> <node> [--budget 4000]` — rendered context
  - `capo rewind --to <seq>` — appends `rewind`
  - `capo replay <session.jsonl> <hit> <node> [--budget 4000]` — transcript vs ledger tokens

- [ ] **Step 1: Failing test**

`packages/cli/test/family.test.ts`:
```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { runFamilyCommand } from "../src/commands/family/index.js";

const HIT = `id: demo
title: Demo
created: "2026-09-21"
nodes:
  - id: h1
    goal: create the file
    write_scope: ["out/**"]
    forbidden: ["**/*.lock"]
    accept: "test -f out/a.txt"
    budget: 5
  - id: h2
    goal: second
    depends_on: [h1]
    write_scope: ["out/**"]
    accept: "true"
    budget: 5
`;

async function repo() {
  const cwd = await mkdtemp(path.join(tmpdir(), "capo-fam-"));
  execSync("git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", { cwd });
  await import("node:fs/promises").then((fs) => fs.mkdir(path.join(cwd, ".capo", "hits"), { recursive: true }));
  await writeFile(path.join(cwd, ".capo", "hits", "demo.yaml"), HIT);
  await writeFile(
    path.join(cwd, ".capo", "books.md"),
    "# Books\n\n## Outputs live under out/\n- binds: out/**\n- because: b\n- evidence: e\n- overturn-if: o\n- date: 2026-09-21\n",
  );
  const out: string[] = [];
  const errs: string[] = [];
  let tick = 0;
  const io = {
    cwd,
    stdout: (l: string) => out.push(l),
    stderr: (l: string) => errs.push(l),
    now: () => new Date(Date.UTC(2026, 8, 21, 12, 0, tick++)).toISOString(),
  };
  const run = (argv: string, flags: Record<string, unknown> = {}) =>
    runFamilyCommand(argv.split(" ").filter(Boolean), { json: true, ...flags }, io);
  const last = () => JSON.parse(out.at(-1) ?? "null");
  return { cwd, run, last, out, errs };
}

describe("capo family commands", () => {
  test("hit validate / next / start / done happy path", async () => {
    const r = await repo();
    expect(await r.run("hit validate demo")).toBe(0);
    expect(await r.run("hit next demo")).toBe(0);
    expect(r.last().id).toBe("h1");
    expect(await r.run("hit start demo h1")).toBe(0);
    expect(r.last()).toMatchObject({ kind: "node_start", seq: 1 });
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(r.cwd, "out")));
    await writeFile(path.join(r.cwd, "out", "a.txt"), "x");
    expect(await r.run("hit done demo h1")).toBe(0);
    expect(r.last()).toMatchObject({ status: "done", accept: { exit: 0 }, scope: { ok: true } });
    expect(await r.run("board demo")).toBe(0);
    expect(r.last().hits.demo.nodes).toMatchObject({ h1: { status: "done" }, h2: { status: "pending" } });
  });

  test("hit done refuses on a scope violation without running accept", async () => {
    const r = await repo();
    await r.run("hit start demo h1");
    await writeFile(path.join(r.cwd, "stray.lock"), "x");
    expect(await r.run("hit done demo h1")).toBe(3);
    expect(r.last()).toMatchObject({ status: "scope_violation", scope: { forbidden: ["stray.lock"] } });
  });

  test("hit done with failing accept records node_failed and returns the exit code", async () => {
    const r = await repo();
    await r.run("hit start demo h1");
    expect(await r.run("hit done demo h1")).toBe(1);
    expect(r.last()).toMatchObject({ status: "failed", accept: { exit: 1 } });
  });

  test("ledger append + tail, books bind, deviation, rewind, context", async () => {
    const r = await repo();
    expect(await r.run("ledger append demo h1", { kind: "edit", payload: '{"file":"out/a.txt"}' })).toBe(0);
    expect(await r.run("ledger tail 5")).toBe(0);
    expect(r.last()).toHaveLength(1);
    expect(await r.run("books bind out/x/**")).toBe(0);
    expect(r.last().map((x: { title: string }) => x.title)).toEqual(["Outputs live under out/"]);
    expect(await r.run("hit deviation demo h1", { note: "need migrations/" })).toBe(0);
    expect(r.last()).toMatchObject({ kind: "deviation", payload: { note: "need migrations/" } });
    expect(await r.run("rewind", { to: 1 })).toBe(0);
    expect(await r.run("ledger tail 10")).toBe(0);
    expect(r.last().map((e: { seq: number }) => e.seq)).toEqual([1, 3]);
    expect(await r.run("context demo h1", { budget: 2000 })).toBe(0);
    expect(r.last().text).toContain("## Outputs live under out/");
  });

  test("books override x3 surfaces an appeal", async () => {
    const r = await repo();
    for (let i = 0; i < 3; i++) await r.run("books override Outputs live under out/", { note: "n" });
    expect(await r.run("books appeal")).toBe(0);
    expect(r.last()).toMatchObject([{ overrides: 3 }]);
  });

  test("replay reports transcript vs ledger tokens", async () => {
    const r = await repo();
    const session = path.join(r.cwd, "s.jsonl");
    await writeFile(
      session,
      `${JSON.stringify({ type: "assistant", timestamp: "t", message: { id: "m1", usage: { input_tokens: 10, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0, output_tokens: 1 } } })}\n`,
    );
    expect(await r.run(`replay ${session} demo h1`, { budget: 4000 })).toBe(0);
    expect(r.last()).toMatchObject({ transcriptTokens: 5010, turns: 1 });
    expect(r.last().ratio).toBeLessThan(1);
  });

  test("unknown subcommand is exit 2 with a usage line", async () => {
    const r = await repo();
    expect(await r.run("bogus")).toBe(2);
    expect(r.errs.at(-1)).toMatch(/usage/i);
  });

  test("no .capo dir is exit 2 with a hint to hold a sit-down", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "capo-none-"));
    const errs: string[] = [];
    const code = await runFamilyCommand(["board"], { json: true }, { cwd, stdout: () => {}, stderr: (l) => errs.push(l) });
    expect(code).toBe(2);
    expect(errs.at(-1)).toMatch(/sit-down/);
  });
});
```

- [ ] **Step 2: Run to fail** — `cd packages/cli && pnpm vitest run test/family.test.ts`.

- [ ] **Step 3: Implement**

`packages/cli/package.json` dependencies: add `"@capo/kernel": "workspace:*"`; run `pnpm install`.

`packages/cli/src/commands/family/output.ts`:
```ts
export interface FamilyIo {
  readonly cwd: string;
  stdout(line: string): void;
  stderr(line: string): void;
  readonly now?: () => string;
}

export interface FamilyFlags {
  readonly json: boolean;
  readonly kind?: string;
  readonly payload?: string;
  readonly note?: string;
  readonly budget?: number;
  readonly actor?: string;
  readonly to?: number;
}

export function emit(io: FamilyIo, flags: FamilyFlags, value: unknown, text: () => string): void {
  io.stdout(flags.json ? JSON.stringify(value) : text());
}

export function fail(io: FamilyIo, message: string, code = 2): number {
  io.stderr(message);
  return code;
}
```

`packages/cli/src/commands/family/index.ts`:
```ts
import { findCapoDir } from "@capo/kernel";
import { runBoard } from "./board.js";
import { runBooks } from "./books.js";
import { runContext } from "./context.js";
import { runHit } from "./hit.js";
import { runLedger } from "./ledger.js";
import { type FamilyFlags, type FamilyIo, fail } from "./output.js";
import { runReplay } from "./replay.js";
import { runRewind } from "./rewind.js";

export const FAMILY_COMMANDS = ["ledger", "board", "status", "hit", "books", "context", "rewind", "replay"] as const;

export const FAMILY_USAGE = `usage:
  capo ledger tail [n] | ledger append --kind <kind> [<hit> [<node>]] [--payload json] [--actor a]
  capo board [<hit>]                      (alias: status)
  capo hit validate|next <hit> | hit start|done <hit> <node> | hit deviation <hit> <node> --note "..."
  capo books bind <glob>... | books appeal | books override "<ruling>" --note "..."
  capo context <hit> <node> [--budget n]
  capo rewind --to <seq>
  capo replay <session.jsonl> <hit> <node> [--budget n]`;

export interface FamilyCtx {
  readonly capoDir: string;
  readonly io: FamilyIo;
  readonly flags: FamilyFlags;
}

export function isFamilyCommand(cmd: string): cmd is (typeof FAMILY_COMMANDS)[number] {
  return (FAMILY_COMMANDS as readonly string[]).includes(cmd);
}

export async function runFamilyCommand(
  input: readonly string[],
  flags: FamilyFlags,
  io: FamilyIo,
): Promise<number> {
  const [cmd, ...rest] = input;
  if (!cmd || !isFamilyCommand(cmd)) return fail(io, FAMILY_USAGE);
  const capoDir = await findCapoDir(io.cwd);
  if (capoDir === null) {
    return fail(io, "no .capo/ here — hold a sit-down first (/sitdown) to open one");
  }
  const ctx: FamilyCtx = { capoDir, io, flags };
  switch (cmd) {
    case "ledger":
      return runLedger(ctx, rest);
    case "board":
    case "status":
      return runBoard(ctx, rest);
    case "hit":
      return runHit(ctx, rest);
    case "books":
      return runBooks(ctx, rest);
    case "context":
      return runContext(ctx, rest);
    case "rewind":
      return runRewind(ctx);
    case "replay":
      return runReplay(ctx, rest);
  }
}
```

`packages/cli/src/commands/family/ledger.ts`:
```ts
import { EVENT_KINDS, type EventKind, createFileLedger, liveEvents } from "@capo/kernel";
import type { FamilyCtx } from "./index.js";
import { FAMILY_USAGE } from "./index.js";
import { emit, fail } from "./output.js";

export async function readLive(ctx: FamilyCtx) {
  const ledger = createFileLedger(ctx.capoDir, { now: ctx.io.now });
  const read = await ledger.read();
  if (!read.ok) throw new Error(`ledger corrupt at line ${read.error.line}: ${read.error.reason}`);
  return { ledger, all: read.value, live: liveEvents(read.value) };
}

export function parsePayload(text: string | undefined): Record<string, unknown> | null {
  if (text === undefined) return {};
  try {
    const v = JSON.parse(text);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export async function runLedger(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "tail") {
    const n = Number.parseInt(rest[0] ?? "20", 10);
    const { live } = await readLive(ctx);
    const tail = live.slice(-n);
    emit(ctx.io, ctx.flags, tail, () =>
      tail.map((e) => `#${e.seq} ${e.ts} ${e.actor} ${e.kind} ${e.hit ?? ""}/${e.node ?? ""} ${JSON.stringify(e.payload)}`).join("\n"),
    );
    return 0;
  }
  if (sub === "append") {
    const kind = ctx.flags.kind;
    if (!kind || !(EVENT_KINDS as readonly string[]).includes(kind)) {
      return fail(ctx.io, `--kind must be one of: ${EVENT_KINDS.join(", ")}`);
    }
    const payload = parsePayload(ctx.flags.payload);
    if (payload === null) return fail(ctx.io, "--payload must be a JSON object");
    const { ledger } = await readLive(ctx);
    const event = await ledger.append({
      actor: ctx.flags.actor ?? "capo",
      kind: kind as EventKind,
      ...(rest[0] ? { hit: rest[0] } : {}),
      ...(rest[1] ? { node: rest[1] } : {}),
      payload,
    });
    emit(ctx.io, ctx.flags, event, () => `#${event.seq} ${event.kind} appended`);
    return 0;
  }
  return fail(ctx.io, FAMILY_USAGE);
}
```

`packages/cli/src/commands/family/board.ts`:
```ts
import { type Hit, listHits, loadHit, materialize } from "@capo/kernel";
import type { FamilyCtx } from "./index.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export async function loadHits(ctx: FamilyCtx, only?: string): Promise<Hit[]> {
  const slugs = only ? [only] : await listHits(ctx.capoDir);
  const hits: Hit[] = [];
  for (const slug of slugs) {
    const r = await loadHit(ctx.capoDir, slug);
    if (!r.ok) throw new Error(`hit ${slug}: ${r.error.map((e) => e.message).join("; ")}`);
    hits.push(r.value);
  }
  return hits;
}

const GLYPH = { pending: "○", blocked: "◌", running: "●", done: "✓", failed: "✗" } as const;

export async function runBoard(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  let hits: Hit[];
  try {
    hits = await loadHits(ctx, args[0]);
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
  const { all } = await readLive(ctx);
  const board = materialize(all, hits);
  emit(ctx.io, ctx.flags, board, () =>
    hits
      .map((h) =>
        [
          `${h.id}  ${h.title}`,
          ...h.nodes.map((n) => {
            const s = board.hits[h.id].nodes[n.id];
            const extra = s.status === "running" ? `  calls ${s.toolCalls}/${n.budget}` : "";
            return `  ${GLYPH[s.status]} ${n.id}  ${n.goal}${extra}${s.deviations ? `  ⚠${s.deviations}` : ""}`;
          }),
        ].join("\n"),
      )
      .join("\n\n"),
  );
  return 0;
}
```

`packages/cli/src/commands/family/hit.ts`:
```ts
import { execFileSync } from "node:child_process";
import path from "node:path";
import { checkScope, loadHit, materialize, nextRunnable, runAccept, validateHit } from "@capo/kernel";
import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import { hitPath } from "@capo/kernel";
import type { FamilyCtx } from "./index.js";
import { FAMILY_USAGE } from "./index.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Tracked changes vs HEAD plus untracked files, repo-relative, made relative to `.capo`'s parent. */
export function changedFiles(cwd: string): string[] {
  const root = git(cwd, ["rev-parse", "--show-toplevel"]);
  const tracked = git(root, ["diff", "--name-only", "HEAD"]);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  return `${tracked}\n${untracked}`.split("\n").map((l) => l.trim()).filter(Boolean);
}

export async function runHit(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, slug, nodeId] = args;
  if (!sub || !slug) return fail(ctx.io, FAMILY_USAGE);

  if (sub === "validate") {
    let raw: unknown;
    try {
      raw = parse(await readFile(hitPath(ctx.capoDir, slug), "utf8"));
    } catch {
      return fail(ctx.io, `hit ${slug} not found at ${path.relative(ctx.io.cwd, hitPath(ctx.capoDir, slug))}`);
    }
    const r = validateHit(raw);
    if (!r.ok) {
      emit(ctx.io, ctx.flags, { ok: false, errors: r.error }, () => r.error.map((e) => `${e.path}: ${e.message}`).join("\n"));
      return 1;
    }
    emit(ctx.io, ctx.flags, { ok: true, nodes: r.value.nodes.length }, () => `${slug}: ${r.value.nodes.length} nodes, contracts valid`);
    return 0;
  }

  const loaded = await loadHit(ctx.capoDir, slug);
  if (!loaded.ok) return fail(ctx.io, loaded.error.map((e) => e.message).join("; "));
  const hit = loaded.value;
  const { ledger, all } = await readLive(ctx);

  if (sub === "next") {
    const node = nextRunnable(hit, materialize(all, [hit]));
    if (!node) {
      emit(ctx.io, ctx.flags, null, () => "nothing runnable: all nodes running, done, failed or blocked");
      return 1;
    }
    emit(ctx.io, ctx.flags, node, () => `${node.id}: ${node.goal}\n  scope ${node.write_scope.join(", ")}\n  accept ${node.accept ?? "(human_verify)"}\n  budget ${node.budget}`);
    return 0;
  }

  const node = hit.nodes.find((n) => n.id === nodeId);
  if (!node) return fail(ctx.io, `node ${nodeId ?? "?"} not in hit ${slug}`);

  if (sub === "start") {
    const head = git(ctx.io.cwd, ["rev-parse", "HEAD"]);
    const e = await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: "node_start", hit: slug, node: node.id, payload: { head } });
    emit(ctx.io, ctx.flags, e, () => `[hit ${slug}/${node.id} | scope: ${node.write_scope.join(",")} | accept: ${node.accept ?? "human_verify"} | budget 0/${node.budget}]`);
    return 0;
  }

  if (sub === "deviation") {
    if (!ctx.flags.note) return fail(ctx.io, "--note is required: what you need, why, what breaks without it");
    const e = await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: "deviation", hit: slug, node: node.id, payload: { note: ctx.flags.note } });
    emit(ctx.io, ctx.flags, e, () => `⚠ ${slug}/${node.id} deviation #${e.seq}: ${ctx.flags.note}`);
    return 0;
  }

  if (sub === "done") {
    const scope = checkScope(node, changedFiles(ctx.io.cwd));
    if (!scope.ok) {
      emit(ctx.io, ctx.flags, { status: "scope_violation", scope }, () => `scope violation — outside: ${scope.outside.join(", ") || "-"}; forbidden: ${scope.forbidden.join(", ") || "-"}`);
      return 3;
    }
    if (node.accept === undefined) {
      emit(ctx.io, ctx.flags, { status: "human_verify", reason: node.human_verify_reason }, () => `human_verify: ${node.human_verify_reason}`);
      return 0;
    }
    const accept = await runAccept(node.accept, { cwd: ctx.io.cwd, timeoutMs: 10 * 60 * 1000 });
    await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: "accept_run", hit: slug, node: node.id, payload: { cmd: node.accept, exit: accept.exit, durationMs: accept.durationMs, timedOut: accept.timedOut } });
    const status = accept.exit === 0 ? "done" : "failed";
    await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: accept.exit === 0 ? "node_done" : "node_failed", hit: slug, node: node.id, payload: { accept_exit: accept.exit, files: changedFiles(ctx.io.cwd) } });
    emit(ctx.io, ctx.flags, { status, scope, accept }, () => `${status.toUpperCase()} — accept exit ${accept.exit} (${accept.durationMs} ms)\n${accept.stdout}${accept.stderr}`);
    return accept.exit;
  }

  return fail(ctx.io, FAMILY_USAGE);
}
```

`packages/cli/src/commands/family/books.ts`:
```ts
import { readFile } from "node:fs/promises";
import { type Ruling, appeals, bindings, booksPath, parseBooks } from "@capo/kernel";
import type { FamilyCtx } from "./index.js";
import { FAMILY_USAGE } from "./index.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export async function loadRulings(ctx: FamilyCtx): Promise<Ruling[]> {
  let text = "";
  try {
    text = await readFile(booksPath(ctx.capoDir), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const r = parseBooks(text);
  if (!r.ok) throw new Error(`books.md: ${r.error.map((e) => `${e.title}: ${e.message}`).join("; ")}`);
  return r.value;
}

const line = (r: Ruling) => `## ${r.title}\n  binds ${r.binds.join(", ")}\n  overturn-if ${r.overturnIf}`;

export async function runBooks(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, ...rest] = args;
  let rulings: Ruling[];
  try {
    rulings = await loadRulings(ctx);
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
  if (sub === "bind") {
    if (rest.length === 0) return fail(ctx.io, "books bind needs at least one glob");
    const bound = bindings(rulings, rest);
    emit(ctx.io, ctx.flags, bound, () => (bound.length ? bound.map(line).join("\n") : "(no rulings bind this scope)"));
    return 0;
  }
  if (sub === "appeal") {
    const { live } = await readLive(ctx);
    const up = appeals(rulings, live);
    emit(ctx.io, ctx.flags, up, () => (up.length ? up.map((a) => `${a.overrides}× overridden: ${a.ruling.title}`).join("\n") : "(no rulings up for appeal)"));
    return 0;
  }
  if (sub === "override") {
    const title = rest.join(" ");
    if (!rulings.some((r) => r.title === title)) return fail(ctx.io, `no ruling titled ${title}`);
    const { ledger } = await readLive(ctx);
    const e = await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: "override", payload: { ruling: title, note: ctx.flags.note ?? "" } });
    emit(ctx.io, ctx.flags, e, () => `override #${e.seq} recorded against: ${title}`);
    return 0;
  }
  return fail(ctx.io, FAMILY_USAGE);
}
```

`packages/cli/src/commands/family/context.ts`:
```ts
import { bindings, loadHit, renderContext } from "@capo/kernel";
import { loadRulings } from "./books.js";
import type { FamilyCtx } from "./index.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export const DEFAULT_BUDGET = 4000;

export async function renderFor(ctx: FamilyCtx, slug: string, nodeId: string) {
  const loaded = await loadHit(ctx.capoDir, slug);
  if (!loaded.ok) throw new Error(loaded.error.map((e) => e.message).join("; "));
  const node = loaded.value.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`node ${nodeId} not in hit ${slug}`);
  const rulings = bindings(await loadRulings(ctx), node.write_scope);
  const { live } = await readLive(ctx);
  return renderContext({ hit: loaded.value, node, rulings, events: live, budgetTokens: ctx.flags.budget ?? DEFAULT_BUDGET });
}

export async function runContext(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [slug, nodeId] = args;
  if (!slug || !nodeId) return fail(ctx.io, "context <hit> <node>");
  try {
    const r = await renderFor(ctx, slug, nodeId);
    emit(ctx.io, ctx.flags, r, () => r.text);
    return 0;
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
}
```

`packages/cli/src/commands/family/rewind.ts`:
```ts
import type { FamilyCtx } from "./index.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export async function runRewind(ctx: FamilyCtx): Promise<number> {
  const to = ctx.flags.to;
  if (to === undefined || !Number.isInteger(to) || to < 0) return fail(ctx.io, "rewind --to <seq>");
  const { ledger, all } = await readLive(ctx);
  const last = all.at(-1)?.seq ?? 0;
  if (to > last) return fail(ctx.io, `cannot rewind to ${to}: ledger ends at ${last}`);
  const cut = all.filter((e) => e.seq > to).map((e) => e.seq);
  const e = await ledger.append({ actor: ctx.flags.actor ?? "capo", kind: "rewind", parent: to === 0 ? null : to, payload: { to, cut } });
  emit(ctx.io, ctx.flags, e, () => `rewound to #${to}; ${cut.length} events cut (still in the ledger, no longer on the board). File state is yours to reset: git checkout <sha from the node_start you kept>.`);
  return 0;
}
```

`packages/cli/src/commands/family/replay.ts`:
```ts
import { readFile } from "node:fs/promises";
import { compareToLedger, parseSessionTurns, summarizeSession } from "@capo/kernel";
import { renderFor } from "./context.js";
import type { FamilyCtx } from "./index.js";
import { emit, fail } from "./output.js";

export async function runReplay(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [file, slug, nodeId] = args;
  if (!file || !slug || !nodeId) return fail(ctx.io, "replay <session.jsonl> <hit> <node>");
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return fail(ctx.io, `cannot read ${file}`);
  }
  try {
    const summary = summarizeSession(parseSessionTurns(text));
    const rendered = await renderFor(ctx, slug, nodeId);
    const cmp = compareToLedger(summary, rendered.tokens);
    const out = { ...summary, renderedTokensPerTurn: rendered.tokens, ...cmp };
    emit(ctx.io, ctx.flags, out, () =>
      [
        `turns                ${summary.turns}`,
        `transcript tokens    ${summary.totalContextTokens} (mean ${summary.meanContextTokens}, peak ${summary.peakContextTokens})`,
        `ledger render/turn   ${rendered.tokens} [est. chars/4]`,
        `ledger tokens        ${cmp.ledgerTokens}`,
        `ratio                ${cmp.ratio.toFixed(2)}  (blueprint go: ≤ 0.60, cut D1: > 0.80)`,
      ].join("\n"),
    );
    return 0;
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
}
```

`packages/cli/src/cli.ts` — add to the help text after `whack`:
```
	  ledger        Read or append the family ledger (.capo/ledger.jsonl)
	  board         Show the hit list board (alias: status)
	  hit           validate | next | start | done | deviation
	  books         bind <glob>... | appeal | override "<ruling>"
	  context       Render the per-node context for a hit node
	  rewind        Cut the board back to a ledger seq (--to)
	  replay        Compare a Claude Code session's tokens against ledger rendering
```
add flags:
```ts
      kind: { type: "string" },
      payload: { type: "string" },
      note: { type: "string" },
      budget: { type: "number" },
      actor: { type: "string" },
      to: { type: "number" },
```
and before `if (command === "plan")`:
```ts
import { isFamilyCommand, runFamilyCommand } from "./commands/family/index.js";
// …
if (isFamilyCommand(command)) {
  process.exit(
    await runFamilyCommand(cli.input.slice(1), cli.flags, {
      cwd: process.cwd(),
      stdout: (l) => console.log(l),
      stderr: (l) => console.error(l),
    }),
  );
}
```
Note: the existing `status` TUI screen is replaced by the board — `status` was never implemented in `App.tsx` beyond the README, so nothing breaks; confirm with `grep -n status packages/cli/src/ui/App.tsx`.

- [ ] **Step 4: Run to pass** — `pnpm vitest run test/family.test.ts` → 8 passed. Root: `pnpm run lint && pnpm run build && pnpm run test`.

- [ ] **Step 5: Smoke the binary**

```bash
cd /home/kilisan/capo && node packages/cli/dist/cli.js board 2>&1
```
Expected: `no .capo/ here — hold a sit-down first (/sitdown) to open one`, exit 2.

- [ ] **Step 6: Commit**

```bash
git add packages/cli pnpm-lock.yaml
git commit -m "feat(cli): family commands over @capo/kernel"
```

---

### Task 10: Ground the skills in the CLI; seed `.capo/` in this repo

**Files:**
- Modify: `plugin/skills/hit/SKILL.md`, `plugin/skills/sitdown/SKILL.md`, `plugin/skills/loyalty-check/SKILL.md`, `plugin/skills/books/SKILL.md`, `plugin/skills/capo/SKILL.md`, `plugin/README.md`
- Create: `.capo/books.md`, `.capo/ledger.jsonl` (empty), `.capo/hits/.gitkeep`

- [ ] **Step 1: `plugin/skills/hit/SKILL.md`** — replace the file with:

````markdown
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
````

- [ ] **Step 2: `plugin/skills/sitdown/SKILL.md`** — replace steps 5–6 with:

````markdown
5. **Write the file** to `.capo/hits/<slug>.yaml` (create `.capo/hits/` if missing) with the
   top-level shape `id`, `title`, `created` (YYYY-MM-DD), `nodes`. Then run
   `capo hit validate <slug>` and fix every error it prints — an invalid contract is not a plan.
6. `capo ledger append --kind sitdown_open <slug> --payload '{"nodes":<n>}'`, print the path,
   then **stop**. Show the list and wait. Do not start work in the same turn.
````
and add `Bash(capo *)` to `allowed-tools`, plus this line under "Repo state":
```
- Rulings up for appeal: !`capo books appeal 2>/dev/null || echo "(no ledger yet)"`
```

- [ ] **Step 3: `plugin/skills/loyalty-check/SKILL.md`** — add `Bash(capo *)` to `allowed-tools` and add under "Evidence":
```
- Board: !`capo board 2>/dev/null || echo "(no board)"`
- Rulings bound to the changed paths: !`capo books bind $(git diff HEAD --name-only | sed 's#/[^/]*$#/**#' | sort -u) 2>/dev/null || echo "(none)"`
```

- [ ] **Step 4: `plugin/skills/books/SKILL.md`** — add `Bash(capo *)` to `allowed-tools`; add under "State":
```
- Up for appeal: !`capo books appeal 2>/dev/null || echo "(no ledger)"`
```
and a step 6:
```
6. If a ruling was written: `capo ledger append --kind ruling_added --payload '{"title":"<rule>"}'`.
   If a ruling up for appeal was overturned, mark it `OVERTURNED BY` as in step 4.
```

- [ ] **Step 5: `plugin/skills/capo/SKILL.md`** — add `Bash(capo *)` to `allowed-tools`; append to "State — the only source of truth":
```
The `capo` CLI (`capo board`, `capo hit …`, `capo books …`, `capo context …`, `capo rewind --to`)
is how you read and write that state. Prefer it over hand-editing `.capo/`.
```

- [ ] **Step 6: `plugin/README.md`** — replace the Install section with:
```markdown
## Install (project-local, no marketplace)

    ./plugin/install.sh        # symlinks skills+agents into ~/.claude, links `capo` into ~/.local/bin

Or by hand: copy `skills/*` to `~/.claude/skills/`, `agents/*` to `~/.claude/agents/`, and put
`capo` (packages/cli/dist/cli.js) on PATH. The skills call `capo board|hit|books|context`.
```

- [ ] **Step 7: Seed `.capo/`** — rulings distilled from ADR 0002–0004 (decisions a future session would otherwise re-litigate):

`.capo/books.md`:
```markdown
# Books

## One executor: the desktop app shells out to the built CLI
- binds: packages/engine/**, apps/**
- because: a second Rust-native executor would drift from the TypeScript step semantics (ADR 0002)
- evidence: docs/adr/0002-single-executor-via-cli-subprocess.md
- overturn-if: a step kind cannot be expressed as a subprocess call, or Node stops being a prerequisite
- date: 2026-09-21

## libSQL is the default Drizzle driver
- binds: packages/core/src/recipes/drizzle.ts, packages/core/src/types/stack.ts
- because: better-sqlite3 needs node-gyp and pg needs a server; libsql runs anywhere Node does (ADR 0003)
- evidence: docs/adr/0003-libsql-default-driver.md
- overturn-if: a stack needs Postgres semantics that libsql cannot fake
- date: 2026-09-21

## The forge dispatch carries a selection, never a plan
- binds: forge/**, packages/core/src/planner/**
- because: workflow_dispatch inputs cap at 65535 chars and leak into run logs (ADR 0004)
- evidence: docs/adr/0004-forge-sends-selection-not-plan.md
- overturn-if: dispatch moves to repository_dispatch with an artifact upload
- date: 2026-09-21
```

`.capo/ledger.jsonl`: empty file. `.capo/hits/.gitkeep`: empty.

- [ ] **Step 8: Verify** — `node packages/cli/dist/cli.js books bind "packages/engine/src/**"` prints the executor ruling; `node packages/cli/dist/cli.js board` prints nothing but exits 0 (no hits yet). Re-run `./plugin/install.sh` so `~/.claude` points at the repo copies and `capo` resolves; `command -v capo`.

- [ ] **Step 9: Commit**

```bash
git add plugin .capo
git commit -m "feat(plugin): ground rituals in capo CLI; seed the Books"
```

---

### Task 11: Ten acceptance predicates for real past work (blueprint §8, move 3)

**Files:**
- Create: `docs/capo/acceptance-predicates.md`

Each predicate is written against a commit already in `git log` and run from the repo root; every line records the real exit code. Any predicate that cannot be written is recorded as `human_verify` with the reason — that is data for the contract model, not a failure of the doc.

- [ ] **Step 1: Write the file**

```markdown
# Ten acceptance predicates for work already done

Blueprint §8: "write ten acceptance predicates for work you actually did last month. If you
can't write them, the contract model needs rethinking." Each row is a commit in this repo's
history, the `accept` command that would have gated it, and what happened when it was run
on 2026-09-21 at the current HEAD.

| # | Commit | Node goal | accept | exit |
|---|---|---|---|---|
| 1 | 2db0d2f tech catalog | Catalog cross-references are valid | `pnpm --filter @capo/core exec vitest run test/validate-catalog.test.ts` | 0 |
| 2 | ae12049 resolver | Conflicting crew is negotiated, not silently dropped | `pnpm --filter @capo/core exec vitest run test/negotiate.test.ts test/resolve.test.ts` | 0 |
| 3 | cf0ee9c recipes+planner | nextjs+drizzle plan matches the golden plan | `pnpm --filter @capo/core exec vitest run test/golden-plan.test.ts` | 0 |
| 4 | a58ab43 progress reducer | Reducer is total over ScaffoldEvent | `pnpm --filter @capo/core exec vitest run test/ -t reducer` | 0 |
| 5 | dfb5a35 executors | DryRun executor never touches the filesystem | `pnpm --filter @capo/engine exec vitest run test/executors/dry-run.test.ts` | 0 |
| 6 | dfb5a35 executors | Node executor really runs a step | `pnpm --filter @capo/engine exec vitest run test/executors/node-real.test.ts` | 0 |
| 7 | WIP→Task 0 compose cmd | `capo plan --json` emits a schema-valid plan | `node packages/cli/dist/cli.js plan --crew nextjs,drizzle --name t --json \| node -e 'const {ScaffoldPlanSchema}=await import("./packages/core/dist/index.js");ScaffoldPlanSchema.parse(JSON.parse(require("fs").readFileSync(0,"utf8")).plan)' --input-type=module` | 0 |
| 8 | 1bb73bf monorepo | Workspace builds from clean | `pnpm -r --if-present run build` | 0 |
| 9 | a9a3824 ci | CI fails on test failure | `grep -q 'pnpm run test' .github/workflows/ci.yml && ! grep -q 'continue-on-error' .github/workflows/ci.yml` | 0 |
| 10 | e994512 license | Every package declares the repo license | `test "$(grep -h '"license"' package.json packages/*/package.json \| sort -u \| wc -l)" = 1` | see below |

## What could not be written as a command

- **Ink screens (`packages/cli/src/ui/screens/*`)** — "the welcome screen shows the CAPO banner
  and the family hierarchy" has no exit code. `human_verify: true`, reason: visual. A weakest
  acceptable predicate is `ink-testing-library` snapshot of `lastFrame()`; not adopted yet.
- **README theme copy (75f39a1, 1bc880f)** — "Sicilian and English mixed naturally" is taste.
  `human_verify: true`, reason: aesthetics.

## Reading

8 of 10 predicates were mechanical to write because the work already had tests; the two that
failed are UI and copy — exactly the leak the blueprint predicts. Predicate 10 exposed a real
inconsistency if its exit is non-zero (root says MIT, LICENSE file says proprietary): record the
outcome as a ruling candidate at the next `/books`.
```

- [ ] **Step 2: Run every predicate and fill the exit column with the real values** (replace "see below" for #10 with its actual exit code; if a command fails, keep the failure in the table — the table is evidence, not marketing).

- [ ] **Step 3: Commit**

```bash
git add docs/capo/acceptance-predicates.md
git commit -m "docs(capo): ten acceptance predicates for past work"
```

---

### Task 12: First sit-down on real work — the `status` command

Dogfood: a hit list for the scaffolder's next feature (`capo status <tech>` from README/DEVELOPMENT.md, over the existing `compareInstalled` in `@capo/core`). Written exactly as `/sitdown` would write it; validated by the kernel; opened in the ledger. Executing it is the Capo's call, not this plan's.

**Files:**
- Create: `.capo/hits/status-command.yaml`
- Modify: `.capo/ledger.jsonl` (via `capo ledger append`)

- [ ] **Step 1: Read the ground**

Run: `grep -n "compareInstalled\|TechStatus" packages/core/src/status/compare.ts packages/core/src/index.ts | head`; `grep -n "status" packages/cli/src/cli.ts packages/cli/src/ui/App.tsx`.
Expected: `compareInstalled(pkgJson, catalog)` exists and is exported; `status` is only mentioned in help text.

- [ ] **Step 2: Write the hit list**

`.capo/hits/status-command.yaml`:
```yaml
id: status-command
title: "capo status <tech>: compare installed package.json against the catalog"
created: "2026-09-21"
nodes:
  - id: h1
    goal: "runStatusCommand(opts) returns TechStatus rows for the cwd's package.json and exits 0"
    depends_on: []
    write_scope: ["packages/cli/src/commands/status.ts", "packages/cli/test/status-command.test.ts"]
    forbidden: ["packages/core/**", "pnpm-lock.yaml"]
    accept: "pnpm --filter capo exec vitest run test/status-command.test.ts"
    budget: 25
    rollback: "git checkout -- packages/cli/src/commands/status.ts packages/cli/test/status-command.test.ts"
    soldier: test
  - id: h2
    goal: "cli.ts dispatches `status [tech]` to runStatusCommand with --json support; ScaffoldPlan help text updated"
    depends_on: [h1]
    write_scope: ["packages/cli/src/cli.ts"]
    forbidden: ["packages/cli/src/ui/**", "packages/core/**"]
    accept: "pnpm --filter capo run build && node packages/cli/dist/cli.js status --json | node -e 'JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"))'"
    budget: 15
    rollback: "git checkout -- packages/cli/src/cli.ts"
    soldier: refactor
  - id: h3
    goal: "README and DEVELOPMENT.md document `capo status` as implemented, not 'coming soon'"
    depends_on: [h2]
    write_scope: ["README.md", "DEVELOPMENT.md"]
    forbidden: ["packages/**"]
    accept: "grep -q 'capo status' README.md && ! grep -qi 'status <tech>.*to be implemented' DEVELOPMENT.md"
    budget: 8
    rollback: "git checkout -- README.md DEVELOPMENT.md"
    soldier: docs
```

- [ ] **Step 3: Validate and open**

```bash
node packages/cli/dist/cli.js hit validate status-command
node packages/cli/dist/cli.js ledger append --kind sitdown_open status-command --payload '{"nodes":3,"risk":"h2: the status word already routes to the Ink App; the dispatch must run before render()"}'
node packages/cli/dist/cli.js board
```
Expected: `status-command: 3 nodes, contracts valid`; `#1 sitdown_open appended`; board shows `○ h1`, `◌ h2`, `◌ h3`.

- [ ] **Step 4: Commit**

```bash
git add .capo
git commit -m "chore(capo): open the first hit list (status command)"
```

---

### Task 13: Final verification and hand-back

- [ ] **Step 1: Full CI locally**

Run: `cd /home/kilisan/capo && pnpm install --frozen-lockfile && pnpm run lint && pnpm run build && pnpm run test 2>&1 | grep -E "Tests|failed|error"`
Expected: four `Tests … passed` lines (core, engine, kernel, cli), no failures.

- [ ] **Step 2: Replay experiment, first data point**

Run: `capo replay "$(ls -t ~/.claude/projects/-home-kilisan/*.jsonl | head -1)" status-command h1 --budget 4000`
Record the printed ratio in `docs/capo/blueprint-v0.1.md` is **not** edited; instead append the line to `docs/capo/acceptance-predicates.md` under a new `## Replay data points` heading: `- 2026-09-21 session <basename>: turns N, transcript T, ledger L, ratio R [est.]`. Commit as `docs(capo): first replay data point`.

- [ ] **Step 3: Report to the Capo** — branch `family/v0.1`, commit count, the replay ratio, and the one decision that is theirs: work `status-command/h1` with `/hit status-command h1`, or merge first.

---

## Self-review

**Spec coverage (blueprint v0.1 list):** ledger append/board/rewind-linear → Tasks 2–5 ✓; SQLite index → deferred (JSONL is the format; index only when replay data demands, ADR 0006) ✓ stated; hit-list YAML + contract schema → Task 4 ✓; single soldier serial execution → `hit next` declaration-order + `hit done` gate, Task 9 ✓; `accept` enforcement + budget counting → Task 7 + `edit` events counted on the board (Task 5) ✓ — budget *exhaustion* is surfaced on the board (`calls n/budget`) but not blocked; the skill instructs the deviation, the kernel records it (v0.5 gates it); Books v0 + glob binding → Task 6 ✓; TUI three panes → **not built** (blueprint: plugin first; the board command is the text rendering of pane 1; ratatui deferred to the Rust decision) — stated in ADR 0006; ship the plugin first → Tasks 1, 10 ✓; three immediate moves → install (Task 1/10 ✓), replay experiment (Task 8/9/13 ✓ tool + first data point), ten predicates (Task 11 ✓); five sit-downs → one opened (Task 12), the other four are the Capo's real work.

**Placeholder scan:** none; every code step has full content.

**Type consistency:** `NewEvent.parent?: number | null` (Task 2) used by `rewind.ts` (Task 9) ✓; `LedgerStore.append` returns `LedgerEvent` ✓; `materialize(events, hits)` signature consistent Tasks 5/9 ✓; `checkScope(node, changed)` returns `ScopeReport` with `ok/outside/forbidden` Tasks 7/9 ✓; `renderContext` input `{hit,node,rulings,events,budgetTokens}` Tasks 8/9 ✓; `hitPath` exported in Task 3, imported in Task 9 ✓ (the duplicate import line in `hit.ts` must be merged into one `@capo/kernel` import when writing the file).
