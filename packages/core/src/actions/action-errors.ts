export class ActionCancelledError extends Error {
  constructor(message = "Action cancelled") {
    super(message);
    this.name = "ActionCancelledError";
  }
}

/** A subprocess execution died without producing a result envelope. */
export class ActionWorkerExitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionWorkerExitError";
  }
}

/** The main process refused to create another action worker because doing so
 * would exceed the instance-wide process budget. Callers must surface or
 * retry this at their own scheduling boundary; waiting inside a nested action
 * would retain its ancestor workers and can deadlock the execution tree. */
export class ActionWorkerCapacityError extends Error {
  constructor(maxWorkerProcesses: number) {
    super(`Action worker capacity reached (max ${maxWorkerProcesses} live workers)`);
    this.name = "ActionWorkerCapacityError";
  }
}
