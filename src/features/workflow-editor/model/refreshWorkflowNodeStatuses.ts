import { workflowApi, workflowKeys } from "@/entities/workflow";
import { queryClient } from "@/shared";

import { toNodeStatusMap } from "./workflow-editor-adapter";
import { useWorkflowStore } from "./workflowStore";

type RefreshWorkflowNodeStatusesParams = {
  nodeId?: string | null;
  workflowId: string | null | undefined;
};

export const refreshWorkflowNodeStatuses = async ({
  nodeId,
  workflowId,
}: RefreshWorkflowNodeStatusesParams) => {
  if (!workflowId) {
    return;
  }

  const workflow = await workflowApi.getById(workflowId);
  const nodeStatuses = toNodeStatusMap(workflow.nodeStatuses);
  const store = useWorkflowStore.getState();

  if (store.workflowId === workflowId) {
    store.syncNodeStatuses(nodeStatuses);
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
