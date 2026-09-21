import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ScaffoldPlan, Step } from "@capo/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createNodeExecutor } from "../../src/executors/node.js";
import { nodePorts } from "../../src/node-ports.js";

function plan(steps: Step[]): ScaffoldPlan {
  return {
    schemaVersion: 1,
    coreVersion: "0.1.0",
    project: { name: "realapp" },
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

describe("createNodeExecutor with real nodePorts (real filesystem + real subprocess)", () => {
  let parentDir: string;

  beforeEach(async () => {
    parentDir = await mkdtemp(path.join(tmpdir(), "capo-engine-test-"));
  });

  afterEach(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  test("a real 'run' step actually spawns a process and streams its output", async () => {
    const executor = createNodeExecutor(nodePorts);
    const events = await collect(
      executor.execute(
        plan([
          {
            id: "mkdir-project",
            tech: "capo",
            label: "make project dir",
            kind: "run",
            cmd: "mkdir",
            args: ["-p", "realapp"],
            cwd: "parent",
            timeoutMs: 5000,
          },
          {
            id: "node-echo",
            tech: "capo",
            label: "run node",
            kind: "run",
            cmd: "node",
            args: ["-e", "console.log('hello from real subprocess')"],
            cwd: "project",
            timeoutMs: 5000,
          },
        ]),
        { parentDir },
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

  test("a real writeFile step actually creates the file on disk", async () => {
    const executor = createNodeExecutor(nodePorts);
    await collect(
      executor.execute(
        plan([
          {
            id: "mkdir-project",
            tech: "capo",
            label: "make project dir",
            kind: "run",
            cmd: "mkdir",
            args: ["-p", "realapp"],
            cwd: "parent",
            timeoutMs: 5000,
          },
          {
            id: "write",
            tech: "capo",
            label: "write file",
            kind: "writeFile",
            path: "capo.yaml",
            contents: "version: 1\n",
            ifExists: "overwrite",
          },
        ]),
        { parentDir },
      ),
    );

    const contents = await readFile(path.join(parentDir, "realapp", "capo.yaml"), "utf8");
    expect(contents).toBe("version: 1\n");
  });

  test("a real non-zero exit actually stops the plan", async () => {
    const executor = createNodeExecutor(nodePorts);
    const events = await collect(
      executor.execute(
        plan([
          {
            id: "mkdir-project",
            tech: "capo",
            label: "make project dir",
            kind: "run",
            cmd: "mkdir",
            args: ["-p", "realapp"],
            cwd: "parent",
            timeoutMs: 5000,
          },
          {
            id: "fail",
            tech: "capo",
            label: "fail on purpose",
            kind: "run",
            cmd: "node",
            args: ["-e", "process.exit(7)"],
            cwd: "project",
            timeoutMs: 5000,
          },
          {
            id: "never",
            tech: "capo",
            label: "never runs",
            kind: "writeFile",
            path: "unreached.txt",
            contents: "x",
            ifExists: "overwrite",
          },
        ]),
        { parentDir },
      ),
    );

    const failed = events.find((e) => e.type === "step:failed");
    expect(failed?.type === "step:failed" && failed.error.exitCode).toBe(7);
    expect(events.at(-1)?.type).toBe("plan:failed");
  });
});
