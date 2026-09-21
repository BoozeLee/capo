import { z } from "zod";

const TECH_ID = z.enum([
  "nextjs",
  "tailwindcss",
  "shadcn",
  "drizzle",
  "vercel-ai-sdk",
  "memory-mcp-server",
]);
const STEP_TECH = z.union([TECH_ID, z.literal("capo")]);

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);
const JsonObjectSchema = z.record(z.string(), JsonValueSchema);

const StepBase = { id: z.string(), tech: STEP_TECH, label: z.string() };

const StepSchema = z.discriminatedUnion("kind", [
  z.object({
    ...StepBase,
    kind: z.literal("run"),
    cmd: z.string(),
    args: z.array(z.string()),
    cwd: z.enum(["project", "parent"]),
    env: z.record(z.string(), z.string()).optional(),
    timeoutMs: z.number(),
  }),
  z.object({
    ...StepBase,
    kind: z.literal("writeFile"),
    path: z.string(),
    contents: z.string(),
    ifExists: z.enum(["fail", "overwrite", "skip"]),
  }),
  z.object({
    ...StepBase,
    kind: z.literal("appendFile"),
    path: z.string(),
    contents: z.string(),
    createIfMissing: z.boolean(),
  }),
  z.object({
    ...StepBase,
    kind: z.literal("patchJson"),
    path: z.string(),
    merge: JsonObjectSchema,
  }),
  z.object({ ...StepBase, kind: z.literal("mkdir"), path: z.string() }),
  z.object({ ...StepBase, kind: z.literal("deleteFile"), path: z.string() }),
]);

const StackOptionsSchema = z
  .object({
    drizzleDriver: z.literal("libsql"),
    shadcnPreset: z.literal("nova"),
  })
  .strict();

const ResolvedStackSchema = z
  .object({
    framework: TECH_ID,
    members: z.array(TECH_ID),
    autoIncluded: z.array(TECH_ID),
    options: StackOptionsSchema,
  })
  .strict();

export const ScaffoldPlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    coreVersion: z.string(),
    project: z.object({ name: z.string() }).strict(),
    stack: ResolvedStackSchema,
    steps: z.array(StepSchema),
  })
  .strict();
