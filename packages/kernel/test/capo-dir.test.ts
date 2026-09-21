import { mkdir, mkdtemp } from "node:fs/promises";
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
