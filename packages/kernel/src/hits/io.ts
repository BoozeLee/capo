import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import { hitPath } from "../capo-dir.js";
import type { Result } from "../result.js";
import { err } from "../result.js";
import type { Hit } from "./schema.js";
import { type HitValidationError, validateHit } from "./validate.js";

export async function loadHit(
  capoDir: string,
  slug: string,
): Promise<Result<Hit, HitValidationError[]>> {
  let text: string;
  try {
    text = await readFile(hitPath(capoDir, slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return err([{ path: "", message: `hit ${slug} not found` }]);
    }
    throw error;
  }
  return validateHit(parse(text));
}

export async function saveHit(capoDir: string, hit: Hit): Promise<void> {
  await writeFile(hitPath(capoDir, hit.id), stringify(hit), "utf8");
}

export async function listHits(capoDir: string): Promise<string[]> {
  try {
    const entries = await readdir(path.join(capoDir, "hits"));
    return entries
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
