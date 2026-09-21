import type { Tech, TechId } from "../types/tech.js";

export function validateCatalog(catalog: Record<TechId, Tech>): string[] {
  const errors: string[] = [];
  const knownIds = new Set(Object.keys(catalog));

  for (const [key, entry] of Object.entries(catalog) as [TechId, Tech][]) {
    if (entry.id !== key) {
      errors.push(`catalog key "${key}" does not match its entry's id "${entry.id}"`);
    }

    for (const [field, refs] of [
      ["requires", entry.requires],
      ["conflictsWith", entry.conflictsWith],
      ["provides", entry.provides],
    ] as const) {
      for (const ref of refs) {
        if (ref === entry.id) {
          errors.push(`${entry.id}.${field} references itself`);
        } else if (!knownIds.has(ref)) {
          errors.push(`${entry.id}.${field} references unknown tech "${ref}"`);
        }
      }
    }
  }

  return errors;
}
