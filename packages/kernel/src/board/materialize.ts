import type { Hit } from "../hits/schema.js";
import type { LedgerEvent } from "../ledger/event.js";

export type NodeStatus = "pending" | "blocked" | "running" | "done" | "failed";

export interface NodeState {
  readonly id: string;
  readonly status: NodeStatus;
  readonly toolCalls: number;
  readonly deviations: number;
  readonly acceptExit: number | null;
  readonly startedSeq: number | null;
  readonly finishedSeq: number | null;
}

export interface HitState {
  readonly nodes: Record<string, NodeState>;
}

export interface Board {
  readonly hits: Record<string, HitState>;
  readonly lastSeq: number;
}

/** Events that survive every `rewind` cut. Linear rule: rewind{to:N} at seq R cuts N < seq < R. */
export function liveEvents(events: readonly LedgerEvent[]): LedgerEvent[] {
  const cut = new Set<number>();
  for (const e of events) {
    if (e.kind !== "rewind") continue;
    const to = typeof e.payload.to === "number" ? e.payload.to : Number.NaN;
    if (!Number.isInteger(to)) continue;
    for (const v of events) {
      if (v.seq > to && v.seq < e.seq) cut.add(v.seq);
    }
  }
  return events.filter((e) => !cut.has(e.seq));
}

type Mutable = { -readonly [K in keyof NodeState]: NodeState[K] };

function applyEvent(state: Mutable, e: LedgerEvent): void {
  switch (e.kind) {
    case "node_start":
      state.status = "running";
      state.startedSeq = e.seq;
      state.finishedSeq = null;
      state.acceptExit = null;
      break;
    case "edit":
      state.toolCalls += 1;
      break;
    case "deviation":
      state.deviations += 1;
      break;
    case "accept_run":
      state.acceptExit = typeof e.payload.exit === "number" ? e.payload.exit : null;
      break;
    case "node_done":
      state.status = "done";
      state.finishedSeq = e.seq;
      if (typeof e.payload.accept_exit === "number") state.acceptExit = e.payload.accept_exit;
      break;
    case "node_failed":
      state.status = "failed";
      state.finishedSeq = e.seq;
      break;
    default:
      break;
  }
}

export function materialize(events: readonly LedgerEvent[], hits: readonly Hit[]): Board {
  const board: Record<string, Record<string, Mutable>> = {};
  for (const hit of hits) {
    board[hit.id] = Object.fromEntries(
      hit.nodes.map((n) => [
        n.id,
        {
          id: n.id,
          status: "pending",
          toolCalls: 0,
          deviations: 0,
          acceptExit: null,
          startedSeq: null,
          finishedSeq: null,
        },
      ]),
    );
  }
  for (const e of liveEvents(events)) {
    if (!e.hit || !e.node) continue;
    const node = board[e.hit]?.[e.node];
    if (node) applyEvent(node, e);
  }
  for (const hit of hits) {
    for (const n of hit.nodes) {
      const s = board[hit.id][n.id];
      if (s.status !== "pending") continue;
      const blocked = n.depends_on.some((d) => board[hit.id][d]?.status !== "done");
      if (blocked) s.status = "blocked";
    }
  }
  return {
    hits: Object.fromEntries(Object.entries(board).map(([id, nodes]) => [id, { nodes }])),
    lastSeq: events.at(-1)?.seq ?? 0,
  };
}
