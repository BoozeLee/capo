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
    // detached: the predicate gets its own process group, so a timeout kills the whole
    // tree — with dash as `sh`, killing only the shell leaves its children holding our pipes.
    const child = spawn("sh", ["-c", cmd], {
      cwd: opts.cwd,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
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
            if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
            else child.kill("SIGKILL");
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
