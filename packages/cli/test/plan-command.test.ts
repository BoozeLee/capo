import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";

const CLI = path.resolve(import.meta.dirname, "../dist/cli.js");

function runCli(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], { encoding: "utf8" });
    return { stdout, status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", status: e.status ?? 1 };
  }
}

describe("capo plan (spawned against the built CLI)", () => {
  test("--json prints a well-formed ScaffoldPlan for a resolvable crew", () => {
    const { stdout, status } = runCli([
      "plan",
      "--crew",
      "nextjs,shadcn,drizzle",
      "--name",
      "myapp",
      "--json",
    ]);
    expect(status).toBe(0);
    const plan = JSON.parse(stdout);
    expect(plan.schemaVersion).toBe(1);
    expect(plan.project.name).toBe("myapp");
    expect(plan.stack.members).toEqual(["nextjs", "shadcn", "drizzle"]);
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  test("exits 2 on a resolve error (no framework)", () => {
    const { status } = runCli(["plan", "--crew", "shadcn", "--name", "myapp", "--json"]);
    expect(status).toBe(2);
  });

  test("exits 2 on an unknown tech id", () => {
    const { status } = runCli(["plan", "--crew", "not-a-real-tech", "--name", "myapp", "--json"]);
    expect(status).toBe(2);
  });

  test("without --json, prints a human-readable summary instead of raw JSON", () => {
    const { stdout, status } = runCli(["plan", "--crew", "nextjs", "--name", "myapp"]);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    expect(stdout).toContain("myapp");
  });
});
