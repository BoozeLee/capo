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
}

/** Rough but stable: 4 chars ≈ 1 token. Good enough to compare renderings against each other. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function eventLine(e: LedgerEvent): string {
  const payload = Object.keys(e.payload).length > 0 ? ` ${JSON.stringify(e.payload)}` : "";
  return `- #${e.seq} ${e.ts} ${e.actor} ${e.kind}${payload}`;
}

/**
 * Context is a function of the contract, not of session length: the node's contract, the
 * rulings bound to its write_scope, and as many of this node's most recent events as fit.
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
    "## Recent events on this node",
  ].join("\n");
  const own = input.events.filter((e) => e.hit === input.hit.id && e.node === input.node.id);
  let kept = own.length;
  for (;;) {
    const lines = own.slice(own.length - kept).map(eventLine);
    const text = `${head}\n${lines.length > 0 ? lines.join("\n") : "(none)"}\n`;
    const tokens = estimateTokens(text);
    if (tokens <= input.budgetTokens || kept === 0) {
      return { text, tokens, eventsIncluded: kept, eventsDropped: own.length - kept };
    }
    kept -= 1;
  }
}
