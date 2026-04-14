import { type ExecutionStatus } from "./types";

const POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_EXECUTION_POLL_INTERVAL_MS ?? 3000,
);

export const executionPollInterval = POLL_INTERVAL_MS;

export const normalizeExecutionStatus = (
  state: string | null | undefined,
): ExecutionStatus => {
  switch (state?.toLowerCase()) {
    case "pending":
    case "running":
    case "success":
    case "failed":
    case "rollback_available":
    case "stopped":
      return state.toLowerCase() as ExecutionStatus;
    default:
      return "idle";
  }
};

export const isExecutionInFlight = (state: string | null | undefined) => {
  const normalized = normalizeExecutionStatus(state);

  return normalized === "pending" || normalized === "running";
};

export const getLatestExecution = <T extends { startedAt: string | null }>(
  executions: T[] | undefined,
) =>
  executions?.slice().sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;

    return rightTime - leftTime;
  })[0] ?? null;
