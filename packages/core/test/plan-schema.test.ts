import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { planScaffold } from "../src/planner/plan.js";
import { RECIPES } from "../src/recipes/index.js";
import { resolveStack } from "../src/resolver/resolve.js";
import { ScaffoldPlanSchema } from "../src/types/plan-schema.js";
import { DEFAULT_STACK_OPTIONS } from "../src/types/stack.js";

function realPlan() {
  const resolved = resolveStack(
    { name: "myapp", crew: ["nextjs", "drizzle"], options: DEFAULT_STACK_OPTIONS },
    CATALOG,
  );
  if (!resolved.ok) throw new Error("expected resolution to succeed");
  return planScaffold({
    stack: resolved.value,
    name: "myapp",
    catalog: CATALOG,
    recipes: RECIPES,
    coreVersion: "0.1.0",
    createdAt: "2026-09-21T00:00:00.000Z",
  });
}

describe("ScaffoldPlanSchema", () => {
  test("accepts a real plan round-tripped through JSON", () => {
    const plan = realPlan();
    const roundTripped = JSON.parse(JSON.stringify(plan));
    expect(ScaffoldPlanSchema.parse(roundTripped)).toEqual(plan);
  });

  test("rejects a plan with a step missing a required field for its kind", () => {
    const plan = realPlan();
    const tampered = JSON.parse(JSON.stringify(plan));
    tampered.steps[0].cmd = undefined;
    expect(() => ScaffoldPlanSchema.parse(tampered)).toThrow();
  });

  test("rejects a plan with an unknown step kind", () => {
    const plan = realPlan();
    const tampered = JSON.parse(JSON.stringify(plan));
    tampered.steps[0].kind = "not-a-real-kind";
    expect(() => ScaffoldPlanSchema.parse(tampered)).toThrow();
  });

  test("rejects a plan with a schemaVersion other than 1", () => {
    const plan = realPlan();
    const tampered = { ...JSON.parse(JSON.stringify(plan)), schemaVersion: 2 };
    expect(() => ScaffoldPlanSchema.parse(tampered)).toThrow();
  });

  test("rejects a plan whose stack.framework isn't a known TechId", () => {
    const plan = realPlan();
    const tampered = JSON.parse(JSON.stringify(plan));
    tampered.stack.framework = "not-a-real-tech";
    expect(() => ScaffoldPlanSchema.parse(tampered)).toThrow();
  });
});
