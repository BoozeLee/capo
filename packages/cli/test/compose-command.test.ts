import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const CLI = path.resolve(import.meta.dirname, "../dist/cli.js");

function runCli(args: string[], cwd: string): { stdout: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], { encoding: "utf8", cwd });
    return { stdout, status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", status: e.status ?? 1 };
  }
}

function parseNdjson(stdout: string): Array<{ type: string }> {
  return stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

describe("capo compose (spawned against the built CLI, --dry-run)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "capo-cli-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  test("--json streams NDJSON events ending in plan:done, exit 0", () => {
    const { stdout, status } = runCli(
      ["compose", "--crew", "nextjs", "--name", "foo", "--dry-run", "--json"],
      cwd,
    );
    expect(status).toBe(0);
    const events = parseNdjson(stdout);
    expect(events[0]?.type).toBe("plan:start");
    expect(events.at(-1)?.type).toBe("plan:done");
  });

  test("a resolve error (no framework) exits 2 without ever invoking the executor", () => {
    const { stdout, status } = runCli(
      ["compose", "--crew", "shadcn", "--name", "foo", "--json"],
      cwd,
    );
    expect(status).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NO_FRAMEWORK");
  });

  test("--from-plan with a tampered plan file exits 2 with a validation error", () => {
    const planPath = path.join(cwd, "plan.json");
    writeFileSync(planPath, JSON.stringify({ schemaVersion: 2, notAPlan: true }));
    const { status } = runCli(["compose", "--from-plan", planPath, "--dry-run", "--json"], cwd);
    expect(status).toBe(2);
  });

  test("without --json, prints themed text rather than raw NDJSON", () => {
    const { stdout, status } = runCli(
      ["compose", "--crew", "nextjs", "--name", "foo", "--dry-run"],
      cwd,
    );
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout.split("\n")[0] ?? "")).toThrow();
  });

  test("refuses when the target directory already exists, without --gotommyguns", () => {
    mkdirSync(path.join(cwd, "foo"));
    const { status } = runCli(
      ["compose", "--crew", "nextjs", "--name", "foo", "--dry-run", "--json"],
      cwd,
    );
    expect(status).toBe(1);
  });

  test("--gotommyguns proceeds even if the target directory already exists", () => {
    mkdirSync(path.join(cwd, "foo"));
    const { stdout, status } = runCli(
      ["compose", "--crew", "nextjs", "--name", "foo", "--dry-run", "--json", "--gotommyguns"],
      cwd,
    );
    expect(status).toBe(0);
    expect(parseNdjson(stdout).at(-1)?.type).toBe("plan:done");
  });
});
