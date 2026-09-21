import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { OVERTURNED_KEY, type Ruling } from "./ruling.js";

export interface BooksParseError {
  readonly title: string;
  readonly message: string;
}

const FIELD = /^- ([A-Za-z -]+?):\s*(.*)$/;

function finish(title: string, fields: Map<string, string>): Result<Ruling, BooksParseError> {
  const need = ["binds", "because", "evidence", "overturn-if", "date"] as const;
  for (const k of need) {
    if (!fields.has(k)) return err({ title, message: `missing ${k}` });
  }
  return ok({
    title,
    binds: (fields.get("binds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    because: fields.get("because") ?? "",
    evidence: fields.get("evidence") ?? "",
    overturnIf: fields.get("overturn-if") ?? "",
    date: fields.get("date") ?? "",
    overturnedBy: fields.get(OVERTURNED_KEY) ?? null,
  });
}

/** `## title` opens a ruling; `- key: value` lines fill it. Anything else is ignored. */
export function parseBooks(md: string): Result<Ruling[], BooksParseError[]> {
  const rulings: Ruling[] = [];
  const errors: BooksParseError[] = [];
  let title: string | null = null;
  let fields = new Map<string, string>();
  const close = () => {
    if (title === null) return;
    const r = finish(title, fields);
    if (r.ok) rulings.push(r.value);
    else errors.push(r.error);
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      close();
      title = line.slice(3).trim();
      fields = new Map();
      continue;
    }
    const m = title !== null ? FIELD.exec(line) : null;
    if (m) fields.set(m[1].trim(), m[2].trim());
  }
  close();
  return errors.length > 0 ? err(errors) : ok(rulings);
}
