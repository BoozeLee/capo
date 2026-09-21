import type { TechId } from "./tech.js";

export interface StackOptions {
  readonly drizzleDriver: "libsql";
  readonly shadcnPreset: "nova";
}

export const DEFAULT_STACK_OPTIONS: StackOptions = {
  drizzleDriver: "libsql",
  shadcnPreset: "nova",
};

export interface Selection {
  readonly name: string;
  readonly crew: readonly TechId[];
  readonly options: StackOptions;
}

export interface ResolvedStack {
  readonly framework: TechId;
  readonly members: readonly TechId[];
  readonly autoIncluded: readonly TechId[];
  readonly options: StackOptions;
}

export type SitdownOption =
  | { readonly kind: "drop"; readonly id: TechId }
  | { readonly kind: "swap"; readonly from: TechId; readonly to: TechId };

export type ResolveError =
  | { readonly code: "UNKNOWN_TECH"; readonly id: string }
  | { readonly code: "NO_FRAMEWORK" }
  | { readonly code: "MULTIPLE_FRAMEWORKS"; readonly ids: readonly TechId[] }
  | {
      readonly code: "CONFLICT";
      readonly a: TechId;
      readonly b: TechId;
      readonly options: readonly SitdownOption[];
    }
  | { readonly code: "INVALID_NAME"; readonly name: string; readonly reason: string };
