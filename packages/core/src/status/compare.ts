import type { CapoManifest } from "../manifest/schema.js";
import type { Tech, TechId } from "../types/tech.js";

export interface PackageJsonLike {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export interface TechStatus {
  readonly tech: TechId;
  readonly installed: boolean;
  readonly missingPackages: readonly string[];
}

export function compareInstalled(
  manifest: CapoManifest,
  packageJson: PackageJsonLike,
  catalog: Record<TechId, Tech>,
): TechStatus[] {
  const installedPackages = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  return manifest.stack.members.map((tech) => {
    const missingPackages = catalog[tech].packages.filter((pkg) => !installedPackages.has(pkg));
    return { tech, installed: missingPackages.length === 0, missingPackages };
  });
}
