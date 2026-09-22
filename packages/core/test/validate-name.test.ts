import { describe, expect, test } from "vitest";
import { validateProjectName } from "../src/resolver/validate-name.js";

describe("validateProjectName", () => {
  test("accepts a simple lowercase name", () => {
    expect(validateProjectName("myapp")).toBeNull();
  });

  test("accepts hyphens, underscores, and dots after the first character", () => {
    expect(validateProjectName("my-app_2.0")).toBeNull();
  });

  test("rejects an empty name", () => {
    expect(validateProjectName("")).toBe("name must not be empty");
  });

  test("rejects a name containing spaces", () => {
    expect(validateProjectName("my app")).toBe(
      'name must match ^[a-z0-9][a-z0-9._-]{0,99}$ (got "my app")',
    );
  });

  test("rejects a name starting with an uppercase letter", () => {
    expect(validateProjectName("MyApp")).toBe(
      'name must match ^[a-z0-9][a-z0-9._-]{0,99}$ (got "MyApp")',
    );
  });

  test("rejects a name longer than 100 characters", () => {
    const tooLong = `a${"b".repeat(100)}`;
    expect(validateProjectName(tooLong)).toBe(
      `name must match ^[a-z0-9][a-z0-9._-]{0,99}$ (got "${tooLong}")`,
    );
  });
});
