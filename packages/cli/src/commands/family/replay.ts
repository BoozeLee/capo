import { readFile } from "node:fs/promises";
import { compareToLedger, parseSessionTurns, summarizeSession } from "@capo/kernel";
import { renderFor } from "./context.js";
import type { FamilyCtx } from "./ctx.js";
import { emit, fail } from "./output.js";

export async function runReplay(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [file, slug, nodeId] = args;
  if (!file || !slug || !nodeId) return fail(ctx.io, "replay <session.jsonl> <hit> <node>");
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return fail(ctx.io, `cannot read ${file}`);
  }
  try {
    const summary = summarizeSession(parseSessionTurns(text));
    const rendered = await renderFor(ctx, slug, nodeId);
    const cmp = compareToLedger(summary, rendered.tokens);
    const out = { ...summary, renderedTokensPerTurn: rendered.tokens, ...cmp };
    emit(ctx.io, ctx.flags, out, () =>
      [
        `turns                ${summary.turns}`,
        `transcript tokens    ${summary.totalContextTokens} (mean ${summary.meanContextTokens}, peak ${summary.peakContextTokens})`,
        `ledger render/turn   ${rendered.tokens} [est. chars/4]`,
        `ledger tokens        ${cmp.ledgerTokens}`,
        `ratio                ${cmp.ratio.toFixed(2)}  (blueprint go: ≤ 0.60, cut D1: > 0.80)`,
      ].join("\n"),
    );
    return 0;
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
}
