export interface FamilyIo {
  readonly cwd: string;
  stdout(line: string): void;
  stderr(line: string): void;
  readonly now?: () => string;
}

export interface FamilyFlags {
  readonly json: boolean;
  readonly kind?: string;
  readonly payload?: string;
  readonly note?: string;
  readonly budget?: number;
  readonly actor?: string;
  readonly to?: number;
}

export function emit(io: FamilyIo, flags: FamilyFlags, value: unknown, text: () => string): void {
  io.stdout(flags.json ? JSON.stringify(value) : text());
}

export function fail(io: FamilyIo, message: string, code = 2): number {
  io.stderr(message);
  return code;
}
