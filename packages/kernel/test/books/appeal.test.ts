import { describe, expect, test } from "vitest";
import { appeals } from "../../src/books/appeal.js";
import type { Ruling } from "../../src/books/ruling.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const ruling: Ruling = {
  title: "Use middleware",
  binds: ["src/**"],
  because: "b",
  evidence: "e",
  overturnIf: "o",
  date: "2026-01-01",
  overturnedBy: null,
};
const override = (seq: number, title: string): LedgerEvent => ({
  seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "capo",
  kind: "override",
  parent: seq - 1 || null,
  payload: { ruling: title },
});

describe("appeals", () => {
  test("flags a ruling overridden three times", () => {
    const out = appeals(
      [ruling],
      [override(1, "Use middleware"), override(2, "Use middleware"), override(3, "Use middleware")],
    );
    expect(out).toEqual([{ ruling, overrides: 3 }]);
  });

  test("two overrides is not an appeal", () => {
    expect(
      appeals([ruling], [override(1, "Use middleware"), override(2, "Use middleware")]),
    ).toEqual([]);
  });

  test("overrides of other rulings do not count", () => {
    expect(appeals([ruling], [override(1, "x"), override(2, "x"), override(3, "x")])).toEqual([]);
  });
});
