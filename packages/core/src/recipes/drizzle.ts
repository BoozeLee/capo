import type { Step } from "../types/plan.js";
import type { Recipe } from "./recipe.js";

const SCHEMA = `import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});
`;

const DB_INDEX = `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:local.db" });

export const db = drizzle(client, { schema });
`;

const DRIZZLE_CONFIG = `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:local.db",
  },
});
`;

export const drizzleRecipe: Recipe = {
  tech: "drizzle",
  ownedFiles: ["drizzle.config.ts", "src/db/schema.ts", "src/db/index.ts"],
  steps(): Step[] {
    return [
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
      {
        id: "drizzle-config",
        tech: "drizzle",
        label: "Write drizzle.config.ts",
        kind: "writeFile",
        path: "drizzle.config.ts",
        contents: DRIZZLE_CONFIG,
        ifExists: "fail",
      },
      {
        id: "drizzle-schema",
        tech: "drizzle",
        label: "Write db schema",
        kind: "writeFile",
        path: "src/db/schema.ts",
        contents: SCHEMA,
        ifExists: "fail",
      },
      {
        id: "drizzle-client",
        tech: "drizzle",
        label: "Write db client",
        kind: "writeFile",
        path: "src/db/index.ts",
        contents: DB_INDEX,
        ifExists: "fail",
      },
      {
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
      },
      {
        id: "drizzle-gitignore",
        tech: "drizzle",
        label: "Ignore local database file",
        kind: "appendFile",
        path: ".gitignore",
        contents: "\n# capo: drizzle\n*.db\n",
        createIfMissing: true,
      },
    ];
  },
  remove(): Step[] {
    return [
      {
        id: "drizzle-remove-deps",
        tech: "drizzle",
        label: "Remove Drizzle packages",
        kind: "run",
        cmd: "pnpm",
        args: ["remove", "drizzle-orm", "@libsql/client", "drizzle-kit"],
        cwd: "project",
        timeoutMs: 120_000,
      },
      {
        id: "drizzle-remove-config",
        tech: "drizzle",
        label: "Delete drizzle.config.ts",
        kind: "deleteFile",
        path: "drizzle.config.ts",
      },
      {
        id: "drizzle-remove-schema",
        tech: "drizzle",
        label: "Delete db schema",
        kind: "deleteFile",
        path: "src/db/schema.ts",
      },
      {
        id: "drizzle-remove-client",
        tech: "drizzle",
        label: "Delete db client",
        kind: "deleteFile",
        path: "src/db/index.ts",
      },
    ];
  },
};
