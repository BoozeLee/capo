import type { ScaffoldEvent, ScaffoldPlan } from "@capo/core";

export interface ProcOutputChunk {
  readonly stream: "stdout" | "stderr";
  readonly chunk: string;
}

export interface SpawnOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface SpawnResult {
  readonly output: AsyncIterable<ProcOutputChunk>;
  readonly exit: Promise<number>;
}

export interface ExecutorPorts {
  readonly fs: {
    writeFile(path: string, contents: string): Promise<void>;
    readFile(path: string): Promise<string>;
    appendFile(path: string, contents: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
  };
  readonly proc: {
    spawn(cmd: string, args: readonly string[], opts: SpawnOptions): SpawnResult;
  };
}

export interface ExecuteOptions {
  readonly parentDir: string;
  readonly signal?: AbortSignal;
}

export interface Executor {
  execute(plan: ScaffoldPlan, opts: ExecuteOptions): AsyncIterable<ScaffoldEvent>;
}
