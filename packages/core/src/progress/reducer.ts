import type { ScaffoldEvent } from "../types/events.js";

export type ProgressPhase = "idle" | "running" | "done" | "failed";

export interface ProgressState {
  readonly phase: ProgressPhase;
  readonly totalSteps: number;
  readonly currentIndex: number | null;
  readonly currentLabel: string | null;
  readonly output: readonly string[];
  readonly error: { readonly message: string; readonly exitCode?: number } | null;
  readonly projectDir: string | null;
}

export const INITIAL_PROGRESS_STATE: ProgressState = {
  phase: "idle",
  totalSteps: 0,
  currentIndex: null,
  currentLabel: null,
  output: [],
  error: null,
  projectDir: null,
};

export function reduceProgress(state: ProgressState, event: ScaffoldEvent): ProgressState {
  switch (event.type) {
    case "plan:start":
      return {
        ...INITIAL_PROGRESS_STATE,
        phase: "running",
        totalSteps: event.totalSteps,
      };
    case "step:start":
      return { ...state, currentIndex: event.index, currentLabel: event.step.label };
    case "step:output":
      return { ...state, output: [...state.output, event.chunk] };
    case "step:done":
      return state;
    case "step:failed":
      return { ...state, phase: "failed", error: event.error };
    case "plan:done":
      return { ...state, phase: "done", projectDir: event.projectDir };
    case "plan:failed":
      return { ...state, phase: "failed", error: event.error };
  }
}
