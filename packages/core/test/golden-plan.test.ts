import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { planScaffold } from "../src/planner/plan.js";
import { RECIPES } from "../src/recipes/index.js";
import { resolveStack } from "../src/resolver/resolve.js";
import { DEFAULT_STACK_OPTIONS } from "../src/types/stack.js";

const SHELL_METACHARACTERS = /[;&|`$(){}<>]/;

describe("golden plan: the full 5-tech stack", () => {
  const resolved = resolveStack(
    {
      name: "myapp",
      crew: ["nextjs", "shadcn", "drizzle", "vercel-ai-sdk", "memory-mcp-server"],
      options: DEFAULT_STACK_OPTIONS,
    },
    CATALOG,
  );

  test("resolves cleanly against the real catalog", () => {
    expect(resolved.ok).toBe(true);
  });

  if (!resolved.ok) return;

  const plan = planScaffold({
    stack: resolved.value,
    name: "myapp",
    catalog: CATALOG,
    recipes: RECIPES,
    coreVersion: "0.1.0",
    createdAt: "2026-09-21T00:00:00.000Z",
  });

  test("matches the committed golden snapshot", () => {
    expect(plan).toMatchSnapshot();
  });

  test("only the nextjs scaffold step uses cwd 'parent'", () => {
    const parentSteps = plan.steps.filter((s) => s.kind === "run" && s.cwd === "parent");
    expect(parentSteps).toHaveLength(1);
    expect(parentSteps[0]?.id).toBe("nextjs-create");
  });

  test("every path is relative, never absolute", () => {
    for (const step of plan.steps) {
      if ("path" in step) {
        expect(step.path.startsWith("/")).toBe(false);
      }
    }
  });

  test("no run step's cmd or args contain shell metacharacters (never shell-interpolated)", () => {
    for (const step of plan.steps) {
      if (step.kind === "run") {
        expect(step.cmd).not.toMatch(SHELL_METACHARACTERS);
        for (const arg of step.args) {
          expect(arg).not.toMatch(SHELL_METACHARACTERS);
        }
      }
    }
  });

  test("no two writeFile/appendFile steps target the same path (no silent collisions)", () => {
    const writePaths = plan.steps
      .filter((s) => s.kind === "writeFile")
      .map((s) => (s.kind === "writeFile" ? s.path : ""));
    expect(new Set(writePaths).size).toBe(writePaths.length);
  });

  test("ends with the capo.yaml write and the three git steps", () => {
    const tail = plan.steps.slice(-4);
    expect(tail.map((s) => s.id)).toEqual([
      "capo-manifest",
      "capo-git-init",
      "capo-git-add",
      "capo-git-commit",
    ]);
  });
});
