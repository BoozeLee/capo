export interface SessionTurn {
  readonly id: string;
  readonly ts: string;
  /** Full model-facing context for this assistant turn (usage-based). */
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

/** Denominator for an honest replay: tool/file bytes the soldier actually observed. */
export interface StateBearingSummary {
  readonly toolResultChars: number;
  readonly toolResultTokens: number;
  readonly toolResultCount: number;
}

export interface StateBearingComparison {
  /** State-bearing transcript tokens (tool_result / file content), not full context. */
  readonly stateBearingTokens: number;
  readonly ledgerTokens: number;
  readonly ratio: number;
  readonly denominator: "state-bearing-tool-results";
}

interface AssistantRecord {
  type: "assistant";
  timestamp?: string;
  message?: { id?: string; usage?: Record<string, unknown> };
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/** Same estimator the context renderer uses: 4 chars ≈ 1 token. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function tokensFromChars(chars: number): number {
  return chars === 0 ? 0 : Math.ceil(chars / 4);
}

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

/**
 * Sum characters/tokens from `tool_result` blocks in user records.
 * That is the state a soldier observed (command output, file reads) — not the system prompt.
 */
export function summarizeStateBearing(jsonl: string): StateBearingSummary {
  let chars = 0;
  let count = 0;
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let rec: unknown;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!rec || typeof rec !== "object") continue;
    const r = rec as { type?: string; message?: { content?: unknown } };
    if (r.type !== "user") continue;
    const content = r.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b = block as { type?: string; content?: unknown };
      if (b.type !== "tool_result") continue;
      const text = toolResultText(b.content);
      if (text.length === 0) continue;
      chars += text.length;
      count += 1;
    }
  }
  return {
    toolResultChars: chars,
    toolResultTokens: tokensFromChars(chars),
    toolResultCount: count,
  };
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

/**
 * Legacy full-context compare. Inflates the denominator with system prompt + cache;
 * kept for callers not yet on the state-bearing path (CLI wires in h3).
 */
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

/**
 * Honest week-2 compare: ledger render cost vs state-bearing tool/file tokens.
 * `renderedTokens` is one node's `renderContext` size; scaled by assistant turns
 * so a multi-turn session is comparable to the session-long denominator.
 */
export function compareStateBearingToLedger(
  summary: SessionSummary,
  stateBearing: StateBearingSummary,
  renderedTokens: number,
): StateBearingComparison {
  const stateBearingTokens = tokensFromChars(stateBearing.toolResultChars);
  const ledgerTokens = renderedTokens * Math.max(summary.turns, 1);
  return {
    stateBearingTokens,
    ledgerTokens,
    ratio: stateBearingTokens === 0 ? 0 : ledgerTokens / stateBearingTokens,
    denominator: "state-bearing-tool-results",
  };
}
