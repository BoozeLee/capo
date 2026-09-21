import { createContext } from "../recipes/recipe.js";
import type { Recipe } from "../recipes/recipe.js";
import type { ScaffoldPlan, Step } from "../types/plan.js";
import type { ResolvedStack } from "../types/stack.js";
import type { Tech, TechId } from "../types/tech.js";
import type { Category } from "../types/tech.js";
import { finalizeSteps } from "./finalize.js";

const CATEGORY_ORDER: readonly Category[] = ["framework", "styling", "ui", "database", "ai", "mcp"];

export interface PlanScaffoldInput {
  readonly stack: ResolvedStack;
  readonly name: string;
  readonly catalog: Record<TechId, Tech>;
  readonly recipes: Record<TechId, Recipe>;
  readonly coreVersion: string;
  readonly createdAt: string;
}

export function planScaffold(input: PlanScaffoldInput): ScaffoldPlan {
  const { stack, name, catalog, recipes, coreVersion, createdAt } = input;

  const orderedMembers = [...stack.members].sort((a, b) => {
    const rank = (id: TechId) => CATEGORY_ORDER.indexOf(catalog[id].category);
    return rank(a) - rank(b);
  });

  const steps: Step[] = [];
  const owned: Record<string, readonly string[]> = {};

  for (const member of orderedMembers) {
    const recipe = recipes[member];
    const ctx = createContext(stack, name);
    steps.push(...recipe.steps(ctx));
    if (recipe.ownedFiles.length > 0) {
      owned[member] = recipe.ownedFiles;
    }
  }

  steps.push(...finalizeSteps(stack, name, coreVersion, owned, createdAt));

  return {
    schemaVersion: 1,
    coreVersion,
    project: { name },
    stack,
    steps,
  };
}
