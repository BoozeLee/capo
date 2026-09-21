export interface Ruling {
  readonly title: string;
  readonly binds: readonly string[];
  readonly because: string;
  readonly evidence: string;
  readonly overturnIf: string;
  readonly date: string;
  readonly overturnedBy: string | null;
}

export const OVERTURNED_KEY = "OVERTURNED BY";

export function formatRuling(r: Ruling): string {
  const lines = [
    `## ${r.title}`,
    `- binds: ${r.binds.join(", ")}`,
    `- because: ${r.because}`,
    `- evidence: ${r.evidence}`,
    `- overturn-if: ${r.overturnIf}`,
    `- date: ${r.date}`,
  ];
  if (r.overturnedBy !== null) lines.push(`- ${OVERTURNED_KEY}: ${r.overturnedBy}`);
  return `${lines.join("\n")}\n`;
}
