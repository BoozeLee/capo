import { execSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { runFamilyCommand } from "../../src/commands/family/index.js";

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
  const cwd = await mkdtemp(path.join(tmpdir(), "capo-replay-"));
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

const line = (o: unknown) => `${JSON.stringify(o)}\n`;

describe("capo replay (state-bearing)", () => {
  test("uses state-bearing denominator and prints it on the result", async () => {
    const r = await repo();
    const session = path.join(r.cwd, "s.jsonl");
    const fileBody = `export const x = 1;\n${"x".repeat(2000)}`;
    const usage = {
      input_tokens: 2000,
      cache_read_input_tokens: 180_000,
      cache_creation_input_tokens: 20_000,
      output_tokens: 10,
    };
    await writeFile(
      session,
      [
        line({
          type: "user",
          message: {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: "t1", content: fileBody }],
          },
        }),
        line({
          type: "assistant",
          timestamp: "2026-09-21T10:00:00Z",
          message: { id: "m1", usage },
        }),
      ].join(""),
    );
    expect(await r.run(`replay ${session} demo h1`, { budget: 4000 })).toBe(0);
    const row = r.last();
    expect(row.turns).toBe(1);
    expect(row.denominator).toBe("state-bearing-tool-results");
    expect(row.stateBearingTokens).toBeGreaterThan(0);
    expect(row.toolResultCount).toBe(1);
    expect(row.totalContextTokens).toBeGreaterThan(row.stateBearingTokens);
    expect(row.ratio).toBeGreaterThanOrEqual(0);
    // Human text path must name the denominator (json emit still carries the fields above).
    expect(r.out.join("\n")).toMatch(/state-bearing/);
  });

  test("empty tool_results → stateBearingTokens 0 and ratio 0", async () => {
    const r = await repo();
    const session = path.join(r.cwd, "empty.jsonl");
    const usage = {
      input_tokens: 10,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: 0,
      output_tokens: 1,
    };
    await writeFile(
      session,
      line({ type: "assistant", timestamp: "t", message: { id: "m1", usage } }),
    );
    expect(await r.run(`replay ${session} demo h1`)).toBe(0);
    expect(r.last()).toMatchObject({
      turns: 1,
      stateBearingTokens: 0,
      ratio: 0,
      denominator: "state-bearing-tool-results",
    });
  });
});
