import { readFile } from "node:fs/promises";
import { type Ruling, appeals, bindings, booksPath, parseBooks } from "@capo/kernel";
import type { FamilyCtx } from "./ctx.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";
import { FAMILY_USAGE } from "./usage.js";

export async function loadRulings(ctx: FamilyCtx): Promise<Ruling[]> {
  let text = "";
  try {
    text = await readFile(booksPath(ctx.capoDir), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const r = parseBooks(text);
  if (!r.ok) {
    throw new Error(`books.md: ${r.error.map((e) => `${e.title}: ${e.message}`).join("; ")}`);
  }
  return r.value;
}

const line = (r: Ruling) =>
  `## ${r.title}\n  binds ${r.binds.join(", ")}\n  overturn-if ${r.overturnIf}`;

export async function runBooks(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, ...rest] = args;
  let rulings: Ruling[];
  try {
    rulings = await loadRulings(ctx);
  } catch (error) {
    return fail(ctx.io, error instanceof Error ? error.message : String(error));
  }
  if (sub === "bind") {
    if (rest.length === 0) return fail(ctx.io, "books bind needs at least one glob");
    const bound = bindings(rulings, rest);
    emit(ctx.io, ctx.flags, bound, () =>
      bound.length ? bound.map(line).join("\n") : "(no rulings bind this scope)",
    );
    return 0;
  }
  if (sub === "appeal") {
    const { live } = await readLive(ctx);
    const up = appeals(rulings, live);
    emit(ctx.io, ctx.flags, up, () =>
      up.length
        ? up.map((a) => `${a.overrides}× overridden: ${a.ruling.title}`).join("\n")
        : "(no rulings up for appeal)",
    );
    return 0;
  }
  if (sub === "override") {
    const title = rest.join(" ");
    if (!rulings.some((r) => r.title === title)) return fail(ctx.io, `no ruling titled ${title}`);
    const { ledger } = await readLive(ctx);
    const e = await ledger.append({
      actor: ctx.flags.actor ?? "capo",
      kind: "override",
      payload: { ruling: title, note: ctx.flags.note ?? "" },
    });
    emit(ctx.io, ctx.flags, e, () => `override #${e.seq} recorded against: ${title}`);
    return 0;
  }
  return fail(ctx.io, FAMILY_USAGE);
}
