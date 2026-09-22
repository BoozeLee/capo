import type { Step } from "../types/plan.js";
import type { ResolvedStack } from "../types/stack.js";
import type { TechId } from "../types/tech.js";

export interface RecipeContext {
  readonly name: string;
  readonly stack: ResolvedStack;
  has(id: TechId): boolean;
}

export interface Recipe {
  readonly tech: TechId;
  steps(ctx: RecipeContext): readonly Step[];
  readonly ownedFiles: readonly string[];
  remove?(ctx: RecipeContext): readonly Step[];
}

export function createContext(stack: ResolvedStack, name: string): RecipeContext {
  const memberSet = new Set(stack.members);
  return {
    name,
    stack,
    has: (id) => memberSet.has(id),
  };
}
