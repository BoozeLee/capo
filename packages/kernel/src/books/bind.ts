import picomatch from "picomatch";
import type { Ruling } from "./ruling.js";

function base(pattern: string): string {
  return picomatch.scan(pattern).base;
}

/** Deterministic intersection: either pattern matches the other's literal prefix. */
export function globsIntersect(a: string, b: string): boolean {
  if (a === b) return true;
  const ma = picomatch(a, { dot: true });
  const mb = picomatch(b, { dot: true });
  const ba = base(a);
  const bb = base(b);
  return (bb !== "" && ma(bb)) || (ba !== "" && mb(ba));
}

/** Active rulings whose `binds` intersect any glob in `scope`. Lookup, not search. */
export function bindings(rulings: readonly Ruling[], scope: readonly string[]): Ruling[] {
  return rulings.filter(
    (r) =>
      r.overturnedBy === null && r.binds.some((b) => scope.some((s) => globsIntersect(b, s))),
  );
}
