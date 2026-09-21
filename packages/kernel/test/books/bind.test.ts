import { describe, expect, test } from "vitest";
import { bindings } from "../../src/books/bind.js";
import type { Ruling } from "../../src/books/ruling.js";

const ruling = (title: string, binds: string[], overturnedBy: string | null = null): Ruling => ({
  title,
  binds,
  because: "b",
  evidence: "e",
  overturnIf: "o",
  date: "2026-01-01",
  overturnedBy,
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
