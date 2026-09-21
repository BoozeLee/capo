import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { resolveStack } from "../src/resolver/resolve.js";
import { DEFAULT_STACK_OPTIONS, type Selection } from "../src/types/stack.js";
import type { Tech, TechId } from "../src/types/tech.js";

function selection(overrides: Partial<Selection> = {}): Selection {
  return {
    name: "myapp",
    crew: [],
    options: DEFAULT_STACK_OPTIONS,
    ...overrides,
  };
}

describe("resolveStack against the real catalog", () => {
  test("rejects an unknown tech id", () => {
    const result = resolveStack(
      selection({ crew: ["nextjs", "not-a-real-tech" as TechId] }),
      CATALOG,
    );
    expect(result).toEqual({ ok: false, error: { code: "UNKNOWN_TECH", id: "not-a-real-tech" } });
  });

  test("rejects a crew with no framework", () => {
    const result = resolveStack(selection({ crew: ["shadcn"] }), CATALOG);
    expect(result).toEqual({ ok: false, error: { code: "NO_FRAMEWORK" } });
  });

  test("rejects an invalid project name", () => {
    const result = resolveStack(selection({ name: "My App", crew: ["nextjs"] }), CATALOG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_NAME");
    }
  });

  test("resolves nextjs alone", () => {
    const result = resolveStack(selection({ crew: ["nextjs"] }), CATALOG);
    expect(result).toEqual({
      ok: true,
      value: {
        framework: "nextjs",
        members: ["nextjs"],
        autoIncluded: [],
        options: DEFAULT_STACK_OPTIONS,
      },
    });
  });

  test("nextjs + shadcn does not add a redundant tailwindcss member (nextjs already provides it)", () => {
    const result = resolveStack(selection({ crew: ["nextjs", "shadcn"] }), CATALOG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.members).toEqual(["nextjs", "shadcn"]);
      expect(result.value.autoIncluded).toEqual([]);
    }
  });
});

describe("resolveStack: two frameworks", () => {
  const twoFrameworks: Record<TechId, Tech> = {
    ...CATALOG,
    drizzle: { ...CATALOG.drizzle, category: "framework" },
  };

  test("rejects a crew with more than one framework", () => {
    const result = resolveStack(selection({ crew: ["nextjs", "drizzle"] }), twoFrameworks);
    expect(result).toEqual({
      ok: false,
      error: { code: "MULTIPLE_FRAMEWORKS", ids: ["nextjs", "drizzle"] },
    });
  });
});

describe("resolveStack: auto-inclusion of an unprovided requirement", () => {
  // Fixture: shadcn still requires tailwindcss, but here nextjs does NOT provide
  // it, so it must become a real, separately-executed member of the stack.
  const noProvider: Record<TechId, Tech> = {
    ...CATALOG,
    nextjs: { ...CATALOG.nextjs, provides: [] },
  };

  test("auto-includes a required tech that nothing provides", () => {
    const result = resolveStack(selection({ crew: ["nextjs", "shadcn"] }), noProvider);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.members).toEqual(["nextjs", "shadcn", "tailwindcss"]);
      expect(result.value.autoIncluded).toEqual(["tailwindcss"]);
    }
  });
});

describe("resolveStack: conflicts", () => {
  const withConflict: Record<TechId, Tech> = {
    ...CATALOG,
    drizzle: { ...CATALOG.drizzle, conflictsWith: ["vercel-ai-sdk"] },
  };

  test("reports a conflict with drop options for both sides", () => {
    const result = resolveStack(
      selection({ crew: ["nextjs", "drizzle", "vercel-ai-sdk"] }),
      withConflict,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "CONFLICT",
        a: "drizzle",
        b: "vercel-ai-sdk",
        options: [
          { kind: "drop", id: "drizzle" },
          { kind: "drop", id: "vercel-ai-sdk" },
        ],
      },
    });
  });
});
