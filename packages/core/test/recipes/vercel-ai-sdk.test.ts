import { describe, expect, test } from "vitest";
import { createContext } from "../../src/recipes/recipe.js";
import { vercelAiSdkRecipe } from "../../src/recipes/vercel-ai-sdk.js";
import { DEFAULT_STACK_OPTIONS } from "../../src/types/stack.js";

const ctx = createContext(
  {
    framework: "nextjs",
    members: ["nextjs", "vercel-ai-sdk"],
    autoIncluded: [],
    options: DEFAULT_STACK_OPTIONS,
  },
  "myapp",
);

describe("vercelAiSdkRecipe", () => {
  test("installs ai, the react hooks, and an openai-compatible provider", () => {
    const steps = vercelAiSdkRecipe.steps(ctx);
    const install = steps.find((s) => s.kind === "run");
    expect(install).toEqual({
      id: "ai-sdk-install",
      tech: "vercel-ai-sdk",
      label: "Install Vercel AI SDK",
      kind: "run",
      cmd: "pnpm",
      args: ["add", "ai", "@ai-sdk/react", "@ai-sdk/openai-compatible"],
      cwd: "project",
      timeoutMs: 120_000,
    });
  });

  test("defaults the provider to local Ollama, not a paid API", () => {
    const steps = vercelAiSdkRecipe.steps(ctx);
    const provider = steps.find((s) => s.kind === "writeFile" && s.path === "src/lib/ai.ts");
    expect(provider).toBeDefined();
    if (provider?.kind === "writeFile") {
      expect(provider.contents).toContain("http://localhost:11434/v1");
      expect(provider.contents).toContain("AI_BASE_URL");
    }
  });

  test("uses the current (v7) route handler shape confirmed by the spike", () => {
    const steps = vercelAiSdkRecipe.steps(ctx);
    const route = steps.find(
      (s) => s.kind === "writeFile" && s.path === "src/app/api/chat/route.ts",
    );
    expect(route).toBeDefined();
    if (route?.kind === "writeFile") {
      expect(route.contents).toContain("createUIMessageStreamResponse");
      expect(route.contents).toContain("toUIMessageStream");
      expect(route.contents).toContain("convertToModelMessages");
    }
  });

  test("writes a chat page using useChat + DefaultChatTransport", () => {
    const steps = vercelAiSdkRecipe.steps(ctx);
    const page = steps.find((s) => s.kind === "writeFile" && s.path === "src/app/chat/page.tsx");
    expect(page).toBeDefined();
    if (page?.kind === "writeFile") {
      expect(page.contents).toContain("useChat");
      expect(page.contents).toContain("DefaultChatTransport");
    }
  });

  test("owns its four files", () => {
    expect(vercelAiSdkRecipe.ownedFiles).toEqual([
      "src/lib/ai.ts",
      "src/app/api/chat/route.ts",
      "src/app/chat/page.tsx",
      ".env.example",
    ]);
  });

  test("remove() uninstalls the packages and deletes owned files", () => {
    const steps = vercelAiSdkRecipe.remove?.(ctx) ?? [];
    const runStep = steps.find((s) => s.kind === "run");
    expect(runStep).toEqual({
      id: "ai-sdk-remove-deps",
      tech: "vercel-ai-sdk",
      label: "Remove Vercel AI SDK packages",
      kind: "run",
      cmd: "pnpm",
      args: ["remove", "ai", "@ai-sdk/react", "@ai-sdk/openai-compatible"],
      cwd: "project",
      timeoutMs: 120_000,
    });

    const deletions = steps
      .filter((s) => s.kind === "deleteFile")
      .map((s) => (s.kind === "deleteFile" ? s.path : ""));
    expect(deletions).toEqual([
      "src/lib/ai.ts",
      "src/app/api/chat/route.ts",
      "src/app/chat/page.tsx",
      ".env.example",
    ]);
  });
});
