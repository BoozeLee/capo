import { describe, expect, test } from "vitest";
import { memoryMcpServerRecipe } from "../../src/recipes/memory-mcp-server.js";
import { createContext } from "../../src/recipes/recipe.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

const ctx = createContext(
  {
    framework: "nextjs",
    members: ["nextjs", "memory-mcp-server"],
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  },
  "myapp",
);

describe("memoryMcpServerRecipe", () => {
  test("writes .mcp.json wiring the official memory server, no install step", () => {
    const steps = memoryMcpServerRecipe.steps(ctx);
    expect(steps.some((s) => s.kind === "run")).toBe(false);

    const mcpConfig = steps.find((s) => s.kind === "writeFile" && s.path === ".mcp.json");
    expect(mcpConfig).toBeDefined();
    if (mcpConfig?.kind === "writeFile") {
      const parsed = JSON.parse(mcpConfig.contents);
      expect(parsed.mcpServers.memory.command).toBe("npx");
      expect(parsed.mcpServers.memory.args).toEqual(["-y", "@modelcontextprotocol/server-memory"]);
      expect(parsed.mcpServers.memory.env.MEMORY_FILE_PATH).toBe(".capo/memory.jsonl");
    }
  });

  test("ignores the memory file in git", () => {
    const steps = memoryMcpServerRecipe.steps(ctx);
    const append = steps.find((s) => s.kind === "appendFile");
    expect(append).toEqual({
      id: "memory-mcp-gitignore",
      tech: "memory-mcp-server",
      label: "Ignore memory file",
      kind: "appendFile",
      path: ".gitignore",
      contents: "\n# capo: memory-mcp-server\n.capo/memory.jsonl\n",
      createIfMissing: true,
    });
  });

  test("owns .mcp.json", () => {
    expect(memoryMcpServerRecipe.ownedFiles).toEqual([".mcp.json"]);
  });

  test("remove() deletes .mcp.json", () => {
    const steps = memoryMcpServerRecipe.remove?.(ctx) ?? [];
    expect(steps).toEqual([
      {
        id: "memory-mcp-remove",
        tech: "memory-mcp-server",
        label: "Delete .mcp.json",
        kind: "deleteFile",
        path: ".mcp.json",
      },
    ]);
  });
});
