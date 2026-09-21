import { type Hit, listHits, loadHit, materialize } from "@capo/kernel";
import type { FamilyCtx } from "./ctx.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export async function loadHits(ctx: FamilyCtx, only?: string): Promise<Hit[]> {
  const slugs = only ? [only] : await listHits(ctx.capoDir);
  const hits: Hit[] = [];
  for (const slug of slugs) {
    const r = await loadHit(ctx.capoDir, slug);
    if (!r.ok) throw new Error(`hit ${slug}: ${r.error.map((e) => e.message).join("; ")}`);
    hits.push(r.value);
  }
  return hits;
}

const GLYPH = { pending: "○", blocked: "◌", running: "●", done: "✓", failed: "✗" } as const;

export async function runBoard(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  let hits: Hit[];
  try {
    hits = await loadHits(ctx, args[0]);
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
  const { all } = await readLive(ctx);
  const board = materialize(all, hits);
  emit(ctx.io, ctx.flags, board, () =>
    hits
      .map((h) =>
        [
          `${h.id}  ${h.title}`,
          ...h.nodes.map((n) => {
            const s = board.hits[h.id].nodes[n.id];
            const calls = s.status === "running" ? `  calls ${s.toolCalls}/${n.budget}` : "";
            const dev = s.deviations ? `  ⚠${s.deviations}` : "";
            return `  ${GLYPH[s.status]} ${n.id}  ${n.goal}${calls}${dev}`;
          }),
        ].join("\n"),
      )
      .join("\n\n"),
  );
  return 0;
}
