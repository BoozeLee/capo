import { describe, expect, test } from "vitest";
import { validateCatalog } from "../src/catalog/validate.js";
import type { Tech, TechId } from "../src/types/tech.js";

function tech(overrides: Partial<Tech> & { id: TechId }): Tech {
  return {
    category: "framework",
    name: overrides.id,
    role: "role",
    description: "description",
    requires: [],
    conflictsWith: [],
    provides: [],
    packages: [],
    minNode: ">=20.9.0",
    ...overrides,
  };
}

describe("validateCatalog", () => {
  test("returns no errors for a well-formed catalog", () => {
    const catalog: Record<TechId, Tech> = {
      nextjs: tech({ id: "nextjs" }),
    } as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toEqual([]);
  });

  test("reports a tech whose own id does not match its catalog key", () => {
    const catalog = {
      nextjs: tech({ id: "shadcn" }),
    } as unknown as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toContain(
      'catalog key "nextjs" does not match its entry\'s id "shadcn"',
    );
  });

  test("reports a `requires` entry that references an unknown tech id", () => {
    const catalog: Record<TechId, Tech> = {
      shadcn: tech({ id: "shadcn", requires: ["tailwindcss"] }),
    } as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toContain(
      'shadcn.requires references unknown tech "tailwindcss"',
    );
  });

  test("reports a tech that requires itself", () => {
    const catalog: Record<TechId, Tech> = {
      nextjs: tech({ id: "nextjs", requires: ["nextjs"] }),
    } as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toContain("nextjs.requires references itself");
  });

  test("reports a tech that conflicts with itself", () => {
    const catalog: Record<TechId, Tech> = {
      nextjs: tech({ id: "nextjs", conflictsWith: ["nextjs"] }),
    } as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toContain("nextjs.conflictsWith references itself");
  });

  test("reports a tech that provides itself", () => {
    const catalog: Record<TechId, Tech> = {
      nextjs: tech({ id: "nextjs", provides: ["nextjs"] }),
    } as Record<TechId, Tech>;

    expect(validateCatalog(catalog)).toContain("nextjs.provides references itself");
  });
});
