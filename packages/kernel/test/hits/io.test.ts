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
