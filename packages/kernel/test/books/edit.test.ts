import { describe, expect, test } from "vitest";
import { appendRuling, markOverturned } from "../../src/books/edit.js";
import { parseBooks } from "../../src/books/parse.js";
import type { Ruling } from "../../src/books/ruling.js";

const r = (title: string): Ruling => ({
  title,
  binds: ["src/**"],
  because: "b",
  evidence: "e",
  overturnIf: "o",
  date: "2026-09-21",
  overturnedBy: null,
});

describe("books edit", () => {
  test("appendRuling adds a parseable ruling with a blank line before it", () => {
    const md = appendRuling("# Books\n", r("First"));
    const parsed = parseBooks(md);
    expect(parsed.ok && parsed.value.map((x) => x.title)).toEqual(["First"]);
    expect(md).toMatch(/\n\n## First\n/);
  });

  test("appendRuling on empty text creates the heading", () => {
    expect(appendRuling("", r("First"))).toMatch(/^# Books\n/);
  });

  test("markOverturned adds the marker line and keeps the ruling", () => {
    const md = appendRuling(appendRuling("", r("Old")), r("New"));
    const out = markOverturned(md, "Old", "New");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const parsed = parseBooks(out.value);
    expect(parsed.ok && parsed.value.find((x) => x.title === "Old")?.overturnedBy).toBe("New");
  });

  test("markOverturned on an unknown title is an error", () => {
    expect(markOverturned("", "Nope", "New")).toEqual({
      ok: false,
      error: "no ruling titled Nope",
    });
  });
});
