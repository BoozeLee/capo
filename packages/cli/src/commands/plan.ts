import {
  CATALOG,
  DEFAULT_STACK_OPTIONS,
  RECIPES,
  type ScaffoldPlan,
  parseCrew,
  planScaffold,
  resolveStack,
} from "@capo/core";
import { PACKAGE_VERSION } from "../package-version.js";
import { type CliError, describeError } from "./describe-error.js";

export interface PlanCommandOptions {
  readonly crew?: string;
  readonly name?: string;
  readonly json: boolean;
}

export type PlanResult =
  | { readonly ok: true; readonly plan: ScaffoldPlan }
  | { readonly ok: false; readonly error: CliError };

export function buildPlan(opts: { crew?: string; name?: string }): PlanResult {
  if (!opts.crew || !opts.name) {
    return {
      ok: false,
      error: { code: "MISSING_ARGS", message: "--crew and --name are both required" },
    };
  }

  const crew = parseCrew(opts.crew);
  const resolved = resolveStack({ name: opts.name, crew, options: DEFAULT_STACK_OPTIONS }, CATALOG);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const plan = planScaffold({
    stack: resolved.value,
    name: opts.name,
    catalog: CATALOG,
    recipes: RECIPES,
    coreVersion: PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
  });

  return { ok: true, plan };
}

export function runPlanCommand(opts: PlanCommandOptions): number {
  const result = buildPlan(opts);

  if (!result.ok) {
    if (opts.json) {
      console.log(JSON.stringify({ error: result.error }));
    } else {
      console.error(`❌ ${describeError(result.error)}`);
    }
    return 2;
  }

  if (opts.json) {
    console.log(JSON.stringify(result.plan, null, 2));
  } else {
    console.log(
      `🎩 Plan for "${result.plan.project.name}": ${result.plan.stack.members.join(", ")} (${result.plan.steps.length} steps)`,
    );
  }
  return 0;
}
