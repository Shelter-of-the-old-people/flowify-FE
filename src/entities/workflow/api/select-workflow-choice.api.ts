import { request } from "@/shared/api/core";

import { toSelectWorkflowChoicePayload } from "./choice-payload-adapter";
import {
  type NodeSelectionResult,
  type SelectWorkflowChoiceCommand,
  type SelectWorkflowChoiceTransportMeta,
} from "./types";

export const selectWorkflowChoiceAPI = (
  workflowId: string,
  prevNodeId: string,
  command: SelectWorkflowChoiceCommand,
  transportMeta?: SelectWorkflowChoiceTransportMeta,
): Promise<NodeSelectionResult> =>
  request<NodeSelectionResult>({
    url: `/workflows/${workflowId}/choices/${prevNodeId}/select`,
    method: "POST",
    data: toSelectWorkflowChoicePayload(command, transportMeta),
  });
