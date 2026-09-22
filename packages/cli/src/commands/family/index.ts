import { findCapoDir } from "@capo/kernel";
import { runBoard } from "./board.js";
import { runBooks } from "./books.js";
import { runContext } from "./context.js";
import type { FamilyCtx } from "./ctx.js";
import { runHit } from "./hit.js";
import { runLedger } from "./ledger.js";
import { type FamilyFlags, type FamilyIo, fail } from "./output.js";
import { runReplay } from "./replay.js";
import { runRewind } from "./rewind.js";
import { FAMILY_USAGE, isFamilyCommand } from "./usage.js";

export { FAMILY_COMMANDS, FAMILY_USAGE, isFamilyCommand } from "./usage.js";
export type { FamilyFlags, FamilyIo } from "./output.js";

export async function runFamilyCommand(
  input: readonly string[],
  flags: FamilyFlags,
  io: FamilyIo,
): Promise<number> {
  const [cmd, ...rest] = input;
  if (!cmd || !isFamilyCommand(cmd)) return fail(io, FAMILY_USAGE);
  const capoDir = await findCapoDir(io.cwd);
  if (capoDir === null) {
    return fail(io, "no .capo/ here — hold a sit-down first (/sitdown) to open one");
  }
  const ctx: FamilyCtx = { capoDir, io, flags };
  switch (cmd) {
    case "ledger":
      return runLedger(ctx, rest);
    case "board":
      return runBoard(ctx, rest);
    case "hit":
      return runHit(ctx, rest);
    case "books":
      return runBooks(ctx, rest);
    case "context":
      return runContext(ctx, rest);
    case "rewind":
      return runRewind(ctx);
    case "replay":
      return runReplay(ctx, rest);
  }
}
