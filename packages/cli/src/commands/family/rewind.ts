import type { FamilyCtx } from "./ctx.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";

export async function runRewind(ctx: FamilyCtx): Promise<number> {
  const to = ctx.flags.to;
  if (to === undefined || !Number.isInteger(to) || to < 0) return fail(ctx.io, "rewind --to <seq>");
  const { ledger, all } = await readLive(ctx);
  const last = all.at(-1)?.seq ?? 0;
  if (to > last) return fail(ctx.io, `cannot rewind to ${to}: ledger ends at ${last}`);
  const cut = all.filter((e) => e.seq > to).map((e) => e.seq);
  const e = await ledger.append({
    actor: ctx.flags.actor ?? "capo",
    kind: "rewind",
    parent: to === 0 ? null : to,
    payload: { to, cut },
  });
  emit(
    ctx.io,
    ctx.flags,
    e,
    () =>
      `rewound to #${to}; ${cut.length} events cut (still in the ledger, no longer on the board). File state is yours to reset: git checkout <sha from the node_start you kept>.`,
  );
  return 0;
}
