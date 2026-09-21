import { describe, expect, test } from "vitest";
import { parseBooks } from "../../src/books/parse.js";
import { formatRuling } from "../../src/books/ruling.js";

const md = `# Books

## Session tokens are validated in middleware, never in route handlers
- binds: src/api/**, src/auth/session.py
- because: three handlers skipped expiry checks
- evidence: 4a91c2e, tests/auth/test_expiry.py
- overturn-if: middleware ordering becomes configurable per-route
- date: 2026-03-04

## Old rule
- binds: src/old/**
- because: reasons
- evidence: abc
- overturn-if: never
- date: 2026-01-01
- OVERTURNED BY: Session tokens are validated in middleware, never in route handlers
`;

describe("parseBooks", () => {
  test("parses rulings with all fields", () => {
    const r = parseBooks(md);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(r.value[0]).toEqual({
      title: "Session tokens are validated in middleware, never in route handlers",
      binds: ["src/api/**", "src/auth/session.py"],
      because: "three handlers skipped expiry checks",
      evidence: "4a91c2e, tests/auth/test_expiry.py",
      overturnIf: "middleware ordering becomes configurable per-route",
      date: "2026-03-04",
      overturnedBy: null,
    });
    expect(r.value[1].overturnedBy).toBe(r.value[0].title);
  });

  test("a ruling without overturn-if is an error naming the ruling", () => {
    const r = parseBooks(
      "## No death\n- binds: a/**\n- because: b\n- evidence: c\n- date: 2026-01-01\n",
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.error[0]).toMatchObject({
        title: "No death",
        message: expect.stringMatching(/overturn-if/),
      });
  });

  test("empty or heading-only text is an empty Books", () => {
    expect(parseBooks("")).toEqual({ ok: true, value: [] });
    expect(parseBooks("# Books\n")).toEqual({ ok: true, value: [] });
  });

  test("formatRuling round-trips through parseBooks", () => {
    const r = parseBooks(md);
    if (!r.ok) throw new Error("parse failed");
    const again = parseBooks(r.value.map(formatRuling).join("\n"));
    expect(again).toEqual(r);
  });
});
