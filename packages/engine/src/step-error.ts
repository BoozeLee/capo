export class StepExecutionError extends Error {
  readonly exitCode?: number;

  constructor(message: string, exitCode?: number) {
    super(message);
    this.name = "StepExecutionError";
    this.exitCode = exitCode;
  }
}
