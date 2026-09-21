import { describe, expect, test } from "vitest";
import { materialize } from "../../src/board/materialize.js";
import { nextRunnable } from "../../src/board/next.js";
import type { Hit } from "../../src/hits/schema.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const node = (id: string, depends_on: string[]) => ({
  id,
  goal: id,
  depends_on,
  write_scope: [`${id}/**`],
  forbidden: [],
  accept: "true",
  human_verify: false,
  budget: 5,
});

const hit: Hit = {
  id: "auth",
  title: "t",
  created: "2026-09-21",
  nodes: [node("h1", []), node("h2", ["h1"]), node("h3", [])],
};

const start = (seq: number, id: string): LedgerEvent => ({
  seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "c",
  kind: "node_start",
  hit: "auth",
  node: id,
  parent: seq - 1 || null,
  payload: {},
});

describe("nextRunnable", () => {
  test("first pending node in declaration order whose deps are done", () => {
    expect(nextRunnable(hit, materialize([], [hit]))?.id).toBe("h1");
  });

  test("skips running and done nodes", () => {
    expect(nextRunnable(hit, materialize([start(1, "h1")], [hit]))?.id).toBe("h3");
  });

  test("null when nothing is runnable", () => {
    expect(nextRunnable(hit, materialize([start(1, "h1"), start(2, "h3")], [hit]))).toBeNull();
  });
});
