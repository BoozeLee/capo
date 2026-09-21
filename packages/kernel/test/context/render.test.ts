import { describe, expect, test } from "vitest";
import { estimateTokens, renderContext } from "../../src/context/render.js";
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
const ev = (seq: number, kind: LedgerEvent["kind"], note: string): LedgerEvent => ({
  seq,
  ts: "2026-09-21T10:00:00.000Z",
  actor: "soldier",
  kind,
  hit: "auth",
  node: "h1",
  parent: seq - 1 || null,
  payload: { note },
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

describe("renderContext", () => {
  test("includes contract, bound rulings and events, newest last", () => {
    const r = renderContext({
      hit,
      node: hit.nodes[0],
      rulings,
      events: [ev(1, "node_start", "go"), ev(2, "edit", "touched")],
      budgetTokens: 10_000,
    });
    expect(r.text).toContain("accept: pytest -q");
    expect(r.text).toContain("## Validate in middleware");
    expect(r.text.indexOf("go")).toBeLessThan(r.text.indexOf("touched"));
    expect(r).toMatchObject({ eventsIncluded: 2, eventsDropped: 0 });
    expect(r.tokens).toBe(estimateTokens(r.text));
  });

  test("drops the oldest events first to fit the budget", () => {
    const events = Array.from({ length: 50 }, (_, i) =>
      ev(i + 1, "edit", `event number ${i + 1} with some padding text`),
    );
    const r = renderContext({ hit, node: hit.nodes[0], rulings: [], events, budgetTokens: 250 });
    expect(r.eventsDropped).toBeGreaterThan(0);
    expect(r.text).toContain("event number 50");
    expect(r.text).not.toContain("event number 1 ");
    expect(r.tokens).toBeLessThanOrEqual(250);
  });

  test("ignores events from other nodes", () => {
    const other = { ...ev(3, "edit", "elsewhere"), node: "h2" };
    const r = renderContext({
      hit,
      node: hit.nodes[0],
      rulings: [],
      events: [other],
      budgetTokens: 1000,
    });
    expect(r.text).not.toContain("elsewhere");
  });
});
