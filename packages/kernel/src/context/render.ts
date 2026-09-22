import { stringify } from "yaml";
import { type Ruling, formatRuling } from "../books/ruling.js";
import type { Hit, HitNode } from "../hits/schema.js";
import type { LedgerEvent } from "../ledger/event.js";

export interface RenderInput {
  readonly hit: Hit;
  readonly node: HitNode;
  readonly rulings: readonly Ruling[];
  readonly events: readonly LedgerEvent[];
  readonly budgetTokens: number;
}

export interface RenderedContext {
  readonly text: string;
  readonly tokens: number;
  readonly eventsIncluded: number;
  readonly eventsDropped: number;
  readonly slicesIncluded: number;
  readonly slicesDropped: number;
}

/** Path + body and/or diff carried by an `edit` event — the state a fresh soldier needs. */
export interface EditSlice {
  readonly path: string;
  readonly body?: string;
  readonly diff?: string;
}

/** Rough but stable: 4 chars ≈ 1 token. Good enough to compare renderings against each other. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Pull a file slice out of an edit payload. Returns null if path or content is missing. */
export function editSliceFromPayload(payload: Record<string, unknown>): EditSlice | null {
  const path = payload.path;
  if (typeof path !== "string" || path.length === 0) return null;
  const body = typeof payload.body === "string" ? payload.body : undefined;
  const diff = typeof payload.diff === "string" ? payload.diff : undefined;
  if (body === undefined && diff === undefined) return null;
  return { path, ...(body !== undefined ? { body } : {}), ...(diff !== undefined ? { diff } : {}) };
}

function formatSlice(slice: EditSlice): string {
  const content = slice.diff ?? slice.body ?? "";
  return [`### ${slice.path}`, "```", content, "```"].join("\n");
}

function eventLine(e: LedgerEvent): string {
  // File bodies live under "## File slices from edits". Path-bearing edits point at the path;
  // note-only edits keep their payload so the event log stays informative.
  if (e.kind === "edit" && typeof e.payload.path === "string") {
    return `- #${e.seq} ${e.ts} ${e.actor} edit ${e.payload.path}`;
  }
  const payload = Object.keys(e.payload).length > 0 ? ` ${JSON.stringify(e.payload)}` : "";
  return `- #${e.seq} ${e.ts} ${e.actor} ${e.kind}${payload}`;
}

function buildText(
  head: string,
  slices: readonly EditSlice[],
  events: readonly LedgerEvent[],
): string {
  const sliceBlock =
    slices.length > 0 ? slices.map(formatSlice).join("\n\n") : "(none)";
  const eventBlock =
    events.length > 0 ? events.map(eventLine).join("\n") : "(none)";
  return [
    head,
    "## File slices from edits",
    sliceBlock,
    "",
    "## Recent events on this node",
    eventBlock,
    "",
  ].join("\n");
}

/**
 * Context is a function of the contract, not of session length: the node's contract, the
 * rulings bound to its write_scope, edit file slices, and as many of this node's most recent
 * events as fit.
 */
export function renderContext(input: RenderInput): RenderedContext {
  const head = [
    `# ${input.hit.title} — node ${input.node.id}`,
    "",
    "## Contract",
    "```yaml",
    stringify(input.node).trimEnd(),
    "```",
    "",
    "## Rulings that bind this scope",
    input.rulings.length > 0 ? input.rulings.map(formatRuling).join("\n") : "(none)",
    "",
  ].join("\n");

  const own = input.events.filter((e) => e.hit === input.hit.id && e.node === input.node.id);
  let kept = own.length;
  for (;;) {
    const keptEvents = own.slice(own.length - kept);
    const allSlices = keptEvents
      .filter((e) => e.kind === "edit")
      .map((e) => editSliceFromPayload(e.payload))
      .filter((s): s is EditSlice => s !== null);
    // Prefer newest slices when the bodies alone blow the budget: drop oldest slices first,
    // keeping the events list intact until slices are gone.
    let sliceCount = allSlices.length;
    for (;;) {
      const slices = allSlices.slice(allSlices.length - sliceCount);
      const text = buildText(head, slices, keptEvents);
      const tokens = estimateTokens(text);
      if (tokens <= input.budgetTokens || (kept === 0 && sliceCount === 0)) {
        const totalSlices = own
          .filter((e) => e.kind === "edit")
          .map((e) => editSliceFromPayload(e.payload))
          .filter((s): s is EditSlice => s !== null).length;
        return {
          text,
          tokens,
          eventsIncluded: kept,
          eventsDropped: own.length - kept,
          slicesIncluded: slices.length,
          slicesDropped: totalSlices - slices.length,
        };
      }
      if (sliceCount > 0) {
        sliceCount -= 1;
        continue;
      }
      break;
    }
    if (kept === 0) {
      const text = buildText(head, [], []);
      return {
        text,
        tokens: estimateTokens(text),
        eventsIncluded: 0,
        eventsDropped: own.length,
        slicesIncluded: 0,
        slicesDropped: own
          .filter((e) => e.kind === "edit")
          .map((e) => editSliceFromPayload(e.payload))
          .filter((s): s is EditSlice => s !== null).length,
      };
    }
    kept -= 1;
  }
}
