import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Real tests land starting Phase 1 of the capo rewrite; until then an
    // empty suite is expected, not a failure.
    passWithNoTests: true,
  },
});
