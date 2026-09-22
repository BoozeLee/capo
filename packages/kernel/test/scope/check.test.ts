import { describe, expect, test } from "vitest";
import { checkScope } from "../../src/scope/check.js";

const node = {
  write_scope: ["src/auth/**", "tests/auth/**"],
  forbidden: ["**/*.lock", "migrations/**"],
};

describe("checkScope", () => {
  test("all changes inside scope is ok", () => {
    expect(checkScope(node, ["src/auth/a.ts", "tests/auth/a.test.ts"])).toEqual({
      ok: true,
      outside: [],
      forbidden: [],
    });
  });

  test("a file outside write_scope is reported", () => {
    expect(checkScope(node, ["src/api/x.ts"])).toEqual({
      ok: false,
      outside: ["src/api/x.ts"],
      forbidden: [],
    });
  });

  test("a forbidden file is reported as forbidden even if inside scope", () => {
    const r = checkScope({ write_scope: ["**"], forbidden: ["**/*.lock"] }, [
      "pnpm-lock.yaml",
      "a.lock",
    ]);
    expect(r).toEqual({ ok: false, outside: [], forbidden: ["a.lock"] });
  });

  test("no changes is ok", () => {
    expect(checkScope(node, []).ok).toBe(true);
  });
});
