import { appendFile, mkdtemp, readFile } from "node:fs/promises";
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
    const c = await ledger.append({
      actor: "capo",
      kind: "node_start",
      hit: "x",
      node: "h2",
      parent: 1,
    });
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
    await appendFile(path.join(dir, "ledger.jsonl"), "garbage\n");
    await expect(ledger.append({ actor: "capo", kind: "sitdown_open" })).rejects.toThrow(
      /line 1/,
    );
  });
});
