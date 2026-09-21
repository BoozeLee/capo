import type { CapoManifest } from "../manifest/schema.js";
import { toYaml } from "../manifest/serialize.js";
import type { Step } from "../types/plan.js";
import type { ResolvedStack } from "../types/stack.js";

export function finalizeSteps(
  stack: ResolvedStack,
  name: string,
  coreVersion: string,
  owned: Readonly<Record<string, readonly string[]>>,
  createdAt: string,
): Step[] {
  const manifest: CapoManifest = {
    version: 1,
    name,
    createdAt,
    capo: { version: coreVersion, coreVersion },
    stack: {
      framework: stack.framework,
      members: [...stack.members],
      options: stack.options,
    },
    owned: Object.fromEntries(Object.entries(owned).map(([tech, files]) => [tech, [...files]])),
  };

  return [
    {
      id: "capo-manifest",
      tech: "capo",
      label: "Write capo.yaml",
      kind: "writeFile",
      path: "capo.yaml",
      contents: toYaml(manifest),
      ifExists: "overwrite",
    },
    {
      id: "capo-git-init",
      tech: "capo",
      label: "git init",
      kind: "run",
      cmd: "git",
      args: ["init"],
      cwd: "project",
      timeoutMs: 30_000,
    },
    {
      id: "capo-git-add",
      tech: "capo",
      label: "git add",
      kind: "run",
      cmd: "git",
      args: ["add", "-A"],
      cwd: "project",
      timeoutMs: 30_000,
    },
    {
      id: "capo-git-commit",
      tech: "capo",
      label: "git commit",
      kind: "run",
      cmd: "git",
      args: ["commit", "-m", "capo: la famiglia"],
      cwd: "project",
      timeoutMs: 30_000,
    },
  ];
}
