import { parse, stringify } from "yaml";
import { type CapoManifest, CapoManifestSchema } from "./schema.js";

export function toYaml(manifest: CapoManifest): string {
  return stringify(manifest);
}

export function fromYaml(text: string): CapoManifest {
  return CapoManifestSchema.parse(parse(text));
}
