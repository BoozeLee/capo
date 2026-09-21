import type { Step } from "../types/plan.js";
import type { Recipe } from "./recipe.js";

const MCP_CONFIG = JSON.stringify(
  {
    mcpServers: {
      memory: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        env: { MEMORY_FILE_PATH: ".capo/memory.jsonl" },
      },
    },
  },
  null,
  2,
);

export const memoryMcpServerRecipe: Recipe = {
  tech: "memory-mcp-server",
  ownedFiles: [".mcp.json"],
  steps(): Step[] {
    return [
      {
        id: "memory-mcp-config",
        tech: "memory-mcp-server",
        label: "Write .mcp.json",
        kind: "writeFile",
        path: ".mcp.json",
        contents: `${MCP_CONFIG}\n`,
        ifExists: "fail",
      },
      {
        id: "memory-mcp-gitignore",
        tech: "memory-mcp-server",
        label: "Ignore memory file",
        kind: "appendFile",
        path: ".gitignore",
        contents: "\n# capo: memory-mcp-server\n.capo/memory.jsonl\n",
        createIfMissing: true,
      },
    ];
  },
  remove(): Step[] {
    return [
      {
        id: "memory-mcp-remove",
        tech: "memory-mcp-server",
        label: "Delete .mcp.json",
        kind: "deleteFile",
        path: ".mcp.json",
      },
    ];
  },
};
