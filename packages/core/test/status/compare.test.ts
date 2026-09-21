import { describe, expect, test } from "vitest";
import { CATALOG } from "../../src/catalog/catalog.js";
import type { CapoManifest } from "../../src/manifest/schema.js";
import { compareInstalled } from "../../src/status/compare.js";

const MANIFEST: CapoManifest = {
  version: 1,
  name: "myapp",
  createdAt: "2026-09-21T00:00:00.000Z",
  capo: { version: "0.1.0", coreVersion: "0.1.0" },
  stack: {
    framework: "nextjs",
    members: ["nextjs", "drizzle"],
    options: { drizzleDriver: "libsql", shadcnPreset: "nova" },
  },
  owned: {},
};

describe("compareInstalled", () => {
  test("reports a tech installed when all its catalog packages are present", () => {
    const packageJson = {
      dependencies: { next: "16.3.5", "drizzle-orm": "0.45.3", "@libsql/client": "0.18.0" },
    };
    const report = compareInstalled(MANIFEST, packageJson, CATALOG);
    const drizzle = report.find((r) => r.tech === "drizzle");
    expect(drizzle).toEqual({ tech: "drizzle", installed: true, missingPackages: [] });
  });

  test("reports missing packages when some catalog packages are absent", () => {
    const packageJson = { dependencies: { next: "16.3.5", "drizzle-orm": "0.45.3" } };
    const report = compareInstalled(MANIFEST, packageJson, CATALOG);
    const drizzle = report.find((r) => r.tech === "drizzle");
    expect(drizzle).toEqual({
      tech: "drizzle",
      installed: false,
      missingPackages: ["@libsql/client"],
    });
  });

  test("checks devDependencies too, not just dependencies", () => {
    const packageJson = {
      dependencies: { "drizzle-orm": "0.45.3", "@libsql/client": "0.18.0" },
      devDependencies: { next: "16.3.5" },
    };
    const report = compareInstalled(MANIFEST, packageJson, CATALOG);
    expect(report.find((r) => r.tech === "nextjs")).toEqual({
      tech: "nextjs",
      installed: true,
      missingPackages: [],
    });
  });

  test("reports one entry per manifest member, in manifest order", () => {
    const report = compareInstalled(MANIFEST, {}, CATALOG);
    expect(report.map((r) => r.tech)).toEqual(["nextjs", "drizzle"]);
  });
});
