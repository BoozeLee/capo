const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export function validateProjectName(name: string): string | null {
  if (name.length === 0) {
    return "name must not be empty";
  }
  if (!NAME_PATTERN.test(name)) {
    return `name must match ^[a-z0-9][a-z0-9._-]{0,99}$ (got "${name}")`;
  }
  return null;
}
