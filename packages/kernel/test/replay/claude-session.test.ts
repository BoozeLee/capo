import { describe, expect, test } from "vitest";
import {
  compareToLedger,
  parseSessionTurns,
  summarizeSession,
} from "../../src/replay/claude-session.js";

const line = (o: unknown) => `${JSON.stringify(o)}\n`;
const assistant = (id: string, usage: Record<string, number>, ts: string) =>
  line({ type: "assistant", timestamp: ts, message: { id, role: "assistant", usage, content: [] } });

const usage1 = {
  input_tokens: 2,
  cache_read_input_tokens: 1000,
  cache_creation_input_tokens: 500,
  output_tokens: 50,
};
const usage2 = {
  input_tokens: 2,
  cache_read_input_tokens: 1500,
  cache_creation_input_tokens: 100,
  output_tokens: 20,
};

const jsonl = [
  line({ type: "user", timestamp: "2026-09-21T10:00:00Z", message: { role: "user", content: "hi" } }),
  assistant("m1", usage1, "2026-09-21T10:00:01Z"),
  assistant("m1", usage1, "2026-09-21T10:00:02Z"),
  assistant("m2", usage2, "2026-09-21T10:00:05Z"),
  "not json\n",
].join("");

describe("claude session replay", () => {
  test("one turn per unique assistant message id; context = input + cache read + cache creation", () => {
    const turns = parseSessionTurns(jsonl);
    expect(turns).toEqual([
      { id: "m1", ts: "2026-09-21T10:00:01Z", contextTokens: 1502, outputTokens: 50 },
      { id: "m2", ts: "2026-09-21T10:00:05Z", contextTokens: 1602, outputTokens: 20 },
    ]);
  });

  test("summary totals", () => {
    expect(summarizeSession(parseSessionTurns(jsonl))).toEqual({
      turns: 2,
      totalContextTokens: 3104,
      meanContextTokens: 1552,
      peakContextTokens: 1602,
    });
  });

  test("compareToLedger scales rendered tokens by turns", () => {
    expect(compareToLedger(summarizeSession(parseSessionTurns(jsonl)), 400)).toEqual({
      transcriptTokens: 3104,
      ledgerTokens: 800,
      ratio: 800 / 3104,
    });
  });

  test("empty session", () => {
    expect(summarizeSession([])).toEqual({
      turns: 0,
      totalContextTokens: 0,
      meanContextTokens: 0,
      peakContextTokens: 0,
    });
  });
});
