import { type ExecutionNodeData, type NodePreviewResponse } from "@/entities";

import { type NodeDataPanelKind, type NodeDataPanelState } from "./types";

type ResolveNodeDataPanelStateParameters = {
  hasActiveNode: boolean;
  canViewExecutionData: boolean;
  isExecutionDataLoading: boolean;
  isExecutionDataError: boolean;
  executionData: ExecutionNodeData | null;
  dataToDisplay: unknown;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isEmptyPanelData = (value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (isObjectRecord(value)) {
    return Object.keys(value).length === 0;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
};

export const getPanelData = (
  panelKind: NodeDataPanelKind,
  executionData: ExecutionNodeData | null,
  isStartNode: boolean,
) => {
  if (!executionData) {
    return null;
  }

  if (panelKind === "input") {
    return isStartNode
      ? (executionData.inputData ?? executionData.outputData ?? null)
      : (executionData.inputData ?? null);
  }

  return executionData.outputData ?? null;
};

export const getPreviewPanelData = (
  panelKind: NodeDataPanelKind,
  previewData: NodePreviewResponse | null,
  isStartNode: boolean,
) => {
  if (!previewData?.available) {
    return null;
  }

  if (panelKind === "input") {
    return isStartNode
      ? (previewData.outputData ?? previewData.previewData ?? null)
      : (previewData.inputData ?? null);
  }

  return previewData.outputData ?? previewData.previewData ?? null;
};

export const resolveNodeDataPanelState = ({
  hasActiveNode,
  canViewExecutionData,
  isExecutionDataLoading,
  isExecutionDataError,
  executionData,
  dataToDisplay,
}: ResolveNodeDataPanelStateParameters): NodeDataPanelState => {
  if (!hasActiveNode) {
    return "no-node";
  }

  if (!canViewExecutionData) {
    return "permission-denied";
  }

  if (isExecutionDataLoading) {
    return "loading";
  }

  if (isExecutionDataError) {
    return "error";
  }

  if (!executionData) {
    return "no-execution";
  }

  if (executionData.reason === "NO_EXECUTION") {
    return "no-execution";
  }

  if (
    executionData.reason === "EXECUTION_RUNNING" ||
    executionData.status === "pending" ||
    executionData.status === "running"
  ) {
    return "execution-running";
  }

  if (
    executionData.reason === "NODE_SKIPPED" ||
    executionData.status === "skipped"
  ) {
    return "node-skipped";
  }

  if (
    executionData.reason === "NODE_FAILED" ||
    executionData.status === "failed"
  ) {
    return "node-failed";
  }

  if (executionData.reason === "NODE_NOT_EXECUTED") {
    return "node-not-executed";
  }

  if (
    executionData.reason === "DATA_EMPTY" ||
    isEmptyPanelData(dataToDisplay)
  ) {
    return "data-empty";
  }

  return "data-ready";
};
