import type { ResolveError } from "@capo/core";

export type CliError = ResolveError | { readonly code: "MISSING_ARGS"; readonly message: string };

export function describeError(error: CliError): string {
  switch (error.code) {
    case "MISSING_ARGS":
      return error.message;
    case "UNKNOWN_TECH":
      return `unknown tech "${error.id}"`;
    case "NO_FRAMEWORK":
      return "no framework selected — pick one (e.g. nextjs)";
    case "MULTIPLE_FRAMEWORKS":
      return `multiple frameworks selected: ${error.ids.join(", ")}`;
    case "CONFLICT":
      return `${error.a} conflicts with ${error.b} — use --sitdown to resolve, or drop one`;
    case "INVALID_NAME":
      return `invalid project name "${error.name}": ${error.reason}`;
  }
}
