import { EVENT_KINDS, type EventKind, createFileLedger, liveEvents } from "@capo/kernel";
import type { FamilyCtx } from "./ctx.js";
import { emit, fail } from "./output.js";
import { FAMILY_USAGE } from "./usage.js";

export async function readLive(ctx: FamilyCtx) {
  const ledger = createFileLedger(ctx.capoDir, { now: ctx.io.now });
  const read = await ledger.read();
  if (!read.ok) throw new Error(`ledger corrupt at line ${read.error.line}: ${read.error.reason}`);
  return { ledger, all: read.value, live: liveEvents(read.value) };
}

export function parsePayload(text: string | undefined): Record<string, unknown> | null {
  if (text === undefined) return {};
  try {
    const v = JSON.parse(text);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export async function runLedger(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "tail") {
    const n = Number.parseInt(rest[0] ?? "20", 10);
    const { live } = await readLive(ctx);
    const tail = live.slice(-n);
    emit(ctx.io, ctx.flags, tail, () =>
      tail
        .map(
          (e) =>
            `#${e.seq} ${e.ts} ${e.actor} ${e.kind} ${e.hit ?? ""}/${e.node ?? ""} ${JSON.stringify(e.payload)}`,
        )
        .join("\n"),
    );
    return 0;
  }
  if (sub === "append") {
    const kind = ctx.flags.kind;
    if (!kind || !(EVENT_KINDS as readonly string[]).includes(kind)) {
      return fail(ctx.io, `--kind must be one of: ${EVENT_KINDS.join(", ")}`);
    }
    const payload = parsePayload(ctx.flags.payload);
    if (payload === null) return fail(ctx.io, "--payload must be a JSON object");
    const { ledger } = await readLive(ctx);
    const event = await ledger.append({
      actor: ctx.flags.actor ?? "capo",
      kind: kind as EventKind,
      ...(rest[0] ? { hit: rest[0] } : {}),
      ...(rest[1] ? { node: rest[1] } : {}),
      payload,
    });
    emit(ctx.io, ctx.flags, event, () => `#${event.seq} ${event.kind} appended`);
    return 0;
  }
  return fail(ctx.io, FAMILY_USAGE);
}
