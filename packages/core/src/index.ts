export type { Category, Tech, TechId } from "./types/tech.js";
export { CATALOG } from "./catalog/catalog.js";
export { validateCatalog } from "./catalog/validate.js";
export type { Result } from "./types/result.js";
export { err, ok } from "./types/result.js";
export type {
  ResolvedStack,
  ResolveError,
  Selection,
  SitdownOption,
  StackOptions,
} from "./types/stack.js";
export { DEFAULT_STACK_OPTIONS } from "./types/stack.js";
export { validateProjectName } from "./resolver/validate-name.js";
export { resolveStack } from "./resolver/resolve.js";
export { applySitdown, sitdownOptions } from "./resolver/negotiate.js";
export type { JsonObject, JsonValue, ScaffoldPlan, Step } from "./types/plan.js";
export type { CapoManifest } from "./manifest/schema.js";
export { CapoManifestSchema } from "./manifest/schema.js";
export { fromYaml, toYaml } from "./manifest/serialize.js";
export type { Recipe, RecipeContext } from "./recipes/recipe.js";
export { createContext } from "./recipes/recipe.js";
export { RECIPES } from "./recipes/index.js";
export { planScaffold } from "./planner/plan.js";
export type { PlanScaffoldInput } from "./planner/plan.js";
export type { ScaffoldEvent } from "./types/events.js";
export type { ProgressPhase, ProgressState } from "./progress/reducer.js";
export { INITIAL_PROGRESS_STATE, reduceProgress } from "./progress/reducer.js";
export type { ThemeMode } from "./theme/lines.js";
export { phaseLine } from "./theme/lines.js";
export type { PackageJsonLike, TechStatus } from "./status/compare.js";
export { compareInstalled } from "./status/compare.js";
export { ScaffoldPlanSchema } from "./types/plan-schema.js";
export { parseCrew } from "./resolver/parse-crew.js";
