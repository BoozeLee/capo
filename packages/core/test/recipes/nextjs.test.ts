import { describe, expect, test } from "vitest";
import { nextjsRecipe } from "../../src/recipes/nextjs.js";
import { createContext } from "../../src/recipes/recipe.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

const ctx = createContext(
  {
    framework: "nextjs",
    members: ["nextjs"],
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  },
  "myapp",
);

describe("nextjsRecipe", () => {
  test("scaffolds via create-next-app@16 with the pinned, spike-verified flags", () => {
    const steps = nextjsRecipe.steps(ctx);
    expect(steps).toEqual([
      {
        id: "nextjs-create",
        tech: "nextjs",
        label: "Scaffold Next.js app",
        kind: "run",
        cmd: "pnpm",
        args: [
          "dlx",
          "create-next-app@16",
          "myapp",
          "--ts",
          "--tailwind",
          "--eslint",
          "--app",
          "--src-dir",
          "--import-alias",
          "@/*",
          "--use-pnpm",
          "--yes",
          "--disable-git",
        ],
        cwd: "parent",
        timeoutMs: 600_000,
      },
    ]);
  });

  test("owns no files (not whackable — it's the framework)", () => {
    expect(nextjsRecipe.ownedFiles).toEqual([]);
  });

  test("has no remove() — the framework cannot be whacked", () => {
    expect(nextjsRecipe.remove).toBeUndefined();
  });
});
