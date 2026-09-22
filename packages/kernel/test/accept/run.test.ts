import { describe, expect, test } from "vitest";
import { runAccept } from "../../src/accept/run.js";

describe("runAccept", () => {
  test("exit 0 with captured stdout", async () => {
    const r = await runAccept("echo ok", { cwd: process.cwd() });
    expect(r.exit).toBe(0);
    expect(r.stdout.trim()).toBe("ok");
    expect(r.timedOut).toBe(false);
  });

  test("non-zero exit is returned, not thrown", async () => {
    const r = await runAccept("echo nope >&2; exit 3", { cwd: process.cwd() });
    expect(r.exit).toBe(3);
    expect(r.stderr.trim()).toBe("nope");
  });

  test("timeout kills the command and reports it", async () => {
    const r = await runAccept("sleep 5", { cwd: process.cwd(), timeoutMs: 200 });
    expect(r.timedOut).toBe(true);
    expect(r.exit).not.toBe(0);
    expect(r.durationMs).toBeLessThan(2000);
  });

  test("timeout kills grandchildren that hold the pipes (dash forks, bash execs)", async () => {
    // `sleep 5 & wait` guarantees a forked child under either shell.
    const r = await runAccept("sleep 5 & wait", { cwd: process.cwd(), timeoutMs: 200 });
    expect(r.timedOut).toBe(true);
    expect(r.durationMs).toBeLessThan(2000);
  });
});
