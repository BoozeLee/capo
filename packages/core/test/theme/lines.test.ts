import { describe, expect, test } from "vitest";
import { phaseLine } from "../../src/theme/lines.js";
import type { ScaffoldEvent } from "../../src/types/events.js";

const START: ScaffoldEvent = { type: "plan:start", totalSteps: 3, project: "myapp" };
const STEP_START: ScaffoldEvent = {
  type: "step:start",
  index: 0,
  step: { id: "nextjs-create", kind: "run", tech: "nextjs", label: "Scaffold Next.js app" },
};
const FAILED: ScaffoldEvent = { type: "plan:failed", index: 0, error: { message: "boom" } };
const DONE: ScaffoldEvent = { type: "plan:done", projectDir: "/tmp/myapp" };
const OUTPUT: ScaffoldEvent = { type: "step:output", index: 0, stream: "stdout", chunk: "x" };

describe("phaseLine: default mode", () => {
  test("produces a themed line for plan:start", () => {
    expect(phaseLine(START, {})).toBe("🎩 Gathering the famiglia...");
  });

  test("includes the step label for step:start", () => {
    expect(phaseLine(STEP_START, {})).toContain("Scaffold Next.js app");
  });

  test("surfaces the error message on failure", () => {
    expect(phaseLine(FAILED, {})).toContain("boom");
  });

  test("returns null for step:output (no themed line for raw output)", () => {
    expect(phaseLine(OUTPUT, {})).toBeNull();
  });
});

describe("phaseLine: --gotommyguns mode", () => {
  test("uses distinct, more aggressive copy than default mode", () => {
    const line = phaseLine(START, { gotommyguns: true });
    expect(line).not.toBe(phaseLine(START, {}));
    expect(line).toContain("Andiamo");
  });

  test("still surfaces the error message on failure", () => {
    expect(phaseLine(FAILED, { gotommyguns: true })).toContain("boom");
  });
});

describe("phaseLine: --omerta mode", () => {
  test("suppresses non-error lines entirely", () => {
    expect(phaseLine(START, { omerta: true })).toBeNull();
    expect(phaseLine(STEP_START, { omerta: true })).toBeNull();
    expect(phaseLine(DONE, { omerta: true })).toBeNull();
  });

  test("still surfaces the error message on failure", () => {
    expect(phaseLine(FAILED, { omerta: true })).toContain("boom");
  });
});
