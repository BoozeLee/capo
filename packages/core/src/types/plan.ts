import type { ResolvedStack } from "./stack.js";
import type { TechId } from "./tech.js";

interface StepBase {
  readonly id: string;
  readonly tech: TechId | "capo";
  readonly label: string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

export type Step =
  | (StepBase & {
      readonly kind: "run";
      readonly cmd: string;
      readonly args: readonly string[];
      readonly cwd: "project" | "parent";
      readonly env?: Readonly<Record<string, string>>;
      readonly timeoutMs: number;
    })
  | (StepBase & {
      readonly kind: "writeFile";
      readonly path: string;
      readonly contents: string;
      readonly ifExists: "fail" | "overwrite" | "skip";
    })
  | (StepBase & {
      readonly kind: "appendFile";
      readonly path: string;
      readonly contents: string;
      readonly createIfMissing: boolean;
    })
  | (StepBase & {
      readonly kind: "patchJson";
      readonly path: string;
      readonly merge: JsonObject;
    })
  | (StepBase & { readonly kind: "mkdir"; readonly path: string })
  | (StepBase & { readonly kind: "deleteFile"; readonly path: string });

export interface ScaffoldPlan {
  readonly schemaVersion: 1;
  readonly coreVersion: string;
  readonly project: { readonly name: string };
  readonly stack: ResolvedStack;
  readonly steps: readonly Step[];
}
