import { describe, expect, test } from "vitest";
import { CATALOG } from "../src/catalog/catalog.js";
import { validateCatalog } from "../src/catalog/validate.js";

describe("CATALOG", () => {
  test("is internally consistent (no unknown/self-referencing ids)", () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
  });

  test("has exactly one framework: nextjs", () => {
    const frameworks = Object.values(CATALOG).filter((t) => t.category === "framework");
    expect(frameworks.map((t) => t.id)).toEqual(["nextjs"]);
  });

  test("nextjs provides tailwindcss", () => {
    expect(CATALOG.nextjs.provides).toContain("tailwindcss");
  });

  test("shadcn requires tailwindcss", () => {
    expect(CATALOG.shadcn.requires).toContain("tailwindcss");
  });

  test("every tech id in the TechId union has a matching catalog entry", () => {
    const expectedIds = [
      "nextjs",
      "tailwindcss",
      "shadcn",
      "drizzle",
      "vercel-ai-sdk",
      "memory-mcp-server",
    ];
    expect(Object.keys(CATALOG).sort()).toEqual(expectedIds.sort());
  });
});
