#!/usr/bin/env bash
# Drop-in install per plugin/README.md: skills + agents go to ~/.claude, and the
# `capo` binary is linked so the skills' `!`capo …`` blocks resolve in any repo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p ~/.claude/skills ~/.claude/agents ~/.local/bin
for s in "$ROOT"/plugin/skills/*/; do
  name="$(basename "$s")"
  rm -rf ~/.claude/skills/"$name"
  ln -s "${s%/}" ~/.claude/skills/"$name"
done
for a in "$ROOT"/plugin/agents/*.md; do
  ln -sf "$a" ~/.claude/agents/"$(basename "$a")"
done
(cd "$ROOT" && pnpm install --frozen-lockfile >/dev/null && pnpm run build >/dev/null)
ln -sf "$ROOT/packages/cli/dist/cli.js" ~/.local/bin/capo
chmod +x "$ROOT/packages/cli/dist/cli.js"
command -v capo >/dev/null || echo "warn: ~/.local/bin is not on PATH" >&2
echo "installed: $(ls ~/.claude/skills | tr '\n' ' ')"
