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
    const text =
      serializeEvent(e1) +
      serializeEvent({ ...e1, seq: 2, parent: 1, kind: "node_start", node: "h1" });
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
