import { executeWorkflowAPI } from "./execute-workflow.api";
import { getExecutionListAPI } from "./get-execution-list.api";
import { getExecutionNodeDataAPI } from "./get-execution-node-data.api";
import { getExecutionAPI } from "./get-execution.api";
import { getLatestExecutionNodeDataAPI } from "./get-latest-execution-node-data.api";
import { getLatestExecutionAPI } from "./get-latest-execution.api";
import { rollbackExecutionAPI } from "./rollback-execution.api";
import { stopExecutionAPI } from "./stop-execution.api";

export * from "./types";

export const executionApi = {
  execute: executeWorkflowAPI,
  getList: getExecutionListAPI,
  getById: getExecutionAPI,
  getLatest: getLatestExecutionAPI,
  getNodeData: getExecutionNodeDataAPI,
  getLatestNodeData: getLatestExecutionNodeDataAPI,
  rollback: rollbackExecutionAPI,
  stop: stopExecutionAPI,
};
