import type { ExecutionStatus } from "../workflowStore";

const POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_EXECUTION_POLL_INTERVAL_MS ?? 3000,
);

export const executionPollInterval = POLL_INTERVAL_MS;

export const normalizeExecutionStatus = (
  state: string | null | undefined,
): ExecutionStatus => {
  const normalized = state?.toLowerCase() ?? "";

  if (normalized.includes("success") || normalized.includes("complete")) {
    return "success" as const;
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return "failed" as const;
  }

  if (normalized.includes("run")) {
    return "running" as const;
  }

  if (normalized.includes("pending") || normalized.includes("queue")) {
    return "running" as const;
  }

  return "idle" as const;
};

export const isExecutionInFlight = (state: string | null | undefined) => {
  const normalized = state?.toLowerCase() ?? "";

  return (
    normalized.includes("pending") ||
    normalized.includes("queue") ||
    normalized.includes("run")
  );
};

export const getLatestExecution = <T extends { startedAt: string | null }>(
  executions: T[] | undefined,
) =>
  executions?.slice().sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;

    return rightTime - leftTime;
  })[0] ?? null;
