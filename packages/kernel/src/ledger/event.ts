import { z } from "zod";

export const EVENT_KINDS = [
  "sitdown_open",
  "node_start",
  "edit",
  "deviation",
  "accept_run",
  "node_done",
  "node_failed",
  "ruling_added",
  "override",
  "rewind",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const EventSchema = z
  .object({
    seq: z.number().int().positive(),
    ts: z.string().datetime(),
    actor: z.string().min(1),
    kind: z.enum(EVENT_KINDS),
    hit: z.string().optional(),
    node: z.string().optional(),
    parent: z.number().int().positive().nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type LedgerEvent = z.infer<typeof EventSchema>;

/** What a caller supplies; the store assigns seq/ts/parent. */
export interface NewEvent {
  readonly actor: string;
  readonly kind: EventKind;
  readonly hit?: string;
  readonly node?: string;
  readonly parent?: number | null;
  readonly payload?: Record<string, unknown>;
}
