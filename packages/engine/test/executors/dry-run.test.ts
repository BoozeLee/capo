import type { ScaffoldPlan, Step } from "@capo/core";
import { describe, expect, test } from "vitest";
import { createDryRunExecutor } from "../../src/executors/dry-run.js";

function plan(steps: Step[]): ScaffoldPlan {
  return {
    schemaVersion: 1,
    coreVersion: "0.1.0",
    project: { name: "myapp" },
    stack: {
      framework: "nextjs",
      members: ["nextjs"],
      autoIncluded: [],
      options: { drizzleDriver: "libsql", shadcnPreset: "nova" },
    },
    steps,
  };
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

describe("createDryRunExecutor: execute()", () => {
  test("emits plan:start, one step:start+step:done pair per step, and plan:done — no real work", async () => {
    const executor = createDryRunExecutor();
    const events = await collect(
      executor.execute(
        plan([
          {
            id: "a",
            tech: "nextjs",
            label: "step a",
            kind: "run",
            cmd: "pnpm",
            args: ["dlx", "x"],
            cwd: "parent",
            timeoutMs: 1000,
          },
          { id: "b", tech: "capo", label: "step b", kind: "mkdir", path: "src" },
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(events.map((e) => e.type)).toEqual([
      "plan:start",
      "step:start",
      "step:done",
      "step:start",
      "step:done",
      "plan:done",
    ]);
  });
});

describe("createDryRunExecutor: toShellScript()", () => {
  const executor = createDryRunExecutor();

  test("represents a 'run' step as a cd + command invocation", () => {
    const script = executor.toShellScript(
      plan([
        {
          id: "a",
          tech: "nextjs",
          label: "Scaffold",
          kind: "run",
          cmd: "pnpm",
          args: ["dlx", "create-next-app@16", "myapp"],
          cwd: "parent",
          timeoutMs: 1000,
        },
      ]),
    );
    expect(script).toContain('cd "$PARENT_DIR"');
    expect(script).toContain("pnpm dlx create-next-app@16 myapp");
  });

  test("represents a writeFile step as a heredoc into the project dir", () => {
    const script = executor.toShellScript(
      plan([
        {
          id: "w",
          tech: "capo",
          label: "Write capo.yaml",
          kind: "writeFile",
          path: "capo.yaml",
          contents: "version: 1\n",
          ifExists: "overwrite",
        },
      ]),
    );
    expect(script).toContain('cat > "$PROJECT_DIR/capo.yaml"');
    expect(script).toContain("version: 1");
  });

  test("represents a patchJson step as an explanatory comment, not fake shell", () => {
    const script = executor.toShellScript(
      plan([
        {
          id: "p",
          tech: "drizzle",
          label: "Add scripts",
          kind: "patchJson",
          path: "package.json",
          merge: { scripts: { test: "vitest" } },
        },
      ]),
    );
    expect(script).toContain("# capo: patchJson package.json");
    expect(script).not.toContain("cat >");
  });

  test("starts with a shebang and set -eu", () => {
    const script = executor.toShellScript(plan([]));
    expect(script.startsWith("#!/bin/sh\nset -eu\n")).toBe(true);
  });
});
