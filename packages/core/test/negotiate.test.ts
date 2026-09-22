import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { applySitdown, sitdownOptions } from "../src/resolver/negotiate.js";
import { resolveStack } from "../src/resolver/resolve.js";
import { DEFAULT_STACK_OPTIONS, type Selection } from "../src/types/stack.js";
import type { Tech, TechId } from "../src/types/tech.js";

describe("sitdownOptions", () => {
  test("offers dropping either conflicting tech", () => {
    expect(sitdownOptions("drizzle", "vercel-ai-sdk")).toEqual([
      { kind: "drop", id: "drizzle" },
      { kind: "drop", id: "vercel-ai-sdk" },
    ]);
  });
});

describe("applySitdown", () => {
  const base: Selection = {
    name: "myapp",
    crew: ["nextjs", "drizzle", "vercel-ai-sdk"],
    options: DEFAULT_STACK_OPTIONS,
  };

  test("a 'drop' option removes exactly that tech from the crew", () => {
    const next = applySitdown(base, { kind: "drop", id: "drizzle" });
    expect(next.crew).toEqual(["nextjs", "vercel-ai-sdk"]);
  });

  test("a 'swap' option replaces one tech with another", () => {
    const next = applySitdown(base, { kind: "swap", from: "drizzle", to: "shadcn" });
    expect(next.crew).toEqual(["nextjs", "shadcn", "vercel-ai-sdk"]);
  });

  test("applying a drop option to a conflicting selection makes it resolvable", () => {
    const withConflict: Record<TechId, Tech> = {
      ...CATALOG,
      drizzle: { ...CATALOG.drizzle, conflictsWith: ["vercel-ai-sdk"] },
    };

    const conflicting = resolveStack(base, withConflict);
    expect(conflicting.ok).toBe(false);

    const resolved = applySitdown(base, { kind: "drop", id: "vercel-ai-sdk" });
    const result = resolveStack(resolved, withConflict);
    expect(result.ok).toBe(true);
  });
});
