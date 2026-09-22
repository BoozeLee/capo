import { describe, expect, test } from "vitest";
import {
  compareStateBearingToLedger,
  compareToLedger,
  parseSessionTurns,
  summarizeSession,
  summarizeStateBearing,
  tokensFromChars,
} from "../../src/replay/claude-session.js";

const line = (o: unknown) => `${JSON.stringify(o)}\n`;
const assistant = (id: string, usage: Record<string, number>, ts: string) =>
  line({
    type: "assistant",
    timestamp: ts,
    message: { id, role: "assistant", usage, content: [] },
  });
const toolUser = (text: string) =>
  line({
    type: "user",
    timestamp: "2026-09-21T10:00:00Z",
    message: {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: text }],
    },
  });

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
  line({
    type: "user",
    timestamp: "2026-09-21T10:00:00Z",
    message: { role: "user", content: "hi" },
  }),
  assistant("m1", usage1, "2026-09-21T10:00:01Z"),
  assistant("m1", usage1, "2026-09-21T10:00:02Z"),
  assistant("m2", usage2, "2026-09-21T10:00:05Z"),
  "not json\n",
].join("");

describe("claude session replay", () => {
  test("one turn per unique assistant message id; context = input + cache read + cache creation", () => {
    expect(parseSessionTurns(jsonl)).toEqual([
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

  test("compareToLedger scales rendered tokens by turns (legacy full-context denominator)", () => {
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

describe("state-bearing denominator", () => {
  test("summarizeStateBearing counts tool_result characters, not assistant usage", () => {
    const body = `file contents: ${"abcd".repeat(50)}`;
    const session = [toolUser(body), assistant("m1", usage1, "2026-09-21T10:00:01Z")].join("");
    const sb = summarizeStateBearing(session);
    expect(sb.toolResultCount).toBe(1);
    expect(sb.toolResultChars).toBe(body.length);
    expect(sb.toolResultTokens).toBe(tokensFromChars(body.length));
    expect(summarizeSession(parseSessionTurns(session)).totalContextTokens).toBeGreaterThan(
      sb.toolResultTokens,
    );
  });

  test("ignores plain user text and system records", () => {
    const session = [
      line({ type: "system", content: `huge system prompt ${"x".repeat(1000)}` }),
      line({
        type: "user",
        message: { role: "user", content: `please refactor ${"y".repeat(1000)}` },
      }),
      assistant("m1", usage1, "2026-09-21T10:00:01Z"),
    ].join("");
    expect(summarizeStateBearing(session)).toEqual({
      toolResultChars: 0,
      toolResultTokens: 0,
      toolResultCount: 0,
    });
  });

  test("empty-node render stays near floor; edited-node fixture is clearly above it", () => {
    const bigUsage = {
      input_tokens: 2000,
      cache_read_input_tokens: 180_000,
      cache_creation_input_tokens: 20_000,
      output_tokens: 80,
    };
    const fileA = `export const a = 1;\n${"a".repeat(4000)}`;
    const fileB = `export const b = 2;\n${"b".repeat(4000)}`;
    const session = [
      toolUser(fileA),
      assistant("m1", bigUsage, "2026-09-21T10:00:01Z"),
      toolUser(fileB),
      assistant("m2", bigUsage, "2026-09-21T10:00:05Z"),
    ].join("");
    const summary = summarizeSession(parseSessionTurns(session));
    const stateBearing = summarizeStateBearing(session);
    expect(stateBearing.toolResultTokens).toBeGreaterThan(1000);
    expect(summary.totalContextTokens).toBeGreaterThan(300_000);

    const empty = compareStateBearingToLedger(summary, stateBearing, 168);
    const editedRender = tokensFromChars(fileA.length + fileB.length + 80);
    const edited = compareStateBearingToLedger(summary, stateBearing, editedRender);

    expect(empty.denominator).toBe("state-bearing-tool-results");
    expect(empty.stateBearingTokens).toBe(edited.stateBearingTokens);
    expect(empty.ratio).toBeLessThan(0.25);
    expect(edited.ratio).toBeGreaterThan(empty.ratio * 3);
    expect(edited.ratio).toBeGreaterThan(0.8);

    const legacyEmpty = compareToLedger(summary, 168);
    const legacyEdited = compareToLedger(summary, editedRender);
    expect(legacyEmpty.ratio).toBeLessThan(0.01);
    expect(legacyEdited.ratio).toBeLessThan(0.05);
    expect(edited.ratio).toBeGreaterThan(legacyEdited.ratio * 10);
  });

  test("zero state-bearing tokens yields ratio 0 (no false infinity)", () => {
    const summary = summarizeSession(parseSessionTurns(jsonl));
    const sb = summarizeStateBearing(jsonl);
    expect(sb.toolResultTokens).toBe(0);
    expect(compareStateBearingToLedger(summary, sb, 500)).toEqual({
      stateBearingTokens: 0,
      ledgerTokens: 1000,
      ratio: 0,
      denominator: "state-bearing-tool-results",
    });
  });
});
