import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { OVERTURNED_KEY, type Ruling, formatRuling } from "./ruling.js";

const HEADING = "# Books\n";

export function appendRuling(md: string, ruling: Ruling): string {
  const body = md === "" ? HEADING : md.endsWith("\n") ? md : `${md}\n`;
  return `${body}\n${formatRuling(ruling)}`;
}

/** Inserts `- OVERTURNED BY: <new>` after the old ruling's `- date:` line. The ruling stays. */
export function markOverturned(
  md: string,
  oldTitle: string,
  newTitle: string,
): Result<string, string> {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `## ${oldTitle}`);
  if (start === -1) return err(`no ruling titled ${oldTitle}`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end === -1) end = lines.length;
  const dateAt = lines.findIndex((l, i) => i > start && i < end && l.startsWith("- date:"));
  const insertAt = dateAt === -1 ? end : dateAt + 1;
  lines.splice(insertAt, 0, `- ${OVERTURNED_KEY}: ${newTitle}`);
  return ok(lines.join("\n"));
}
