import {
  type ResolveError,
  type ResolvedStack,
  type Result,
  type Selection,
  type Tech,
  type TechId,
  applySitdown,
  err,
  resolveStack,
} from "@capo/core";

const MAX_RETRIES = 10;

export function resolveWithRetry(
  selection: Selection,
  catalog: Record<TechId, Tech>,
  gotommyguns: boolean,
): Result<ResolvedStack, ResolveError> {
  let current = selection;
  let last: Result<ResolvedStack, ResolveError> = err({ code: "NO_FRAMEWORK" });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    last = resolveStack(current, catalog);
    if (last.ok) return last;
    if (!gotommyguns || last.error.code !== "CONFLICT") return last;
    current = applySitdown(current, { kind: "drop", id: last.error.b });
  }

  return last;
}
