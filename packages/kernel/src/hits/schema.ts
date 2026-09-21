import { z } from "zod";

export const SOLDIERS = ["refactor", "test", "research", "security", "docs"] as const;
export type Soldier = (typeof SOLDIERS)[number];

const ID = z.string().regex(/^[a-z][a-z0-9_-]*$/, "ids are lowercase slugs");

export const NodeSchema = z
  .object({
    id: ID,
    goal: z.string().min(1),
    depends_on: z.array(ID).default([]),
    write_scope: z.array(z.string().min(1)).min(1),
    forbidden: z.array(z.string().min(1)).default([]),
    accept: z.string().min(1).optional(),
    human_verify: z.boolean().default(false),
    human_verify_reason: z.string().min(1).optional(),
    budget: z.number().int().positive(),
    rollback: z.string().min(1).optional(),
    soldier: z.enum(SOLDIERS).optional(),
  })
  .strict();

export const HitSchema = z
  .object({
    id: ID,
    title: z.string().min(1),
    created: z.string().min(1),
    nodes: z.array(NodeSchema).min(1),
  })
  .strict();

export type HitNode = z.infer<typeof NodeSchema>;
export type Hit = z.infer<typeof HitSchema>;
