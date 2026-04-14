export type ExecutionRunStatus = "pending" | "running" | "success" | "failed";

export interface ExecutionErrorDetail {
  code: string | null;
  message: string | null;
  stackTrace: string | null;
}

export interface ExecutionSnapshot {
  nodeId?: string | null;
  nodeType?: string | null;
  config?: Record<string, unknown> | null;
  inputDataType?: string | null;
  outputDataType?: string | null;
}

export interface ExecutionLog {
  id: string;
  nodeId: string;
  status: string;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExecutionDetail {
  id: string;
  workflowId: string;
  userId?: string | null;
  state: string;
  nodeLogs: ExecutionLog[];
  startedAt: string | null;
  finishedAt: string | null;
}
