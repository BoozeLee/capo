import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { planScaffold } from "../src/planner/plan.js";
import type { Recipe } from "../src/recipes/recipe.js";
import type { Step } from "../src/types/plan.js";
import type { ResolvedStack } from "../src/types/stack.js";
import { DEFAULT_STACK_OPTIONS } from "../src/types/stack.js";
import type { TechId } from "../src/types/tech.js";

function fakeStep(tech: TechId, cwd: "project" | "parent" = "project"): Step {
  return {
    id: `${tech}-fake`,
    tech,
    label: `${tech} fake step`,
    kind: "run",
    cmd: "true",
    args: [],
    cwd,
    timeoutMs: 1000,
  };
}

function fakeRecipe(tech: TechId, cwd: "project" | "parent" = "project"): Recipe {
  return {
    tech,
    ownedFiles: [],
    steps: () => [fakeStep(tech, cwd)],
  };
}

const FAKE_RECIPES: Record<TechId, Recipe> = {
  nextjs: fakeRecipe("nextjs", "parent"),
  tailwindcss: fakeRecipe("tailwindcss"),
  shadcn: fakeRecipe("shadcn"),
  drizzle: fakeRecipe("drizzle"),
  "vercel-ai-sdk": fakeRecipe("vercel-ai-sdk"),
  "memory-mcp-server": fakeRecipe("memory-mcp-server"),
};

function stack(members: TechId[]): ResolvedStack {
  return {
    framework: "nextjs",
    members,
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  };
}

describe("planScaffold ordering", () => {
  test("orders recipe steps by category: framework, styling, ui, database, ai, mcp", () => {
    // Deliberately out of category order in `members`.
    const plan = planScaffold({
      stack: stack(["memory-mcp-server", "drizzle", "shadcn", "nextjs"]),
      name: "myapp",
      catalog: CATALOG,
      recipes: FAKE_RECIPES,
      coreVersion: "0.1.0",
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    const techOrder = plan.steps.filter((s) => s.tech !== "capo").map((s) => s.tech);
    expect(techOrder).toEqual(["nextjs", "shadcn", "drizzle", "memory-mcp-server"]);
  });

  test("only the framework's step uses cwd 'parent'; every other step is 'project'", () => {
    const plan = planScaffold({
      stack: stack(["nextjs", "shadcn", "drizzle"]),
      name: "myapp",
      catalog: CATALOG,
      recipes: FAKE_RECIPES,
      coreVersion: "0.1.0",
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    const parentSteps = plan.steps.filter((s) => s.kind === "run" && s.cwd === "parent");
    expect(parentSteps).toHaveLength(1);
    expect(parentSteps[0]?.id).toBe("nextjs-fake");
  });

  test("appends a writeFile step for capo.yaml after every recipe step", () => {
    const plan = planScaffold({
      stack: stack(["nextjs"]),
      name: "myapp",
      catalog: CATALOG,
      recipes: FAKE_RECIPES,
      coreVersion: "0.1.0",
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    const manifestStep = plan.steps.find((s) => s.kind === "writeFile" && s.path === "capo.yaml");
    expect(manifestStep).toBeDefined();
    expect(plan.steps.indexOf(manifestStep as (typeof plan.steps)[number])).toBe(
      plan.steps.length - 4,
    );
  });

  test("appends git init/add/commit run steps after capo.yaml", () => {
    const plan = planScaffold({
      stack: stack(["nextjs"]),
      name: "myapp",
      catalog: CATALOG,
      recipes: FAKE_RECIPES,
      coreVersion: "0.1.0",
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    const tail = plan.steps.slice(-3);
    expect(tail.map((s) => (s.kind === "run" ? s.args : []))).toEqual([
      ["init"],
      ["add", "-A"],
      ["commit", "-m", "capo: la famiglia"],
    ]);
    for (const step of tail) {
      expect(step.kind === "run" && step.cmd).toBe("git");
    }
  });

  test("the resulting plan carries the project name, coreVersion, and resolved stack", () => {
    const resolvedStack = stack(["nextjs"]);
    const plan = planScaffold({
      stack: resolvedStack,
      name: "myapp",
      catalog: CATALOG,
      recipes: FAKE_RECIPES,
      coreVersion: "0.1.0",
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    expect(plan.schemaVersion).toBe(1);
    expect(plan.coreVersion).toBe("0.1.0");
    expect(plan.project).toEqual({ name: "myapp" });
    expect(plan.stack).toEqual(resolvedStack);
  });
});
