import picomatch from "picomatch";
import type { HitNode } from "../hits/schema.js";

export interface ScopeReport {
  readonly ok: boolean;
  readonly outside: string[];
  readonly forbidden: string[];
}

export function checkScope(
  node: Pick<HitNode, "write_scope" | "forbidden">,
  changed: readonly string[],
): ScopeReport {
  const inScope = picomatch(node.write_scope, { dot: true });
  const isForbidden =
    node.forbidden.length > 0 ? picomatch(node.forbidden, { dot: true }) : () => false;
  const forbidden = changed.filter((f) => isForbidden(f));
  const outside = changed.filter((f) => !isForbidden(f) && !inScope(f));
  return { ok: forbidden.length === 0 && outside.length === 0, outside, forbidden };
}
