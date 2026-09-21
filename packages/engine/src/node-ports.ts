import { access, appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import spawn from "cross-spawn";
import type { ExecutorPorts, ProcOutputChunk, SpawnOptions, SpawnResult } from "./executor.js";

export const nodePorts: ExecutorPorts = {
  fs: {
    writeFile: async (path, contents) => {
      await mkdir(path.substring(0, path.lastIndexOf("/")), { recursive: true });
      await writeFile(path, contents, "utf8");
    },
    readFile: (path) => readFile(path, "utf8"),
    appendFile: (path, contents) => appendFile(path, contents, "utf8"),
    exists: async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    mkdir: async (path) => {
      await mkdir(path, { recursive: true });
    },
    deleteFile: (path) => rm(path),
  },
  proc: {
    spawn(cmd, args, opts: SpawnOptions): SpawnResult {
      const child = spawn(cmd, [...args], {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env, CI: "1", FORCE_COLOR: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, opts.timeoutMs);

      const output = (async function* (): AsyncGenerator<ProcOutputChunk> {
        const queue: ProcOutputChunk[] = [];
        let resolveNext: (() => void) | null = null;
        let ended = false;

        const push = (stream: "stdout" | "stderr", chunk: Buffer) => {
          queue.push({ stream, chunk: chunk.toString("utf8") });
          resolveNext?.();
        };

        child.stdout?.on("data", (chunk: Buffer) => push("stdout", chunk));
        child.stderr?.on("data", (chunk: Buffer) => push("stderr", chunk));
        child.on("close", () => {
          ended = true;
          resolveNext?.();
        });

        while (!ended || queue.length > 0) {
          if (queue.length === 0) {
            await new Promise<void>((resolve) => {
              resolveNext = resolve;
            });
            resolveNext = null;
            continue;
          }
          const next = queue.shift();
          if (next) yield next;
        }
      })();

      const exit = new Promise<number>((resolve) => {
        child.on("close", (code) => {
          clearTimeout(timeout);
          resolve(code ?? 1);
        });
      });

      return { output, exit };
    },
  },
};
