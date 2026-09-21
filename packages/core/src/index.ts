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
