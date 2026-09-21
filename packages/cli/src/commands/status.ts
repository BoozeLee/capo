import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CATALOG,
  type CapoManifest,
  type PackageJsonLike,
  type TechId,
  type TechStatus,
  compareInstalled,
  fromYaml,
} from "@capo/core";

export interface StatusOptions {
  readonly cwd: string;
  readonly tech?: string;
}

export interface StatusCommandOptions extends StatusOptions {
  readonly json: boolean;
}

export type StatusError =
  | { readonly code: "NO_MANIFEST"; readonly path: string }
  | { readonly code: "INVALID_MANIFEST"; readonly path: string; readonly reason: string }
  | { readonly code: "NO_PACKAGE_JSON"; readonly path: string }
  | { readonly code: "INVALID_PACKAGE_JSON"; readonly path: string; readonly reason: string }
  | { readonly code: "UNKNOWN_TECH"; readonly id: string }
  | { readonly code: "NOT_IN_STACK"; readonly tech: TechId };

export type StatusResult =
  | { readonly ok: true; readonly rows: readonly TechStatus[] }
  | { readonly ok: false; readonly error: StatusError };

type Loaded<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: StatusError };

function reason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function loadManifest(cwd: string): Loaded<CapoManifest> {
  const file = path.join(cwd, "capo.yaml");
  if (!existsSync(file)) return { ok: false, error: { code: "NO_MANIFEST", path: file } };
  try {
    return { ok: true, value: fromYaml(readFileSync(file, "utf8")) };
  } catch (e) {
    return { ok: false, error: { code: "INVALID_MANIFEST", path: file, reason: reason(e) } };
  }
}

function isDepMap(v: unknown): v is Record<string, string> | undefined {
  return v === undefined || (typeof v === "object" && v !== null && !Array.isArray(v));
}

// JSON.parse gives `any`; a string-valued `dependencies` would silently yield index keys.
function asPackageJson(v: unknown): PackageJsonLike | undefined {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
  const { dependencies, devDependencies } = v as Record<string, unknown>;
  if (!isDepMap(dependencies) || !isDepMap(devDependencies)) return undefined;
  return { dependencies, devDependencies };
}

function loadPackageJson(cwd: string): Loaded<PackageJsonLike> {
  const file = path.join(cwd, "package.json");
  if (!existsSync(file)) return { ok: false, error: { code: "NO_PACKAGE_JSON", path: file } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { ok: false, error: { code: "INVALID_PACKAGE_JSON", path: file, reason: reason(e) } };
  }
  const value = asPackageJson(parsed);
  if (!value) {
    const why = "dependencies and devDependencies must be objects when present";
    return { ok: false, error: { code: "INVALID_PACKAGE_JSON", path: file, reason: why } };
  }
  return { ok: true, value };
}

function isTechId(id: string): id is TechId {
  return Object.hasOwn(CATALOG, id);
}

export function buildStatus(opts: StatusOptions): StatusResult {
  const manifest = loadManifest(opts.cwd);
  if (!manifest.ok) return manifest;
  const packageJson = loadPackageJson(opts.cwd);
  if (!packageJson.ok) return packageJson;

  const rows = compareInstalled(manifest.value, packageJson.value, CATALOG);
  if (opts.tech === undefined) return { ok: true, rows };

  if (!isTechId(opts.tech)) return { ok: false, error: { code: "UNKNOWN_TECH", id: opts.tech } };
  const row = rows.find((r) => r.tech === opts.tech);
  if (!row) return { ok: false, error: { code: "NOT_IN_STACK", tech: opts.tech } };
  return { ok: true, rows: [row] };
}

export function describeStatusError(error: StatusError): string {
  switch (error.code) {
    case "NO_MANIFEST":
      return `no capo.yaml at ${error.path} — this is not a capo project`;
    case "INVALID_MANIFEST":
      return `capo.yaml at ${error.path} is not a valid manifest: ${error.reason}`;
    case "NO_PACKAGE_JSON":
      return `no package.json at ${error.path}`;
    case "INVALID_PACKAGE_JSON":
      return `package.json at ${error.path} is not valid JSON: ${error.reason}`;
    case "UNKNOWN_TECH":
      return `unknown tech "${error.id}"`;
    case "NOT_IN_STACK":
      return `${error.tech} is not in this project's family — see capo.yaml`;
  }
}

function describeRow(row: TechStatus): string {
  return row.installed
    ? `✅ ${row.tech}`
    : `❌ ${row.tech} — missing: ${row.missingPackages.join(", ")}`;
}

export function runStatusCommand(opts: StatusCommandOptions): number {
  const result = buildStatus(opts);

  if (!result.ok) {
    if (opts.json) {
      console.log(JSON.stringify({ error: result.error }));
    } else {
      console.error(`❌ ${describeStatusError(result.error)}`);
    }
    return 2;
  }

  if (opts.json) {
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    for (const row of result.rows) console.log(describeRow(row));
  }
  return 0;
}
