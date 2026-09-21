import type { ScaffoldPlan, Step } from "@capo/core";
import { describe, expect, test } from "vitest";
import type { ExecutorPorts, ProcOutputChunk, SpawnResult } from "../../src/executor.js";
import { createNodeExecutor } from "../../src/executors/node.js";

interface RecordedSpawn {
  readonly cmd: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

function createFakePorts(
  opts: {
    exitCodes?: readonly number[];
    outputs?: readonly ProcOutputChunk[][];
    existingFiles?: Record<string, string>;
  } = {},
) {
  const files = new Map<string, string>(Object.entries(opts.existingFiles ?? {}));
  const spawns: RecordedSpawn[] = [];
  let spawnCallIndex = 0;

  const ports: ExecutorPorts = {
    fs: {
      writeFile: async (path, contents) => {
        files.set(path, contents);
      },
      readFile: async (path) => {
        const contents = files.get(path);
        if (contents === undefined) throw new Error(`ENOENT: ${path}`);
        return contents;
      },
      appendFile: async (path, contents) => {
        files.set(path, (files.get(path) ?? "") + contents);
      },
      exists: async (path) => files.has(path),
      mkdir: async () => {},
      deleteFile: async (path) => {
        if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
        files.delete(path);
      },
    },
    proc: {
      spawn: (cmd, args, spawnOpts): SpawnResult => {
        spawns.push({ cmd, args, cwd: spawnOpts.cwd });
        const index = spawnCallIndex++;
        const exitCode = opts.exitCodes?.[index] ?? 0;
        const output = opts.outputs?.[index] ?? [];
        return {
          output: (async function* () {
            for (const chunk of output) yield chunk;
          })(),
          exit: Promise.resolve(exitCode),
        };
      },
    },
  };

  return { ports, files, spawns };
}

function runStep(overrides: Partial<Step> & { kind: Step["kind"] }): Step {
  return {
    id: "test-step",
    tech: "capo",
    label: "test step",
    ...overrides,
  } as Step;
}

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

describe("createNodeExecutor: run steps", () => {
  test("spawns the command with cwd resolved to the parent dir for cwd:'parent'", async () => {
    const { ports, spawns } = createFakePorts();
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([
          runStep({
            kind: "run",
            cmd: "pnpm",
            args: ["dlx", "create-next-app"],
            cwd: "parent",
            timeoutMs: 1000,
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(spawns).toEqual([{ cmd: "pnpm", args: ["dlx", "create-next-app"], cwd: "/tmp/parent" }]);
  });

  test("spawns the command with cwd resolved to the project dir for cwd:'project'", async () => {
    const { ports, spawns } = createFakePorts();
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([
          runStep({
            kind: "run",
            cmd: "pnpm",
            args: ["add", "x"],
            cwd: "project",
            timeoutMs: 1000,
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(spawns).toEqual([{ cmd: "pnpm", args: ["add", "x"], cwd: "/tmp/parent/myapp" }]);
  });

  test("emits plan:start, step:start, step:done, plan:done in order for a successful single step", async () => {
    const { ports } = createFakePorts();
    const executor = createNodeExecutor(ports);
    const events = await collect(
      executor.execute(
        plan([
          runStep({
            kind: "run",
            cmd: "pnpm",
            args: ["add", "x"],
            cwd: "project",
            timeoutMs: 1000,
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(events.map((e) => e.type)).toEqual([
      "plan:start",
      "step:start",
      "step:done",
      "plan:done",
    ]);
  });

  test("stops at the first failed step and never runs later steps", async () => {
    const { ports, spawns } = createFakePorts({ exitCodes: [1] });
    const executor = createNodeExecutor(ports);
    const events = await collect(
      executor.execute(
        plan([
          runStep({ kind: "run", cmd: "pnpm", args: ["fail"], cwd: "project", timeoutMs: 1000 }),
          runStep({
            kind: "run",
            cmd: "pnpm",
            args: ["never-runs"],
            cwd: "project",
            timeoutMs: 1000,
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(events.map((e) => e.type)).toEqual([
      "plan:start",
      "step:start",
      "step:failed",
      "plan:failed",
    ]);
    expect(spawns).toHaveLength(1);
  });
});

describe("createNodeExecutor: file steps", () => {
  test("writeFile writes relative to the project directory", async () => {
    const { ports, files } = createFakePorts();
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([
          runStep({
            kind: "writeFile",
            path: "capo.yaml",
            contents: "version: 1",
            ifExists: "overwrite",
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(files.get("/tmp/parent/myapp/capo.yaml")).toBe("version: 1");
  });

  test("writeFile with ifExists 'fail' fails the plan if the file already exists", async () => {
    const { ports } = createFakePorts({
      existingFiles: { "/tmp/parent/myapp/drizzle.config.ts": "old" },
    });
    const executor = createNodeExecutor(ports);
    const events = await collect(
      executor.execute(
        plan([
          runStep({
            kind: "writeFile",
            path: "drizzle.config.ts",
            contents: "new",
            ifExists: "fail",
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(events.map((e) => e.type)).toEqual([
      "plan:start",
      "step:start",
      "step:failed",
      "plan:failed",
    ]);
  });

  test("writeFile with ifExists 'skip' leaves an existing file untouched", async () => {
    const { ports, files } = createFakePorts({
      existingFiles: { "/tmp/parent/myapp/f.txt": "old" },
    });
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([runStep({ kind: "writeFile", path: "f.txt", contents: "new", ifExists: "skip" })]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(files.get("/tmp/parent/myapp/f.txt")).toBe("old");
  });

  test("appendFile appends to an existing file", async () => {
    const { ports, files } = createFakePorts({
      existingFiles: { "/tmp/parent/myapp/.gitignore": "dist/\n" },
    });
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([
          runStep({
            kind: "appendFile",
            path: ".gitignore",
            contents: "*.db\n",
            createIfMissing: true,
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(files.get("/tmp/parent/myapp/.gitignore")).toBe("dist/\n*.db\n");
  });

  test("deleteFile removes an existing file", async () => {
    const { ports, files } = createFakePorts({
      existingFiles: { "/tmp/parent/myapp/gone.ts": "x" },
    });
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(plan([runStep({ kind: "deleteFile", path: "gone.ts" })]), {
        parentDir: "/tmp/parent",
      }),
    );
    expect(files.has("/tmp/parent/myapp/gone.ts")).toBe(false);
  });

  test("patchJson deep-merges into an existing JSON file", async () => {
    const { ports, files } = createFakePorts({
      existingFiles: { "/tmp/parent/myapp/package.json": '{"scripts":{"build":"tsc"}}' },
    });
    const executor = createNodeExecutor(ports);
    await collect(
      executor.execute(
        plan([
          runStep({
            kind: "patchJson",
            path: "package.json",
            merge: { scripts: { test: "vitest" } },
          }),
        ]),
        { parentDir: "/tmp/parent" },
      ),
    );
    expect(JSON.parse(files.get("/tmp/parent/myapp/package.json") ?? "")).toEqual({
      scripts: { build: "tsc", test: "vitest" },
    });
  });
});
