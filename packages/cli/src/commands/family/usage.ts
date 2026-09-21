export const FAMILY_COMMANDS = [
  "ledger",
  "board",
  "hit",
  "books",
  "context",
  "rewind",
  "replay",
] as const;

export type FamilyCommand = (typeof FAMILY_COMMANDS)[number];

export const FAMILY_USAGE = `usage:
  capo ledger tail [n] | ledger append --kind <kind> [<hit> [<node>]] [--payload json] [--actor a]
  capo board [<hit>]
  capo hit validate|next <hit> | hit start|done <hit> <node> | hit deviation <hit> <node> --note "..."
  capo books bind <glob>... | books appeal | books override "<ruling>" --note "..."
  capo context <hit> <node> [--budget n]
  capo rewind --to <seq>
  capo replay <session.jsonl> <hit> <node> [--budget n]`;

export function isFamilyCommand(cmd: string): cmd is FamilyCommand {
  return (FAMILY_COMMANDS as readonly string[]).includes(cmd);
}
