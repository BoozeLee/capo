import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  checkScope,
  hitPath,
  loadHit,
  materialize,
  nextRunnable,
  runAccept,
  validateHit,
} from "@capo/kernel";
import { parse } from "yaml";
import type { FamilyCtx } from "./ctx.js";
import { readLive } from "./ledger.js";
import { emit, fail } from "./output.js";
import { FAMILY_USAGE } from "./usage.js";

const ACCEPT_TIMEOUT_MS = 10 * 60 * 1000;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const CAPO_STATE = /(^|\/)\.capo\//;

/**
 * Tracked changes vs HEAD plus untracked files, relative to the repo root. `.capo/` is the
 * kernel's own state (ledger, hit lists, Books) and never counts as a soldier's edit.
 */
export function changedFiles(cwd: string): string[] {
  const root = git(cwd, ["rev-parse", "--show-toplevel"]);
  const tracked = git(root, ["diff", "--name-only", "HEAD"]);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  return `${tracked}\n${untracked}`
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !CAPO_STATE.test(l));
}

async function validate(ctx: FamilyCtx, slug: string): Promise<number> {
  let raw: unknown;
  try {
    raw = parse(await readFile(hitPath(ctx.capoDir, slug), "utf8"));
  } catch {
    const rel = path.relative(ctx.io.cwd, hitPath(ctx.capoDir, slug));
    return fail(ctx.io, `hit ${slug} not found at ${rel}`);
  }
  const r = validateHit(raw);
  if (!r.ok) {
    emit(ctx.io, ctx.flags, { ok: false, errors: r.error }, () =>
      r.error.map((e) => `${e.path}: ${e.message}`).join("\n"),
    );
    return 1;
  }
  emit(
    ctx.io,
    ctx.flags,
    { ok: true, nodes: r.value.nodes.length },
    () => `${slug}: ${r.value.nodes.length} nodes, contracts valid`,
  );
  return 0;
}

export async function runHit(ctx: FamilyCtx, args: readonly string[]): Promise<number> {
  const [sub, slug, nodeId] = args;
  if (!sub || !slug) return fail(ctx.io, FAMILY_USAGE);
  if (sub === "validate") return validate(ctx, slug);

  const loaded = await loadHit(ctx.capoDir, slug);
  if (!loaded.ok) return fail(ctx.io, loaded.error.map((e) => e.message).join("; "));
  const hit = loaded.value;
  const { ledger, all } = await readLive(ctx);
  const actor = ctx.flags.actor ?? "capo";

  if (sub === "next") {
    const node = nextRunnable(hit, materialize(all, [hit]));
    if (!node) {
      emit(ctx.io, ctx.flags, null, () => "nothing runnable: all nodes running, done, failed or blocked");
      return 1;
    }
    emit(
      ctx.io,
      ctx.flags,
      node,
      () =>
        `${node.id}: ${node.goal}\n  scope ${node.write_scope.join(", ")}\n  accept ${node.accept ?? "(human_verify)"}\n  budget ${node.budget}`,
    );
    return 0;
  }

  const node = hit.nodes.find((n) => n.id === nodeId);
  if (!node) return fail(ctx.io, `node ${nodeId ?? "?"} not in hit ${slug}`);

  if (sub === "start") {
    const head = git(ctx.io.cwd, ["rev-parse", "HEAD"]);
    const e = await ledger.append({ actor, kind: "node_start", hit: slug, node: node.id, payload: { head } });
    emit(
      ctx.io,
      ctx.flags,
      e,
      () =>
        `[hit ${slug}/${node.id} | scope: ${node.write_scope.join(",")} | accept: ${node.accept ?? "human_verify"} | budget 0/${node.budget}]`,
    );
    return 0;
  }

  if (sub === "deviation") {
    const note = ctx.flags.note;
    if (!note) return fail(ctx.io, "--note is required: what you need, why, what breaks without it");
    const e = await ledger.append({ actor, kind: "deviation", hit: slug, node: node.id, payload: { note } });
    emit(ctx.io, ctx.flags, e, () => `⚠ ${slug}/${node.id} deviation #${e.seq}: ${note}`);
    return 0;
  }

  if (sub === "done") {
    const scope = checkScope(node, changedFiles(ctx.io.cwd));
    if (!scope.ok) {
      emit(
        ctx.io,
        ctx.flags,
        { status: "scope_violation", scope },
        () =>
          `scope violation — outside: ${scope.outside.join(", ") || "-"}; forbidden: ${scope.forbidden.join(", ") || "-"}`,
      );
      return 3;
    }
    if (node.accept === undefined) {
      emit(
        ctx.io,
        ctx.flags,
        { status: "human_verify", reason: node.human_verify_reason },
        () => `human_verify: ${node.human_verify_reason}`,
      );
      return 0;
    }
    const accept = await runAccept(node.accept, { cwd: ctx.io.cwd, timeoutMs: ACCEPT_TIMEOUT_MS });
    await ledger.append({
      actor,
      kind: "accept_run",
      hit: slug,
      node: node.id,
      payload: { cmd: node.accept, exit: accept.exit, durationMs: accept.durationMs, timedOut: accept.timedOut },
    });
    const status = accept.exit === 0 ? "done" : "failed";
    await ledger.append({
      actor,
      kind: accept.exit === 0 ? "node_done" : "node_failed",
      hit: slug,
      node: node.id,
      payload: { accept_exit: accept.exit, files: changedFiles(ctx.io.cwd) },
    });
    emit(
      ctx.io,
      ctx.flags,
      { status, scope, accept },
      () =>
        `${status.toUpperCase()} — accept exit ${accept.exit} (${accept.durationMs} ms)\n${accept.stdout}${accept.stderr}`,
    );
    return accept.exit;
  }

  return fail(ctx.io, FAMILY_USAGE);
}
