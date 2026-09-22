import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CATALOG, type CapoManifest, toYaml } from "@capo/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildStatus, runStatusCommand } from "../src/commands/status.js";

const manifest: CapoManifest = {
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

function depsFor(...techs: Array<keyof typeof CATALOG>): Record<string, string> {
  return Object.fromEntries(techs.flatMap((t) => CATALOG[t].packages.map((p) => [p, "*"])));
}

describe("buildStatus", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "capo-status-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  test("reports every stack member installed when package.json holds all packages", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: depsFor("nextjs", "drizzle") }),
    );
    const result = buildStatus({ cwd });
    expect(result).toEqual({
      ok: true,
      rows: [
        { tech: "nextjs", installed: true, missingPackages: [] },
        { tech: "drizzle", installed: true, missingPackages: [] },
      ],
    });
  });

  test("lists the missing packages for a member that is not installed", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: depsFor("nextjs") }),
    );
    const result = buildStatus({ cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const drizzle = result.rows.find((r) => r.tech === "drizzle");
    expect(drizzle?.installed).toBe(false);
    expect(drizzle?.missingPackages).toEqual(CATALOG.drizzle.packages);
  });

  test("narrows to one tech when asked", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: depsFor("nextjs") }),
    );
    const result = buildStatus({ cwd, tech: "drizzle" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map((r) => r.tech)).toEqual(["drizzle"]);
  });

  test("errors when the tech is not a stack member", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(path.join(cwd, "package.json"), "{}");
    const result = buildStatus({ cwd, tech: "shadcn" });
    expect(result).toEqual({ ok: false, error: { code: "NOT_IN_STACK", tech: "shadcn" } });
  });

  test("errors when the tech id is unknown", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(path.join(cwd, "package.json"), "{}");
    const result = buildStatus({ cwd, tech: "not-a-real-tech" });
    expect(result).toEqual({ ok: false, error: { code: "UNKNOWN_TECH", id: "not-a-real-tech" } });
  });

  test("errors when capo.yaml is absent", () => {
    writeFileSync(path.join(cwd, "package.json"), "{}");
    const result = buildStatus({ cwd });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NO_MANIFEST");
  });

  test("errors when package.json is absent", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    const result = buildStatus({ cwd });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NO_PACKAGE_JSON");
  });

  test("errors when package.json dependencies is not an object", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ dependencies: "next" }));
    const result = buildStatus({ cwd });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_PACKAGE_JSON");
  });

  test("errors when capo.yaml does not match the manifest schema", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), "version: 2\n");
    writeFileSync(path.join(cwd, "package.json"), "{}");
    const result = buildStatus({ cwd });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_MANIFEST");
  });
});

describe("runStatusCommand", () => {
  let cwd: string;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "capo-status-test-"));
    log.mockClear();
    error.mockClear();
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  test("--json prints the rows and exits 0", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: depsFor("nextjs", "drizzle") }),
    );
    expect(runStatusCommand({ cwd, json: true })).toBe(0);
    const rows = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(rows.map((r: { tech: string }) => r.tech)).toEqual(["nextjs", "drizzle"]);
  });

  test("human output names each member and exits 0", () => {
    writeFileSync(path.join(cwd, "capo.yaml"), toYaml(manifest));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: depsFor("nextjs") }),
    );
    expect(runStatusCommand({ cwd, json: false })).toBe(0);
    const out = log.mock.calls.map((c) => c[0]).join("\n");
    expect(out).toContain("nextjs");
    expect(out).toContain("drizzle");
    expect(() => JSON.parse(out)).toThrow();
  });

  test("exits 2 on error, --json puts the error on stdout", () => {
    expect(runStatusCommand({ cwd, json: true })).toBe(2);
    const payload = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(payload.error.code).toBe("NO_MANIFEST");
  });

  test("exits 2 on error, human mode puts the error on stderr", () => {
    expect(runStatusCommand({ cwd, json: false })).toBe(2);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
