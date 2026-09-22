import type { Step } from "../types/plan.js";
import type { Recipe } from "./recipe.js";

const AI_PROVIDER = `import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const provider = createOpenAICompatible({
  name: "local",
  baseURL: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: process.env.AI_API_KEY ?? "ollama",
});

export const model = provider(process.env.AI_MODEL ?? "llama3.2");
`;

const CHAT_ROUTE = `import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { model } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
`;

const CHAT_PAGE = `"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, index) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== "ready"}>
          Submit
        </button>
      </form>
    </>
  );
}
`;

const ENV_EXAMPLE = `# capo: vercel-ai-sdk
# Defaults to a local Ollama server. Set these to point at any
# OpenAI-compatible endpoint instead.
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
AI_API_KEY=ollama
`;

export const vercelAiSdkRecipe: Recipe = {
  tech: "vercel-ai-sdk",
  ownedFiles: [
    "src/lib/ai.ts",
    "src/app/api/chat/route.ts",
    "src/app/chat/page.tsx",
    ".env.example",
  ],
  steps(): Step[] {
    return [
      {
        id: "ai-sdk-install",
        tech: "vercel-ai-sdk",
        label: "Install Vercel AI SDK",
        kind: "run",
        cmd: "pnpm",
        args: ["add", "ai", "@ai-sdk/react", "@ai-sdk/openai-compatible"],
        cwd: "project",
        timeoutMs: 120_000,
      },
      {
        id: "ai-sdk-provider",
        tech: "vercel-ai-sdk",
        label: "Write AI provider (defaults to local Ollama)",
        kind: "writeFile",
        path: "src/lib/ai.ts",
        contents: AI_PROVIDER,
        ifExists: "fail",
      },
      {
        id: "ai-sdk-route",
        tech: "vercel-ai-sdk",
        label: "Write chat API route",
        kind: "writeFile",
        path: "src/app/api/chat/route.ts",
        contents: CHAT_ROUTE,
        ifExists: "fail",
      },
      {
        id: "ai-sdk-page",
        tech: "vercel-ai-sdk",
        label: "Write chat page",
        kind: "writeFile",
        path: "src/app/chat/page.tsx",
        contents: CHAT_PAGE,
        ifExists: "fail",
      },
      {
        id: "ai-sdk-env-example",
        tech: "vercel-ai-sdk",
        label: "Write .env.example",
        kind: "writeFile",
        path: ".env.example",
        contents: ENV_EXAMPLE,
        ifExists: "fail",
      },
    ];
  },
  remove(): Step[] {
    return [
      {
        id: "ai-sdk-remove-deps",
        tech: "vercel-ai-sdk",
        label: "Remove Vercel AI SDK packages",
        kind: "run",
        cmd: "pnpm",
        args: ["remove", "ai", "@ai-sdk/react", "@ai-sdk/openai-compatible"],
        cwd: "project",
        timeoutMs: 120_000,
      },
      {
        id: "ai-sdk-remove-provider",
        tech: "vercel-ai-sdk",
        label: "Delete AI provider",
        kind: "deleteFile",
        path: "src/lib/ai.ts",
      },
      {
        id: "ai-sdk-remove-route",
        tech: "vercel-ai-sdk",
        label: "Delete chat API route",
        kind: "deleteFile",
        path: "src/app/api/chat/route.ts",
      },
      {
        id: "ai-sdk-remove-page",
        tech: "vercel-ai-sdk",
        label: "Delete chat page",
        kind: "deleteFile",
        path: "src/app/chat/page.tsx",
      },
      {
        id: "ai-sdk-remove-env-example",
        tech: "vercel-ai-sdk",
        label: "Delete .env.example",
        kind: "deleteFile",
        path: ".env.example",
      },
    ];
  },
};
