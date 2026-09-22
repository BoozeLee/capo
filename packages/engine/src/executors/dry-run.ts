import path from "node:path";
import type { ScaffoldEvent, ScaffoldPlan, Step } from "@capo/core";
import type { ExecuteOptions, Executor } from "../executor.js";

function shellQuote(arg: string): string {
  return /^[a-zA-Z0-9@/_.\-=]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

function stepToShell(step: Step): string {
  switch (step.kind) {
    case "run": {
      const dirVar = step.cwd === "parent" ? "$PARENT_DIR" : "$PROJECT_DIR";
      const cmdLine = [step.cmd, ...step.args].map(shellQuote).join(" ");
      return `# ${step.label}\n(cd "${dirVar}" && ${cmdLine})\n`;
    }
    case "writeFile":
      return `# ${step.label}\ncat > "$PROJECT_DIR/${step.path}" <<'CAPO_EOF'\n${step.contents}\nCAPO_EOF\n`;
    case "appendFile":
      return `# ${step.label}\ncat >> "$PROJECT_DIR/${step.path}" <<'CAPO_EOF'\n${step.contents}\nCAPO_EOF\n`;
    case "mkdir":
      return `# ${step.label}\nmkdir -p "$PROJECT_DIR/${step.path}"\n`;
    case "deleteFile":
      return `# ${step.label}\nrm -f "$PROJECT_DIR/${step.path}"\n`;
    case "patchJson":
      return `# capo: patchJson ${step.path} requires the capo CLI — not representable as plain shell\n`;
  }
}

export interface DryRunExecutor extends Executor {
  toShellScript(plan: ScaffoldPlan): string;
}

export function createDryRunExecutor(): DryRunExecutor {
  return {
    async *execute(plan: ScaffoldPlan, opts: ExecuteOptions): AsyncIterable<ScaffoldEvent> {
      yield { type: "plan:start", totalSteps: plan.steps.length, project: plan.project.name };
      for (let index = 0; index < plan.steps.length; index++) {
        const step = plan.steps[index];
        yield {
          type: "step:start",
          index,
          step: { id: step.id, kind: step.kind, tech: step.tech, label: step.label },
        };
        yield { type: "step:done", index, durationMs: 0 };
      }
      yield {
        type: "plan:done",
        projectDir: path.join(opts.parentDir, plan.project.name),
      };
    },

    toShellScript(plan: ScaffoldPlan): string {
      const header = `#!/bin/sh\nset -eu\nPARENT_DIR="\${PARENT_DIR:-.}"\nPROJECT_DIR="$PARENT_DIR/${plan.project.name}"\n\n`;
      return header + plan.steps.map(stepToShell).join("\n");
    },
  };
}
