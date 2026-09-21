import type { FamilyFlags, FamilyIo } from "./output.js";

export interface FamilyCtx {
  readonly capoDir: string;
  readonly io: FamilyIo;
  readonly flags: FamilyFlags;
}
