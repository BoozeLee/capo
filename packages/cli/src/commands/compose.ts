import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CATALOG,
  DEFAULT_STACK_OPTIONS,
  RECIPES,
  type ScaffoldEvent,
  type ScaffoldPlan,
  ScaffoldPlanSchema,
  type ThemeMode,
  parseCrew,
  phaseLine,
  planScaffold,
} from "@capo/core";
import { createDryRunExecutor, createNodeExecutor, encodeEvent, nodePorts } from "@capo/engine";
import { PACKAGE_VERSION } from "../package-version.js";
import { type CliError, describeError } from "./describe-error.js";
import { resolveWithRetry } from "./resolve-with-retry.js";

export interface ComposeCommandOptions {
  readonly crew?: string;
  readonly name?: string;
  readonly fromPlan?: string;
  readonly gotommyguns: boolean;
  readonly omerta: boolean;
  readonly json: boolean;
  readonly dryRun: boolean;
}

type PlanOutcome =
  | { readonly ok: true; readonly plan: ScaffoldPlan }
  | { readonly ok: false; readonly error: CliError };

async function buildComposePlan(opts: ComposeCommandOptions): Promise<PlanOutcome> {
  if (opts.fromPlan) {
    let raw: string;
    try {
      raw = await readFile(opts.fromPlan, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { code: "MISSING_ARGS", message: `cannot read --from-plan file: ${message}` },
      };
    }
    try {
      const plan = ScaffoldPlanSchema.parse(JSON.parse(raw));
      return { ok: true, plan: plan as ScaffoldPlan };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { code: "MISSING_ARGS", message: `invalid --from-plan file: ${message}` },
      };
    }
  }

  if (!opts.crew || !opts.name) {
    return {
      ok: false,
      error: {
        code: "MISSING_ARGS",
        message: "--crew and --name are required (or pass --from-plan)",
      },
    };
  }

  const crew = parseCrew(opts.crew);
  const resolved = resolveWithRetry(
    { name: opts.name, crew, options: DEFAULT_STACK_OPTIONS },
    CATALOG,
    opts.gotommyguns,
  );
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  return {
    ok: true,
    plan: planScaffold({
      stack: resolved.value,
      name: opts.name,
      catalog: CATALOG,
      recipes: RECIPES,
      coreVersion: PACKAGE_VERSION,
      createdAt: new Date().toISOString(),
    }),
  };
}

export async function runComposeCommand(opts: ComposeCommandOptions): Promise<number> {
  const outcome = await buildComposePlan(opts);
  if (!outcome.ok) {
    if (opts.json) {
      console.log(JSON.stringify({ error: outcome.error }));
    } else {
      console.error(`❌ ${describeError(outcome.error)}`);
    }
    return 2;
  }

  const { plan } = outcome;
  const parentDir = process.cwd();
  const projectDir = path.join(parentDir, plan.project.name);

  if (existsSync(projectDir) && !opts.gotommyguns) {
    const message = `${projectDir} already exists — use --gotommyguns to overwrite`;
    if (opts.json) {
      console.log(JSON.stringify({ error: { code: "MISSING_ARGS", message } }));
    } else {
      console.error(`❌ ${message}`);
    }
    return 1;
  }

  const executor = opts.dryRun ? createDryRunExecutor() : createNodeExecutor(nodePorts);
  const mode: ThemeMode = { gotommyguns: opts.gotommyguns, omerta: opts.omerta };

  let exitCode = 0;
  for await (const event of executor.execute(plan, { parentDir })) {
    emitEvent(event, opts.json, mode);
    if (event.type === "plan:failed") exitCode = 1;
  }
  return exitCode;
}

function emitEvent(event: ScaffoldEvent, json: boolean, mode: ThemeMode): void {
  if (json) {
    process.stdout.write(encodeEvent(event));
    return;
  }
  const line = phaseLine(event, mode);
  if (line !== null) console.log(line);
}
