import { describe, expect, test } from "vitest";
import { createContext } from "../../src/recipes/recipe.js";
import { shadcnRecipe } from "../../src/recipes/shadcn.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

const ctx = createContext(
  {
    framework: "nextjs",
    members: ["nextjs", "shadcn"],
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  },
  "myapp",
);

describe("shadcnRecipe", () => {
  test("initializes then adds components, both non-interactive per the spike", () => {
    const steps = shadcnRecipe.steps(ctx);
    expect(steps).toEqual([
      {
        id: "shadcn-init",
        tech: "shadcn",
        label: "Initialize shadcn/ui",
        kind: "run",
        cmd: "pnpm",
        args: [
          "dlx",
          "shadcn@latest",
          "init",
          "--yes",
          "--preset",
          "nova",
          "--base",
          "radix",
          "--no-monorepo",
          "--silent",
        ],
        cwd: "project",
        timeoutMs: 120_000,
      },
      {
        id: "shadcn-add",
        tech: "shadcn",
        label: "Add starter components",
        kind: "run",
        cmd: "pnpm",
        args: ["dlx", "shadcn@latest", "add", "button", "card", "input", "--yes", "--silent"],
        cwd: "project",
        timeoutMs: 120_000,
      },
    ]);
  });

  test("owns components.json, the ui components directory, and lib/utils.ts", () => {
    expect(shadcnRecipe.ownedFiles).toEqual([
      "components.json",
      "src/components/ui",
      "src/lib/utils.ts",
    ]);
  });

  test("has no remove() — CSS theme edits are not safely reversible in v1", () => {
    expect(shadcnRecipe.remove).toBeUndefined();
  });
});
