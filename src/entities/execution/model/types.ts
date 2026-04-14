export type ExecutionStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "rollback_available"
  | "stopped";

export type RemoteExecutionStatus = Exclude<ExecutionStatus, "idle">;
