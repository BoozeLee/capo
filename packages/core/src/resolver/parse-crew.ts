import type { TechId } from "../types/tech.js";

export function parseCrew(csv: string): TechId[] {
  return csv
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) as TechId[];
}
