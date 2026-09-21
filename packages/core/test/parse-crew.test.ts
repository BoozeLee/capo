import { describe, expect, test } from "vitest";
import { parseCrew } from "../src/resolver/parse-crew.js";

describe("parseCrew", () => {
  test("splits a comma-separated list into an array", () => {
    expect(parseCrew("nextjs,shadcn,drizzle")).toEqual(["nextjs", "shadcn", "drizzle"]);
  });

  test("trims whitespace around each entry", () => {
    expect(parseCrew("nextjs, shadcn , drizzle")).toEqual(["nextjs", "shadcn", "drizzle"]);
  });

  test("drops empty entries from trailing/duplicate commas", () => {
    expect(parseCrew("nextjs,,shadcn,")).toEqual(["nextjs", "shadcn"]);
  });

  test("returns an empty array for an empty string", () => {
    expect(parseCrew("")).toEqual([]);
  });
});
