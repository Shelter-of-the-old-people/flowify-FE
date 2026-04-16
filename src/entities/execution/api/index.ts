import { executeWorkflowAPI } from "./execute-workflow.api";
import { getExecutionListAPI } from "./get-execution-list.api";
import { getExecutionAPI } from "./get-execution.api";
import { rollbackExecutionAPI } from "./rollback-execution.api";
import { stopExecutionAPI } from "./stop-execution.api";

export * from "./types";

export const executionApi = {
  execute: executeWorkflowAPI,
  getList: getExecutionListAPI,
  getById: getExecutionAPI,
  rollback: rollbackExecutionAPI,
  stop: stopExecutionAPI,
};
