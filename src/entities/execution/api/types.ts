import { type RemoteExecutionStatus } from "../model/types";

export type ExecutionRunStatus = RemoteExecutionStatus;

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
  nodeId: string;
  status: string | null;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  state: ExecutionRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  nodeCount: number;
  completedNodeCount: number;
}

export interface ExecutionDetail extends ExecutionSummary {
  nodeLogs: ExecutionLog[];
}

export type NodeDataUnavailableReason =
  | "NO_EXECUTION"
  | "EXECUTION_RUNNING"
  | "NODE_NOT_EXECUTED"
  | "NODE_SKIPPED"
  | "NODE_FAILED"
  | "DATA_EMPTY";

export interface ExecutionNodeData {
  executionId: string | null;
  workflowId: string;
  nodeId: string;
  status: string | null;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
  available: boolean;
  reason: NodeDataUnavailableReason | string | null;
}
