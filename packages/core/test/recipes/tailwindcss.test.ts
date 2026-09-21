import { describe, expect, test } from "vitest";
import { createContext } from "../../src/recipes/recipe.js";
import { tailwindcssRecipe } from "../../src/recipes/tailwindcss.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

describe("tailwindcssRecipe", () => {
  test("throws if it's ever asked to run standalone (no framework provides it in v1)", () => {
    const ctx = createContext(
      {
        framework: "nextjs",
        members: ["nextjs", "tailwindcss"],
        autoIncluded: [],
        options: DEFAULT_STACK_OPTIONS,
      },
      "myapp",
    );
    expect(() => tailwindcssRecipe.steps(ctx)).toThrow(
      "tailwindcss has no standalone recipe in v1 — it must be provided by a framework",
    );
  });

  test("owns no files", () => {
    expect(tailwindcssRecipe.ownedFiles).toEqual([]);
  });
});
