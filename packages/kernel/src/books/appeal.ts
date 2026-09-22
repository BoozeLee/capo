import type { LedgerEvent } from "../ledger/event.js";
import type { Ruling } from "./ruling.js";

export interface Appeal {
  readonly ruling: Ruling;
  readonly overrides: number;
}

/** A ruling the Capo has overridden `threshold` times is up for appeal at the next sit-down. */
export function appeals(
  rulings: readonly Ruling[],
  events: readonly LedgerEvent[],
  threshold = 3,
): Appeal[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== "override" || typeof e.payload.ruling !== "string") continue;
    counts.set(e.payload.ruling, (counts.get(e.payload.ruling) ?? 0) + 1);
  }
  return rulings
    .filter((r) => r.overturnedBy === null && (counts.get(r.title) ?? 0) >= threshold)
    .map((r) => ({ ruling: r, overrides: counts.get(r.title) ?? 0 }));
}
