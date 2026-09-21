import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import { type Hit, HitSchema } from "./schema.js";

export interface HitValidationError {
  readonly path: string;
  readonly message: string;
}

function findCycle(nodes: Hit["nodes"]): string[] | null {
  const deps = new Map(nodes.map((n) => [n.id, n.depends_on]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === "done") return null;
    if (s === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const d of deps.get(id) ?? []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  };
  for (const n of nodes) {
    const c = visit(n.id);
    if (c) return c;
  }
  return null;
}

/** Schema + graph rules. Errors are collected, not thrown; the first is the most severe. */
export function validateHit(raw: unknown): Result<Hit, HitValidationError[]> {
  const parsed = HitSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  const hit = parsed.data;
  const errors: HitValidationError[] = [];
  const ids = new Set<string>();
  for (const [i, n] of hit.nodes.entries()) {
    const at = `nodes.${i}`;
    if (ids.has(n.id)) errors.push({ path: at, message: `duplicate node id ${n.id}` });
    ids.add(n.id);
    if (n.accept === undefined && !n.human_verify) {
      errors.push({ path: at, message: `node ${n.id} needs accept or human_verify: true` });
    }
    if (n.human_verify && n.human_verify_reason === undefined) {
      errors.push({ path: at, message: `node ${n.id} has human_verify without a reason` });
    }
  }
  for (const [i, n] of hit.nodes.entries()) {
    for (const d of n.depends_on) {
      if (!ids.has(d)) errors.push({ path: `nodes.${i}`, message: `unknown node ${d}` });
    }
  }
  if (errors.length === 0) {
    const cycle = findCycle(hit.nodes);
    if (cycle) errors.push({ path: "nodes", message: `dependency cycle: ${cycle.join(" -> ")}` });
  }
  return errors.length > 0 ? err(errors) : ok(hit);
}
