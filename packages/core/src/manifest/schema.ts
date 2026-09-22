import { z } from "zod";

const TECH_IDS = [
  "nextjs",
  "tailwindcss",
  "shadcn",
  "drizzle",
  "vercel-ai-sdk",
  "memory-mcp-server",
] as const;

const TechIdSchema = z.enum(TECH_IDS);

const StackOptionsSchema = z
  .object({
    drizzleDriver: z.literal("libsql"),
    shadcnPreset: z.literal("nova"),
  })
  .strict();

export const CapoManifestSchema = z
  .object({
    version: z.literal(1),
    name: z.string(),
    createdAt: z.string(),
    capo: z
      .object({
        version: z.string(),
        coreVersion: z.string(),
      })
      .strict(),
    stack: z
      .object({
        framework: TechIdSchema,
        members: z.array(TechIdSchema),
        options: StackOptionsSchema,
      })
      .strict(),
    owned: z.record(z.string(), z.array(z.string())),
  })
  .strict();

export type CapoManifest = z.infer<typeof CapoManifestSchema>;
