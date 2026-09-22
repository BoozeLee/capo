import type { Hit, HitNode } from "../hits/schema.js";
import type { Board } from "./materialize.js";

/** Declaration order wins among runnable nodes: the sit-down already ordered them by risk. */
export function nextRunnable(hit: Hit, board: Board): HitNode | null {
  const states = board.hits[hit.id]?.nodes ?? {};
  return hit.nodes.find((n) => states[n.id]?.status === "pending") ?? null;
}
