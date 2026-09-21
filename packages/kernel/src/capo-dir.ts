import { access, mkdir } from "node:fs/promises";
import path from "node:path";

export const CAPO_DIR_NAME = ".capo";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Walk up from cwd until a `.capo/` directory is found; null if none. */
export async function findCapoDir(cwd: string): Promise<string | null> {
  let dir = path.resolve(cwd);
  for (;;) {
    const candidate = path.join(dir, CAPO_DIR_NAME);
    if (await exists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Create `<cwd>/.capo` and `<cwd>/.capo/hits` if missing; returns the `.capo` path. */
export async function ensureCapoDir(cwd: string): Promise<string> {
  const dir = path.join(path.resolve(cwd), CAPO_DIR_NAME);
  await mkdir(path.join(dir, "hits"), { recursive: true });
  return dir;
}

export function ledgerPath(capoDir: string): string {
  return path.join(capoDir, "ledger.jsonl");
}

export function booksPath(capoDir: string): string {
  return path.join(capoDir, "books.md");
}

export function hitPath(capoDir: string, slug: string): string {
  return path.join(capoDir, "hits", `${slug}.yaml`);
}
