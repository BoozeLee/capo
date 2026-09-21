import { bindings, loadHit, renderContext } from "@capo/kernel";
import { loadRulings } from "./books.js";
import type { FamilyCtx } from "./ctx.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export const DEFAULT_BUDGET = 4000;

export async function renderFor(ctx: FamilyCtx, slug: string, nodeId: string) {
  const loaded = await loadHit(ctx.capoDir, slug);
  if (!loaded.ok) throw new Error(loaded.error.map((e) => e.message).join("; "));
  const node = loaded.value.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`node ${nodeId} not in hit ${slug}`);
  const rulings = bindings(await loadRulings(ctx), node.write_scope);
  const { live } = await readLive(ctx);
  return renderContext({
    hit: loaded.value,
    node,
    rulings,
    events: live,
    budgetTokens: ctx.flags.budget ?? DEFAULT_BUDGET,
  });
}

export async function runContext(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [slug, nodeId] = args;
  if (!slug || !nodeId) return fail(ctx.io, "context <hit> <node>");
  try {
    const r = await renderFor(ctx, slug, nodeId);
    emit(ctx.io, ctx.flags, r, () => r.text);
    return 0;
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
}
