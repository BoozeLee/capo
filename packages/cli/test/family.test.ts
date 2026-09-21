import { execSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

const BOOKS = `# Books

## Outputs live under out/
- binds: out/**
- because: b
- evidence: e
- overturn-if: o
- date: 2026-09-21
`;

async function repo() {
  const cwd = await mkdtemp(path.join(tmpdir(), "capo-fam-"));
  execSync("git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", {
    cwd,
  });
  await mkdir(path.join(cwd, ".capo", "hits"), { recursive: true });
  await writeFile(path.join(cwd, ".capo", "hits", "demo.yaml"), HIT);
  await writeFile(path.join(cwd, ".capo", "books.md"), BOOKS);
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
    await mkdir(path.join(r.cwd, "out"));
    await writeFile(path.join(r.cwd, "out", "a.txt"), "x");
    expect(await r.run("hit done demo h1")).toBe(0);
    expect(r.last()).toMatchObject({ status: "done", accept: { exit: 0 }, scope: { ok: true } });
    expect(await r.run("board demo")).toBe(0);
    expect(r.last().hits.demo.nodes).toMatchObject({
      h1: { status: "done" },
      h2: { status: "pending" },
    });
  });

  test("hit done refuses on a scope violation without running accept", async () => {
    const r = await repo();
    await r.run("hit start demo h1");
    await writeFile(path.join(r.cwd, "stray.lock"), "x");
    expect(await r.run("hit done demo h1")).toBe(3);
    expect(r.last()).toMatchObject({
      status: "scope_violation",
      scope: { forbidden: ["stray.lock"] },
    });
  });

  test("hit done with failing accept records node_failed and returns the exit code", async () => {
    const r = await repo();
    await r.run("hit start demo h1");
    expect(await r.run("hit done demo h1")).toBe(1);
    expect(r.last()).toMatchObject({ status: "failed", accept: { exit: 1 } });
  });

  test("ledger append + tail, books bind, deviation, rewind, context", async () => {
    const r = await repo();
    expect(
      await r.run("ledger append demo h1", { kind: "edit", payload: '{"file":"out/a.txt"}' }),
    ).toBe(0);
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
    const usage = {
      input_tokens: 10,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: 0,
      output_tokens: 1,
    };
    await writeFile(
      session,
      `${JSON.stringify({ type: "assistant", timestamp: "t", message: { id: "m1", usage } })}\n`,
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
    const code = await runFamilyCommand(["board"], { json: true }, {
      cwd,
      stdout: () => {},
      stderr: (l) => errs.push(l),
    });
    expect(code).toBe(2);
    expect(errs.at(-1)).toMatch(/sit-down/);
  });
});
