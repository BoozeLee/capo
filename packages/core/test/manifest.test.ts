import { describe, expect, test } from "vitest";
import type { CapoManifest } from "../src/manifest/schema.js";
import { fromYaml, toYaml } from "../src/manifest/serialize.js";

const SAMPLE: CapoManifest = {
  version: 1,
  name: "myapp",
  createdAt: "2026-09-21T00:00:00.000Z",
  capo: { version: "0.1.0", coreVersion: "0.1.0" },
  stack: {
    framework: "nextjs",
    members: ["nextjs", "shadcn", "drizzle"],
    options: { drizzleDriver: "libsql", shadcnPreset: "nova" },
  },
  owned: {
    drizzle: ["drizzle.config.ts", "src/db/schema.ts", "src/db/index.ts"],
  },
};

describe("manifest serialize/parse roundtrip", () => {
  test("toYaml then fromYaml reproduces the original manifest exactly", () => {
    const yaml = toYaml(SAMPLE);
    const parsed = fromYaml(yaml);
    expect(parsed).toEqual(SAMPLE);
  });

  test("toYaml produces human-readable YAML, not JSON", () => {
    const yaml = toYaml(SAMPLE);
    expect(yaml).toContain("name: myapp");
    expect(yaml).not.toMatch(/^\{/);
  });

  test("fromYaml rejects a manifest missing a required field", () => {
    const brokenYaml = toYaml(SAMPLE).replace("version: 1\n", "");
    expect(() => fromYaml(brokenYaml)).toThrow();
  });

  test("fromYaml rejects an unknown top-level field", () => {
    const withExtra = `${toYaml(SAMPLE)}notARealField: true\n`;
    expect(() => fromYaml(withExtra)).toThrow();
  });
});
