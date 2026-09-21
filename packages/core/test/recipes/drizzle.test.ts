import { describe, expect, test } from "vitest";
import { drizzleRecipe } from "../../src/recipes/drizzle.js";
import { createContext } from "../../src/recipes/recipe.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

const ctx = createContext(
  {
    framework: "nextjs",
    members: ["nextjs", "drizzle"],
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  },
  "myapp",
);

describe("drizzleRecipe", () => {
  test("installs drizzle-orm + libsql client as a prod dep, drizzle-kit as dev", () => {
    const steps = drizzleRecipe.steps(ctx);
    const installSteps = steps.filter((s) => s.kind === "run");
    expect(installSteps).toEqual([
      {
        id: "drizzle-install",
        tech: "drizzle",
        label: "Install Drizzle ORM + libSQL client",
        kind: "run",
        cmd: "pnpm",
        args: ["add", "drizzle-orm", "@libsql/client"],
        cwd: "project",
        timeoutMs: 120_000,
      },
      {
        id: "drizzle-install-dev",
        tech: "drizzle",
        label: "Install drizzle-kit",
        kind: "run",
        cmd: "pnpm",
        args: ["add", "-D", "drizzle-kit"],
        cwd: "project",
        timeoutMs: 120_000,
      },
    ]);
  });

  test("writes drizzle.config.ts pointing at a local libsql file by default", () => {
    const steps = drizzleRecipe.steps(ctx);
    const config = steps.find((s) => s.kind === "writeFile" && s.path === "drizzle.config.ts");
    expect(config).toBeDefined();
    if (config?.kind === "writeFile") {
      expect(config.contents).toContain('dialect: "sqlite"');
      expect(config.contents).toContain("file:local.db");
      expect(config.ifExists).toBe("fail");
    }
  });

  test("writes a schema and a db client module", () => {
    const paths = drizzleRecipe
      .steps(ctx)
      .filter((s) => s.kind === "writeFile")
      .map((s) => (s.kind === "writeFile" ? s.path : ""));
    expect(paths).toContain("src/db/schema.ts");
    expect(paths).toContain("src/db/index.ts");
  });

  test("adds db:generate/migrate/studio scripts to package.json", () => {
    const steps = drizzleRecipe.steps(ctx);
    const patch = steps.find((s) => s.kind === "patchJson");
    expect(patch).toEqual({
      id: "drizzle-scripts",
      tech: "drizzle",
      label: "Add drizzle-kit scripts",
      kind: "patchJson",
      path: "package.json",
      merge: {
        scripts: {
          "db:generate": "drizzle-kit generate",
          "db:migrate": "drizzle-kit migrate",
          "db:studio": "drizzle-kit studio",
        },
      },
    });
  });

  test("ignores the local sqlite file in git", () => {
    const steps = drizzleRecipe.steps(ctx);
    const append = steps.find((s) => s.kind === "appendFile");
    expect(append).toEqual({
      id: "drizzle-gitignore",
      tech: "drizzle",
      label: "Ignore local database file",
      kind: "appendFile",
      path: ".gitignore",
      contents: "\n# capo: drizzle\n*.db\n",
      createIfMissing: true,
    });
  });

  test("owns exactly the files it writes", () => {
    expect(drizzleRecipe.ownedFiles).toEqual([
      "drizzle.config.ts",
      "src/db/schema.ts",
      "src/db/index.ts",
    ]);
  });

  test("remove() uninstalls the packages and deletes owned files", () => {
    const steps = drizzleRecipe.remove?.(ctx) ?? [];
    const runStep = steps.find((s) => s.kind === "run");
    expect(runStep).toEqual({
      id: "drizzle-remove-deps",
      tech: "drizzle",
      label: "Remove Drizzle packages",
      kind: "run",
      cmd: "pnpm",
      args: ["remove", "drizzle-orm", "@libsql/client", "drizzle-kit"],
      cwd: "project",
      timeoutMs: 120_000,
    });

    const deletions = steps
      .filter((s) => s.kind === "deleteFile")
      .map((s) => (s.kind === "deleteFile" ? s.path : ""));
    expect(deletions).toEqual(["drizzle.config.ts", "src/db/schema.ts", "src/db/index.ts"]);
  });
});
