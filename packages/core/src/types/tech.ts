export type TechId =
  | "nextjs"
  | "tailwindcss"
  | "shadcn"
  | "drizzle"
  | "vercel-ai-sdk"
  | "memory-mcp-server";

export type Category = "framework" | "styling" | "ui" | "database" | "ai" | "mcp";

export interface Tech {
  readonly id: TechId;
  readonly category: Category;
  readonly name: string;
  readonly role: string;
  readonly description: string;
  readonly requires: readonly TechId[];
  readonly conflictsWith: readonly TechId[];
  readonly provides: readonly TechId[];
  readonly packages: readonly string[];
  readonly minNode: string;
}
