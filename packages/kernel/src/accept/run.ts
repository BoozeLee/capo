import spawn from "cross-spawn";

export interface AcceptOptions {
  readonly cwd: string;
  readonly timeoutMs?: number;
}

export interface AcceptResult {
  readonly exit: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

/** Runs the node's acceptance predicate through `sh -c`. Exit code is the verdict. */
export function runAccept(cmd: string, opts: AcceptOptions): Promise<AcceptResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", cmd], {
      cwd: opts.cwd,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString("utf8");
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    const timer =
      opts.timeoutMs === undefined
        ? null
        : setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
          }, opts.timeoutMs);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        exit: code ?? (timedOut ? 124 : 1),
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
  });
}
