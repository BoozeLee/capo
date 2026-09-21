import { describe, expect, test } from "vitest";
import { deepMergeJson } from "../src/deep-merge-json.js";

describe("deepMergeJson", () => {
  test("merges nested objects recursively", () => {
    const base = { scripts: { build: "tsc" }, name: "myapp" };
    const patch = { scripts: { test: "vitest" } };
    expect(deepMergeJson(base, patch)).toEqual({
      scripts: { build: "tsc", test: "vitest" },
      name: "myapp",
    });
  });

  test("a patch scalar replaces the base scalar, not merges", () => {
    expect(deepMergeJson({ version: "0.1.0" }, { version: "0.2.0" })).toEqual({
      version: "0.2.0",
    });
  });

  test("a patch array replaces the base array entirely, not concatenates", () => {
    expect(deepMergeJson({ keywords: ["a", "b"] }, { keywords: ["c"] })).toEqual({
      keywords: ["c"],
    });
  });

  test("a null value in the patch deletes the key from the base", () => {
    expect(
      deepMergeJson({ scripts: { build: "tsc", old: "x" } }, { scripts: { old: null } }),
    ).toEqual({ scripts: { build: "tsc" } });
  });

  test("adds a new top-level key that doesn't exist in the base", () => {
    expect(deepMergeJson({ name: "myapp" }, { license: "MIT" })).toEqual({
      name: "myapp",
      license: "MIT",
    });
  });

  test("does not mutate either input", () => {
    const base = { scripts: { build: "tsc" } };
    const patch = { scripts: { test: "vitest" } };
    deepMergeJson(base, patch);
    expect(base).toEqual({ scripts: { build: "tsc" } });
    expect(patch).toEqual({ scripts: { test: "vitest" } });
  });
});
