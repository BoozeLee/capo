import type { Step } from "../types/plan.js";
import type { Recipe } from "./recipe.js";

export const shadcnRecipe: Recipe = {
  tech: "shadcn",
  ownedFiles: ["components.json", "src/components/ui", "src/lib/utils.ts"],
  steps(): Step[] {
    return [
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
    ];
  },
};
