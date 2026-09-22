import { describe, expect, test } from "vitest";
import {
  editSliceFromPayload,
  estimateTokens,
  renderContext,
} from "../../src/context/render.js";
import type { Hit } from "../../src/hits/schema.js";
import type { LedgerEvent } from "../../src/ledger/event.js";

const hit: Hit = {
  id: "auth",
  title: "Auth",
  created: "2026-09-21",
  nodes: [
    {
      id: "h1",
      goal: "add expiry",
      depends_on: [],
      write_scope: ["src/auth/**"],
      forbidden: ["**/*.lock"],
      accept: "pytest -q",
      human_verify: false,
      budget: 20,
      rollback: "git revert HEAD",
    },
  ],
};

const ev = (
  seq: number,
  kind: LedgerEvent["kind"],
  payload: Record<string, unknown>,
): LedgerEvent => ({
  seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "soldier",
  kind,
  hit: "auth",
  node: "h1",
  parent: seq - 1 || null,
  payload,
});

const rulings = [
  {
    title: "Validate in middleware",
    binds: ["src/auth/**"],
    because: "b",
    evidence: "e",
    overturnIf: "o",
    date: "2026-01-01",
    overturnedBy: null,
  },
];

describe("editSliceFromPayload", () => {
  test("requires path and body or diff", () => {
    expect(editSliceFromPayload({})).toBeNull();
    expect(editSliceFromPayload({ path: "a.ts" })).toBeNull();
    expect(editSliceFromPayload({ path: "a.ts", body: "x" })).toEqual({
      path: "a.ts",
      body: "x",
    });
    expect(editSliceFromPayload({ path: "a.ts", diff: "-a\n+b" })).toEqual({
      path: "a.ts",
      diff: "-a\n+b",
    });
  });
});

describe("renderContext", () => {
  test("includes contract, bound rulings and events, newest last", () => {
    const r = renderContext({
      hit,
      node: hit.nodes[0],
      rulings,
      events: [ev(1, "node_start", { note: "go" }), ev(2, "edit", { note: "touched" })],
      budgetTokens: 10_000,
    });
    expect(r.text).toContain("accept: pytest -q");
    expect(r.text).toContain("## Validate in middleware");
    expect(r.text).toContain("## File slices from edits");
    expect(r.text).toContain("(none)"); // edit had no path/body
    expect(r.text.indexOf("go")).toBeLessThan(r.text.indexOf("touched"));
    expect(r).toMatchObject({ eventsIncluded: 2, eventsDropped: 0, slicesIncluded: 0 });
    expect(r.tokens).toBe(estimateTokens(r.text));
  });

  test("surfaces edit path + body under File slices so a worked node is not an empty floor", () => {
    const body = "export function expiry() {\n  return 42;\n}\n";
    const empty = renderContext({
      hit,
      node: hit.nodes[0],
      rulings: [],
      events: [ev(1, "node_start", { note: "go" })],
      budgetTokens: 10_000,
    });
    const worked = renderContext({
      hit,
      node: hit.nodes[0],
      rulings: [],
      events: [
        ev(1, "node_start", { note: "go" }),
        ev(2, "edit", { path: "src/auth/expiry.ts", body }),
      ],
      budgetTokens: 10_000,
    });
    expect(worked.text).toContain("### src/auth/expiry.ts");
    expect(worked.text).toContain(body.trim());
    expect(worked.text).toContain("edit src/auth/expiry.ts");
    expect(worked.text).not.toContain(`"body":`);
    expect(worked.slicesIncluded).toBe(1);
    expect(worked.tokens).toBeGreaterThan(empty.tokens);
  });

  test("prefers diff over body when both are present", () => {
    const r = renderContext({
      hit,
      node: hit.nodes[0],
      rulings: [],
      events: [
        ev(1, "edit", {
          path: "a.ts",
          body: "OLD",
          diff: "-OLD\n+NEW",
        }),
      ],
      budgetTokens: 10_000,
    });
    expect(r.text).toContain("-OLD\n+NEW");
    expect(r.text).not.toContain("\nOLD\n");
  });

  test("drops the oldest events first to fit the budget", () => {
    const events = Array.from({ length: 50 }, (_, i) =>
      ev(i + 1, "edit", { note: `event number ${i + 1} with some padding text` }),
    );
    const r = renderContext({ hit, node: hit.nodes[0], rulings: [], events, budgetTokens: 250 });
    expect(r.eventsDropped).toBeGreaterThan(0);
    expect(r.text).toContain("event number 50");
    expect(r.text).not.toContain("event number 1 ");
    expect(r.tokens).toBeLessThanOrEqual(250);
  });

  test("drops oldest file slices before abandoning newer ones when bodies blow the budget", () => {
    const big = "x".repeat(800);
    const events = [
      ev(1, "edit", { path: "old.ts", body: `OLD-${big}` }),
      ev(2, "edit", { path: "new.ts", body: `NEW-${big}` }),
    ];
    const r = renderContext({ hit, node: hit.nodes[0], rulings: [], events, budgetTokens: 350 });
    expect(r.slicesIncluded).toBeLessThan(2);
    expect(r.slicesDropped).toBeGreaterThan(0);
    // newest slice wins when only one fits
    if (r.slicesIncluded === 1) {
      expect(r.text).toContain("### new.ts");
      expect(r.text).not.toContain("### old.ts");
    }
    expect(r.tokens).toBeLessThanOrEqual(350);
  });

  test("ignores events from other nodes", () => {
    const other = { ...ev(3, "edit", { path: "x.ts", body: "elsewhere" }), node: "h2" };
    const r = renderContext({
      hit,
      node: hit.nodes[0],
      rulings: [],
      events: [other],
      budgetTokens: 1000,
    });
    expect(r.text).not.toContain("elsewhere");
    expect(r.slicesIncluded).toBe(0);
  });
});
