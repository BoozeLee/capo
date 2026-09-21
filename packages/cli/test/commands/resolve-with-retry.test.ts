import { CATALOG } from "@capo/core";
import type { Tech, TechId } from "@capo/core";
import { DEFAULT_STACK_OPTIONS } from "@capo/core";
import { describe, expect, test } from "vitest";
import { resolveWithRetry } from "../../src/commands/resolve-with-retry.js";

const withConflict: Record<TechId, Tech> = {
  ...CATALOG,
  drizzle: { ...CATALOG.drizzle, conflictsWith: ["vercel-ai-sdk"] },
};

describe("resolveWithRetry", () => {
  test("without gotommyguns, a conflict is returned as-is (fatal)", () => {
    const result = resolveWithRetry(
      {
        name: "myapp",
        crew: ["nextjs", "drizzle", "vercel-ai-sdk"],
        options: DEFAULT_STACK_OPTIONS,
      },
      withConflict,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFLICT");
  });

  test("with gotommyguns, a conflict is auto-resolved by dropping one side", () => {
    const result = resolveWithRetry(
      {
        name: "myapp",
        crew: ["nextjs", "drizzle", "vercel-ai-sdk"],
        options: DEFAULT_STACK_OPTIONS,
      },
      withConflict,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // drizzle appears first in crew order, so on conflict the LATER entry
      // (vercel-ai-sdk) is the one auto-dropped.
      expect(result.value.members).toEqual(["nextjs", "drizzle"]);
    }
  });

  test("with gotommyguns, a non-conflict resolve error still surfaces (nothing to auto-resolve)", () => {
    const result = resolveWithRetry(
      { name: "myapp", crew: ["shadcn"], options: DEFAULT_STACK_OPTIONS },
      withConflict,
      true,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NO_FRAMEWORK");
  });

  test("with gotommyguns, an already-resolvable crew resolves normally (no-op retry)", () => {
    const result = resolveWithRetry(
      { name: "myapp", crew: ["nextjs"], options: DEFAULT_STACK_OPTIONS },
      withConflict,
      true,
    );
    expect(result.ok).toBe(true);
  });
});
