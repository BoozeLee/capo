import { describe, expect, test } from "vitest";
import { validateHit } from "../../src/hits/validate.js";

const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  goal: `do ${id}`,
  write_scope: ["src/**"],
  accept: "true",
  budget: 10,
  ...extra,
});

const base = { id: "auth", title: "Auth rework", created: "2026-09-21", nodes: [node("h1")] };

describe("validateHit", () => {
  test("accepts a minimal valid hit and fills defaults", () => {
    const r = validateHit(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nodes[0].depends_on).toEqual([]);
      expect(r.value.nodes[0].forbidden).toEqual([]);
      expect(r.value.nodes[0].human_verify).toBe(false);
    }
  });

  test("rejects a node with neither accept nor human_verify", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { accept: undefined })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/accept.*human_verify/);
  });

  test("accepts human_verify without accept when a reason is given", () => {
    const r = validateHit({
      ...base,
      nodes: [node("h1", { accept: undefined, human_verify: true, human_verify_reason: "visual" })],
    });
    expect(r.ok).toBe(true);
  });

  test("rejects duplicate node ids", () => {
    const r = validateHit({ ...base, nodes: [node("h1"), node("h1")] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/duplicate/);
  });

  test("rejects depends_on pointing at an unknown node", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { depends_on: ["h9"] })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/unknown node h9/);
  });

  test("rejects a dependency cycle", () => {
    const r = validateHit({
      ...base,
      nodes: [node("h1", { depends_on: ["h2"] }), node("h2", { depends_on: ["h1"] })],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/cycle/);
  });

  test("rejects unknown keys (contracts are strict)", () => {
    const r = validateHit({ ...base, nodes: [node("h1", { vibes: "good" })] });
    expect(r.ok).toBe(false);
  });
});
