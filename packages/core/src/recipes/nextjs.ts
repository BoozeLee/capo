import type { Step } from "../types/plan.js";
import type { Recipe, RecipeContext } from "./recipe.js";

export const nextjsRecipe: Recipe = {
  tech: "nextjs",
  ownedFiles: [],
  steps(ctx: RecipeContext): Step[] {
    return [
      {
        id: "nextjs-create",
        tech: "nextjs",
        label: "Scaffold Next.js app",
        kind: "run",
        cmd: "pnpm",
        args: [
          "dlx",
          "create-next-app@16",
          ctx.name,
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
    ];
  },
};
