import type { ScaffoldEvent } from "@capo/core";
import { describe, expect, test } from "vitest";
import { decodeEvent, encodeEvent } from "../src/ndjson.js";

describe("ndjson encode/decode", () => {
  test("encodeEvent produces a single JSON line terminated by \\n", () => {
    const event: ScaffoldEvent = { type: "plan:start", totalSteps: 3, project: "myapp" };
    const line = encodeEvent(event);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.split("\n")).toHaveLength(2); // the line itself + the trailing empty string
  });

  test("decodeEvent reverses encodeEvent exactly", () => {
    const event: ScaffoldEvent = {
      type: "step:failed",
      index: 2,
      error: { message: "boom", exitCode: 1 },
    };
    expect(decodeEvent(encodeEvent(event).trimEnd())).toEqual(event);
  });

  test("decodeEvent throws on malformed JSON rather than returning something silently wrong", () => {
    expect(() => decodeEvent("not json")).toThrow();
  });
});
