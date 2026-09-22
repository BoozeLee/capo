import { appendFile, readFile } from "node:fs/promises";
import { ledgerPath } from "../capo-dir.js";
import type { Result } from "../result.js";
import { type LedgerParseError, parseLedger, serializeEvent } from "./codec.js";
import type { LedgerEvent, NewEvent } from "./event.js";

export interface LedgerStore {
  read(): Promise<Result<LedgerEvent[], LedgerParseError>>;
  /** Appends with seq = last+1, parent = last seq unless given. Throws on a corrupt ledger. */
  append(event: NewEvent): Promise<LedgerEvent>;
}

export interface LedgerStoreOptions {
  readonly now?: () => string;
}

export class LedgerCorruptError extends Error {
  constructor(
    readonly line: number,
    reason: string,
  ) {
    super(`ledger corrupt at line ${line}: ${reason}`);
    this.name = "LedgerCorruptError";
  }
}

async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export function createFileLedger(capoDir: string, opts: LedgerStoreOptions = {}): LedgerStore {
  const file = ledgerPath(capoDir);
  const now = opts.now ?? (() => new Date().toISOString());
  return {
    async read() {
      return parseLedger(await readText(file));
    },
    async append(input) {
      const current = parseLedger(await readText(file));
      if (!current.ok) throw new LedgerCorruptError(current.error.line, current.error.reason);
      const last = current.value.at(-1);
      const event: LedgerEvent = {
        seq: (last?.seq ?? 0) + 1,
        ts: now(),
        actor: input.actor,
        kind: input.kind,
        ...(input.hit !== undefined ? { hit: input.hit } : {}),
        ...(input.node !== undefined ? { node: input.node } : {}),
        parent: input.parent === undefined ? (last?.seq ?? null) : input.parent,
        payload: input.payload ?? {},
      };
      await appendFile(file, serializeEvent(event), "utf8");
      return event;
    },
  };
}
