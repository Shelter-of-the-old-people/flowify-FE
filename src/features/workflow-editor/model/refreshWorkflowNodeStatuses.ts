import {
  type WorkflowResponse,
  workflowApi,
  workflowKeys,
} from "@/entities/workflow";
import { queryClient } from "@/shared";

import { toNodeStatusMap } from "./workflow-editor-adapter";
import { useWorkflowStore } from "./workflowStore";

const OAUTH_NODE_STATUS_REFRESH_KEY = "oauthNodeStatusRefresh";

type RefreshWorkflowNodeStatusesParams = {
  clearCachedPreviews?: boolean;
  nodeId?: string | null;
  workflowId: string | null | undefined;
};

type PendingOAuthNodeStatusRefresh = {
  nodeId: string | null;
  workflowId: string;
};

const isPendingOAuthNodeStatusRefresh = (
  value: unknown,
): value is PendingOAuthNodeStatusRefresh => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.workflowId === "string" &&
    (typeof record.nodeId === "string" || record.nodeId === null)
  );
};

export const storePendingOAuthNodeStatusRefresh = ({
  nodeId,
  workflowId,
}: RefreshWorkflowNodeStatusesParams) => {
  if (!workflowId) {
    return;
  }

  sessionStorage.setItem(
    OAUTH_NODE_STATUS_REFRESH_KEY,
    JSON.stringify({
      nodeId: nodeId ?? null,
      workflowId,
    }),
  );
};

export const consumePendingOAuthNodeStatusRefresh = () => {
  const storedValue = sessionStorage.getItem(OAUTH_NODE_STATUS_REFRESH_KEY);
  sessionStorage.removeItem(OAUTH_NODE_STATUS_REFRESH_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    return isPendingOAuthNodeStatusRefresh(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
};

export const refreshWorkflowNodeStatuses = async ({
  clearCachedPreviews = false,
  nodeId,
  workflowId,
}: RefreshWorkflowNodeStatusesParams) => {
  if (!workflowId) {
    return;
  }

  const workflow = await workflowApi.getById(workflowId);
  const nodeStatuses = toNodeStatusMap(workflow.nodeStatuses);
  const store = useWorkflowStore.getState();

  queryClient.setQueryData<WorkflowResponse>(
    workflowKeys.detail(workflowId),
    (current) =>
      current
        ? {
            ...current,
            nodeStatuses: workflow.nodeStatuses,
          }
        : workflow,
  );

  if (store.workflowId === workflowId) {
    store.syncNodeStatuses(nodeStatuses);
  }

  if (clearCachedPreviews) {
    queryClient.removeQueries({
      exact: true,
      queryKey: workflowKeys.schemaPreview(workflowId),
    });

    if (nodeId) {
      queryClient.removeQueries({
        exact: true,
        queryKey: workflowKeys.nodeSchemaPreview(workflowId, nodeId),
      });
    }

    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: workflowKeys.schemaPreview(workflowId),
    }),
    nodeId
      ? queryClient.invalidateQueries({
          queryKey: workflowKeys.nodeSchemaPreview(workflowId, nodeId),
        })
      : Promise.resolve(),
  ]);
};
