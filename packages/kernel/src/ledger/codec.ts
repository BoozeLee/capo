import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { EventSchema, type LedgerEvent } from "./event.js";

export interface LedgerParseError {
  readonly line: number;
  readonly reason: string;
}

export function serializeEvent(event: LedgerEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseLedger(text: string): Result<LedgerEvent[], LedgerParseError> {
  const events: LedgerEvent[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return err({ line: i + 1, reason: "invalid JSON" });
    }
    const parsed = EventSchema.safeParse(raw);
    if (!parsed.success) {
      return err({ line: i + 1, reason: parsed.error.issues[0]?.message ?? "invalid event" });
    }
    const event = parsed.data;
    const prevSeq = events.at(-1)?.seq ?? 0;
    if (event.seq <= prevSeq) {
      return err({ line: i + 1, reason: `seq ${event.seq} is not greater than ${prevSeq}` });
    }
    if (event.parent !== null && event.parent >= event.seq) {
      return err({
        line: i + 1,
        reason: `parent ${event.parent} does not precede seq ${event.seq}`,
      });
    }
    events.push(event);
  }
  return ok(events);
}
