import { describe, expect, test } from "vitest";
import {
  INITIAL_PROGRESS_STATE,
  type ProgressState,
  reduceProgress,
} from "../../src/progress/reducer.js";
import type { ScaffoldEvent } from "../../src/types/events.js";

describe("reduceProgress", () => {
  const cases: Array<{ name: string; events: ScaffoldEvent[]; expected: Partial<ProgressState> }> =
    [
      {
        name: "plan:start moves to running and resets counters",
        events: [{ type: "plan:start", totalSteps: 3, project: "myapp" }],
        expected: { phase: "running", totalSteps: 3, currentIndex: null, currentLabel: null },
      },
      {
        name: "step:start records the current index and label",
        events: [
          { type: "plan:start", totalSteps: 3, project: "myapp" },
          {
            type: "step:start",
            index: 0,
            step: {
              id: "nextjs-create",
              kind: "run",
              tech: "nextjs",
              label: "Scaffold Next.js app",
            },
          },
        ],
        expected: { phase: "running", currentIndex: 0, currentLabel: "Scaffold Next.js app" },
      },
      {
        name: "step:output accumulates output lines in order",
        events: [
          { type: "plan:start", totalSteps: 1, project: "myapp" },
          { type: "step:output", index: 0, stream: "stdout", chunk: "line one" },
          { type: "step:output", index: 0, stream: "stdout", chunk: "line two" },
        ],
        expected: { output: ["line one", "line two"] },
      },
      {
        name: "step:failed moves to failed and records the error",
        events: [
          { type: "plan:start", totalSteps: 1, project: "myapp" },
          { type: "step:failed", index: 0, error: { message: "boom", exitCode: 1 } },
        ],
        expected: { phase: "failed", error: { message: "boom", exitCode: 1 } },
      },
      {
        name: "plan:done moves to done and records the project directory",
        events: [
          { type: "plan:start", totalSteps: 1, project: "myapp" },
          { type: "plan:done", projectDir: "/home/user/myapp" },
        ],
        expected: { phase: "done", projectDir: "/home/user/myapp" },
      },
      {
        name: "plan:failed moves to failed even without a prior step:failed",
        events: [
          { type: "plan:start", totalSteps: 1, project: "myapp" },
          { type: "plan:failed", index: 0, error: { message: "resolve error" } },
        ],
        expected: { phase: "failed", error: { message: "resolve error" } },
      },
      {
        name: "a second plan:start resets output and error from a previous failed run",
        events: [
          { type: "plan:start", totalSteps: 1, project: "myapp" },
          { type: "step:output", index: 0, stream: "stdout", chunk: "leftover" },
          { type: "step:failed", index: 0, error: { message: "boom" } },
          { type: "plan:start", totalSteps: 2, project: "myapp" },
        ],
        expected: { phase: "running", totalSteps: 2, output: [], error: null },
      },
    ];

  for (const { name, events, expected } of cases) {
    test(name, () => {
      const finalState = events.reduce(reduceProgress, INITIAL_PROGRESS_STATE);
      expect(finalState).toMatchObject(expected);
    });
  }
});
