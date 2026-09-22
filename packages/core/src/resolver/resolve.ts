import { type Result, err, ok } from "../types/result.js";
import type { ResolveError, ResolvedStack, Selection } from "../types/stack.js";
import type { Tech, TechId } from "../types/tech.js";
import { sitdownOptions } from "./negotiate.js";
import { validateProjectName } from "./validate-name.js";

export function resolveStack(
  selection: Selection,
  catalog: Record<TechId, Tech>,
): Result<ResolvedStack, ResolveError> {
  const nameError = validateProjectName(selection.name);
  if (nameError !== null) {
    return err({ code: "INVALID_NAME", name: selection.name, reason: nameError });
  }

  for (const id of selection.crew) {
    if (!(id in catalog)) {
      return err({ code: "UNKNOWN_TECH", id });
    }
  }

  const providedIds = new Set<TechId>();
  for (const id of selection.crew) {
    for (const p of catalog[id].provides) providedIds.add(p);
  }

  const members: TechId[] = [];
  const memberSet = new Set<TechId>();
  const autoIncluded: TechId[] = [];

  const queue: TechId[] = [...selection.crew];
  for (const id of selection.crew) {
    memberSet.add(id);
    members.push(id);
  }

  while (queue.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: queue.length > 0 guarantees this
    const current = queue.shift()!;
    for (const req of catalog[current].requires) {
      if (memberSet.has(req) || providedIds.has(req)) continue;
      memberSet.add(req);
      members.push(req);
      autoIncluded.push(req);
      queue.push(req);
      for (const p of catalog[req].provides) providedIds.add(p);
    }
  }

  const frameworks = members.filter((id) => catalog[id].category === "framework");
  if (frameworks.length === 0) {
    return err({ code: "NO_FRAMEWORK" });
  }
  if (frameworks.length > 1) {
    return err({ code: "MULTIPLE_FRAMEWORKS", ids: frameworks });
  }

  for (const a of members) {
    for (const b of catalog[a].conflictsWith) {
      if (memberSet.has(b)) {
        return err({ code: "CONFLICT", a, b, options: sitdownOptions(a, b) });
      }
    }
  }

  return ok({
    framework: frameworks[0],
    members,
    autoIncluded,
    options: selection.options,
  });
}
