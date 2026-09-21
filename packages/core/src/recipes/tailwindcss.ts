import type { Step } from "../types/plan.js";
import type { Recipe } from "./recipe.js";

export const tailwindcssRecipe: Recipe = {
  tech: "tailwindcss",
  ownedFiles: [],
  steps(): Step[] {
    throw new Error(
      "tailwindcss has no standalone recipe in v1 — it must be provided by a framework",
    );
  },
};
