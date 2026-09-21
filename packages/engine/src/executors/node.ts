import path from "node:path";
import type { ScaffoldEvent, ScaffoldPlan, Step } from "@capo/core";
import { deepMergeJson } from "../deep-merge-json.js";
import type { ExecuteOptions, Executor, ExecutorPorts } from "../executor.js";
import { StepExecutionError } from "../step-error.js";

function resolveProjectDir(parentDir: string, projectName: string): string {
  return path.join(parentDir, projectName);
}

function resolveStepPath(projectDir: string, relPath: string): string {
  return path.join(projectDir, relPath);
}

async function executeStep(
  step: Step,
  ports: ExecutorPorts,
  parentDir: string,
  projectDir: string,
): Promise<void> {
  switch (step.kind) {
    case "run": {
      const cwd = step.cwd === "parent" ? parentDir : projectDir;
      const result = ports.proc.spawn(step.cmd, step.args, {
        cwd,
        env: step.env,
        timeoutMs: step.timeoutMs,
      });
      for await (const _chunk of result.output) {
        // Output is surfaced by the caller via step:output events in a
        // future iteration; for now we drain the stream so it completes.
      }
      const exitCode = await result.exit;
      if (exitCode !== 0) {
        throw new StepExecutionError(`${step.cmd} exited with code ${exitCode}`, exitCode);
      }
      return;
    }
    case "writeFile": {
      const filePath = resolveStepPath(projectDir, step.path);
      if (step.ifExists !== "overwrite" && (await ports.fs.exists(filePath))) {
        if (step.ifExists === "skip") return;
        throw new StepExecutionError(`file already exists: ${step.path}`);
      }
      await ports.fs.writeFile(filePath, step.contents);
      return;
    }
    case "appendFile": {
      const filePath = resolveStepPath(projectDir, step.path);
      if (!step.createIfMissing && !(await ports.fs.exists(filePath))) {
        throw new StepExecutionError(`file does not exist: ${step.path}`);
      }
      await ports.fs.appendFile(filePath, step.contents);
      return;
    }
    case "patchJson": {
      const filePath = resolveStepPath(projectDir, step.path);
      const current = JSON.parse(await ports.fs.readFile(filePath));
      const merged = deepMergeJson(current, step.merge);
      await ports.fs.writeFile(filePath, JSON.stringify(merged, null, 2));
      return;
    }
    case "mkdir": {
      await ports.fs.mkdir(resolveStepPath(projectDir, step.path));
      return;
    }
    case "deleteFile": {
      await ports.fs.deleteFile(resolveStepPath(projectDir, step.path));
      return;
    }
  }
}

export function createNodeExecutor(ports: ExecutorPorts): Executor {
  return {
    async *execute(plan: ScaffoldPlan, opts: ExecuteOptions): AsyncIterable<ScaffoldEvent> {
      const projectDir = resolveProjectDir(opts.parentDir, plan.project.name);

      yield { type: "plan:start", totalSteps: plan.steps.length, project: plan.project.name };

      for (let index = 0; index < plan.steps.length; index++) {
        const step = plan.steps[index];
        yield {
          type: "step:start",
          index,
          step: { id: step.id, kind: step.kind, tech: step.tech, label: step.label },
        };

        const startedAt = Date.now();
        try {
          await executeStep(step, ports, opts.parentDir, projectDir);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const exitCode = error instanceof StepExecutionError ? error.exitCode : undefined;
          yield { type: "step:failed", index, error: { message, exitCode } };
          yield { type: "plan:failed", index, error: { message } };
          return;
        }

        yield { type: "step:done", index, durationMs: Date.now() - startedAt };
      }

      yield { type: "plan:done", projectDir };
    },
  };
}
