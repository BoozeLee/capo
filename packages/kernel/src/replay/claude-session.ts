export interface SessionTurn {
  readonly id: string;
  readonly ts: string;
  readonly contextTokens: number;
  readonly outputTokens: number;
}

export interface SessionSummary {
  readonly turns: number;
  readonly totalContextTokens: number;
  readonly meanContextTokens: number;
  readonly peakContextTokens: number;
}

export interface LedgerComparison {
  readonly transcriptTokens: number;
  readonly ledgerTokens: number;
  readonly ratio: number;
}

interface AssistantRecord {
  type: "assistant";
  timestamp?: string;
  message?: { id?: string; usage?: Record<string, unknown> };
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/** Claude Code writes one record per content block; dedupe by message id to get real API turns. */
export function parseSessionTurns(jsonl: string): SessionTurn[] {
  const seen = new Set<string>();
  const turns: SessionTurn[] = [];
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let rec: unknown;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const r = rec as Partial<AssistantRecord>;
    if (r.type !== "assistant" || !r.message?.id || !r.message.usage) continue;
    if (seen.has(r.message.id)) continue;
    seen.add(r.message.id);
    const u = r.message.usage;
    turns.push({
      id: r.message.id,
      ts: r.timestamp ?? "",
      contextTokens:
        num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens),
      outputTokens: num(u.output_tokens),
    });
  }
  return turns;
}

export function summarizeSession(turns: readonly SessionTurn[]): SessionSummary {
  const total = turns.reduce((s, t) => s + t.contextTokens, 0);
  return {
    turns: turns.length,
    totalContextTokens: total,
    meanContextTokens: turns.length === 0 ? 0 : Math.round(total / turns.length),
    peakContextTokens: turns.reduce((m, t) => Math.max(m, t.contextTokens), 0),
  };
}

/** What the session would have cost if every turn were rendered from the ledger instead. */
export function compareToLedger(
  summary: SessionSummary,
  renderedTokens: number,
): LedgerComparison {
  const ledgerTokens = renderedTokens * summary.turns;
  return {
    transcriptTokens: summary.totalContextTokens,
    ledgerTokens,
    ratio: summary.totalContextTokens === 0 ? 0 : ledgerTokens / summary.totalContextTokens,
  };
}
