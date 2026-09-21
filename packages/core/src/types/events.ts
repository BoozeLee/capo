import type { Step } from "./plan.js";

export type ScaffoldEvent =
  | { readonly type: "plan:start"; readonly totalSteps: number; readonly project: string }
  | {
      readonly type: "step:start";
      readonly index: number;
      readonly step: Pick<Step, "id" | "kind" | "tech" | "label">;
    }
  | {
      readonly type: "step:output";
      readonly index: number;
      readonly stream: "stdout" | "stderr";
      readonly chunk: string;
    }
  | { readonly type: "step:done"; readonly index: number; readonly durationMs: number }
  | {
      readonly type: "step:failed";
      readonly index: number;
      readonly error: { readonly message: string; readonly exitCode?: number };
    }
  | { readonly type: "plan:done"; readonly projectDir: string }
  | {
      readonly type: "plan:failed";
      readonly index: number;
      readonly error: { readonly message: string };
    };
