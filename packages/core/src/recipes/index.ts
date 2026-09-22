import type { TechId } from "../types/tech.js";
import { drizzleRecipe } from "./drizzle.js";
import { memoryMcpServerRecipe } from "./memory-mcp-server.js";
import { nextjsRecipe } from "./nextjs.js";
import type { Recipe } from "./recipe.js";
import { shadcnRecipe } from "./shadcn.js";
import { tailwindcssRecipe } from "./tailwindcss.js";
import { vercelAiSdkRecipe } from "./vercel-ai-sdk.js";

export const RECIPES: Record<TechId, Recipe> = {
  nextjs: nextjsRecipe,
  tailwindcss: tailwindcssRecipe,
  shadcn: shadcnRecipe,
  drizzle: drizzleRecipe,
  "vercel-ai-sdk": vercelAiSdkRecipe,
  "memory-mcp-server": memoryMcpServerRecipe,
};

export {
  nextjsRecipe,
  tailwindcssRecipe,
  shadcnRecipe,
  drizzleRecipe,
  vercelAiSdkRecipe,
  memoryMcpServerRecipe,
};
export type { Recipe, RecipeContext } from "./recipe.js";
