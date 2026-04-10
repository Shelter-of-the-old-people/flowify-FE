import { useMutation, useQuery } from "@tanstack/react-query";

import { executionApi } from "../api";
import { QUERY_KEYS } from "../constants";
import { queryClient } from "../libs";

const POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_EXECUTION_POLL_INTERVAL_MS ?? 3000,
);

export const normalizeExecutionStatus = (state: string | null | undefined) => {
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

  return "pending" as const;
};

export const useWorkflowExecutionsQuery = (
  workflowId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: workflowId
      ? QUERY_KEYS.executions(workflowId)
      : ["workflows", "executions", "unknown"],
    queryFn: async () => {
      if (!workflowId) {
        throw new Error("workflow id is required");
      }

      const response = await executionApi.getList(workflowId);
      return response.data.data;
    },
    enabled: Boolean(workflowId) && enabled,
    refetchInterval: (query) => {
      const executions = query.state.data;
      if (!executions?.length) {
        return false;
      }

      const isRunning = executions.some((execution) => {
        const status = normalizeExecutionStatus(execution.state);
        return status === "pending" || status === "running";
      });

      return isRunning ? POLL_INTERVAL_MS : false;
    },
    throwOnError: false,
  });

export const useWorkflowExecutionQuery = (
  workflowId: string | undefined,
  executionId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey:
      workflowId && executionId
        ? QUERY_KEYS.execution(workflowId, executionId)
        : ["workflows", "execution", "unknown"],
    queryFn: async () => {
      if (!workflowId || !executionId) {
        throw new Error("workflow id and execution id are required");
      }

      const response = await executionApi.getById(workflowId, executionId);
      return response.data.data;
    },
    enabled: Boolean(workflowId && executionId) && enabled,
    refetchInterval: (query) => {
      const execution = query.state.data;
      if (!execution) {
        return false;
      }

      const status = normalizeExecutionStatus(execution.state);
      return status === "pending" || status === "running"
        ? POLL_INTERVAL_MS
        : false;
    },
    throwOnError: false,
  });

export const useExecuteWorkflowMutation = () =>
  useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await executionApi.execute(workflowId);
      return response.data.data;
    },
    onSuccess: async (_, workflowId) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.executions(workflowId),
      });
    },
  });

export const useRollbackExecutionMutation = () =>
  useMutation({
    mutationFn: async ({
      workflowId,
      executionId,
      nodeId,
    }: {
      workflowId: string;
      executionId: string;
      nodeId?: string;
    }) => {
      const response = await executionApi.rollback(
        workflowId,
        executionId,
        nodeId,
      );
      return response.data.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.executions(variables.workflowId),
      });
    },
  });

export const getLatestExecution = <T extends { startedAt: string | null }>(
  executions: T[] | undefined,
) =>
  executions?.slice().sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;

    return rightTime - leftTime;
  })[0] ?? null;
