import { describe, expect, test } from "vitest";
import { liveEvents, materialize } from "../../src/board/materialize.js";
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
  nodes: [node("h1", []), node("h2", ["h1"])],
};

let seq = 0;
const ev = (
  kind: LedgerEvent["kind"],
  node?: string,
  payload: Record<string, unknown> = {},
): LedgerEvent => ({
  seq: ++seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "capo",
  kind,
  hit: "auth",
  ...(node ? { node } : {}),
  parent: seq - 1 || null,
  payload,
});

describe("materialize", () => {
  test("nodes start pending; deps make later nodes blocked", () => {
    seq = 0;
    const b = materialize([ev("sitdown_open")], [hit]);
    expect(b.hits.auth.nodes.h1.status).toBe("pending");
    expect(b.hits.auth.nodes.h2.status).toBe("blocked");
  });

  test("node_start → running; node_done with accept 0 → done and unblocks dependents", () => {
    seq = 0;
    const b = materialize(
      [
        ev("sitdown_open"),
        ev("node_start", "h1"),
        ev("edit", "h1"),
        ev("edit", "h1"),
        ev("accept_run", "h1", { exit: 0 }),
        ev("node_done", "h1", { accept_exit: 0 }),
      ],
      [hit],
    );
    expect(b.hits.auth.nodes.h1).toMatchObject({ status: "done", toolCalls: 2, acceptExit: 0 });
    expect(b.hits.auth.nodes.h2.status).toBe("pending");
  });

  test("node_failed → failed; deviations are counted", () => {
    seq = 0;
    const b = materialize(
      [ev("node_start", "h1"), ev("deviation", "h1"), ev("node_failed", "h1")],
      [hit],
    );
    expect(b.hits.auth.nodes.h1).toMatchObject({ status: "failed", deviations: 1 });
  });

  test("rewind cuts events between `to` and the rewind event", () => {
    seq = 0;
    const events = [
      ev("sitdown_open"), // 1
      ev("node_start", "h1"), // 2
      ev("node_done", "h1", { accept_exit: 0 }), // 3
      ev("node_start", "h2"), // 4
      ev("rewind", undefined, { to: 3 }), // 5 → cuts 4
    ];
    expect(liveEvents(events).map((e) => e.seq)).toEqual([1, 2, 3, 5]);
    const b = materialize(events, [hit]);
    expect(b.hits.auth.nodes.h1.status).toBe("done");
    expect(b.hits.auth.nodes.h2.status).toBe("pending");
    expect(b.lastSeq).toBe(5);
  });

  test("events for unknown hits are ignored, not fatal", () => {
    seq = 0;
    const b = materialize([{ ...ev("node_start", "zz"), hit: "ghost" }], [hit]);
    expect(Object.keys(b.hits)).toEqual(["auth"]);
  });
});
