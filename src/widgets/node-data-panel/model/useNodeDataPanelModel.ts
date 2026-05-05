import { useCallback, useEffect, useMemo } from "react";

import {
  getDataTypeDisplayLabel,
  useLatestExecutionNodeDataQuery,
  useWorkflowNodePreviewMutation,
  useWorkflowNodeSchemaPreviewQuery,
} from "@/entities";
import { type FlowNodeData } from "@/entities/node";
import { useWorkflowStore } from "@/features/workflow-editor";

import {
  getPanelData,
  getPreviewPanelData,
  isEmptyPanelData,
  resolveNodeDataPanelState,
} from "./node-data-panel-utils";
import { type NodeDataPanelKind, type NodeDataPanelModel } from "./types";

type UseNodeDataPanelModelParameters = {
  panelKind: NodeDataPanelKind;
  workflowId: string | undefined;
  nodeId: string | null;
  canViewExecutionData: boolean;
  isWorkflowDirty: boolean;
};

const getDataTypeLabel = (dataType: FlowNodeData["outputTypes"][number]) =>
  getDataTypeDisplayLabel(dataType) ?? "데이터";

export const useNodeDataPanelModel = ({
  panelKind,
  workflowId,
  nodeId,
  canViewExecutionData,
  isWorkflowDirty,
}: UseNodeDataPanelModelParameters): NodeDataPanelModel => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === nodeId) ?? null,
    [nodeId, nodes],
  );
  const sourceNode = useMemo(() => {
    if (!nodeId) {
      return null;
    }

    const incomingEdge = edges.find((edge) => edge.target === nodeId);
    if (!incomingEdge) {
      return null;
    }

    return nodes.find((node) => node.id === incomingEdge.source) ?? null;
  }, [edges, nodeId, nodes]);

  const isStartNode = Boolean(nodeId && nodeId === startNodeId);
  const isEndNode = Boolean(nodeId && nodeId === endNodeId);
  const executionDataQuery = useLatestExecutionNodeDataQuery(
    workflowId,
    nodeId ?? undefined,
    {
      enabled: Boolean(workflowId && nodeId && canViewExecutionData),
      showErrorToast: false,
    },
  );
  const schemaPreviewQuery = useWorkflowNodeSchemaPreviewQuery(
    workflowId,
    nodeId ?? undefined,
    {
      enabled: Boolean(workflowId && nodeId),
      showErrorToast: false,
    },
  );
  const {
    data: nodePreviewData = null,
    error: nodePreviewError,
    isPending: isPreviewLoading,
    mutate: previewNode,
    reset: resetNodePreview,
  } = useWorkflowNodePreviewMutation({
    showErrorToast: false,
  });

  useEffect(() => {
    resetNodePreview();
  }, [nodeId, panelKind, resetNodePreview, workflowId]);

  const executionData = executionDataQuery.data ?? null;
  const schemaPreview = schemaPreviewQuery.data ?? null;
  const previewDataToDisplay = getPreviewPanelData(
    panelKind,
    nodePreviewData,
    isStartNode,
  );
  const executionDataToDisplay = getPanelData(
    panelKind,
    executionData,
    isStartNode,
  );
  const dataToDisplay = previewDataToDisplay ?? executionDataToDisplay;
  const schemaToDisplay =
    panelKind === "input"
      ? (schemaPreview?.input?.schema ?? null)
      : (schemaPreview?.output?.schema ?? null);
  const schemaPreviewLabel =
    panelKind === "input"
      ? (schemaPreview?.input?.label ?? null)
      : (schemaPreview?.output?.label ?? null);
  const staticInputLabel =
    sourceNode?.data.outputTypes[0] !== undefined
      ? getDataTypeLabel(sourceNode.data.outputTypes[0])
      : null;
  const staticOutputLabel =
    activeNode?.data.outputTypes[0] !== undefined
      ? getDataTypeLabel(activeNode.data.outputTypes[0])
      : null;
  const isPreviewDataDisplayed = !isEmptyPanelData(previewDataToDisplay);
  const canRequestPreview = Boolean(
    workflowId &&
    nodeId &&
    activeNode &&
    canViewExecutionData &&
    !isWorkflowDirty,
  );
  const requestPreview = useCallback(() => {
    if (!workflowId || !nodeId || !canRequestPreview) {
      return;
    }

    previewNode({
      workflowId,
      nodeId,
      limit: 5,
      includeContent: false,
    });
  }, [canRequestPreview, nodeId, previewNode, workflowId]);
  const state = isPreviewDataDisplayed
    ? "data-ready"
    : resolveNodeDataPanelState({
        hasActiveNode: Boolean(activeNode),
        canViewExecutionData,
        isExecutionDataLoading:
          executionDataQuery.isLoading || isPreviewLoading,
        isExecutionDataError: executionDataQuery.isError,
        executionData,
        dataToDisplay,
      });
  const previewErrorMessage =
    nodePreviewData && !nodePreviewData.available
      ? (nodePreviewData.reason ?? "PREVIEW_UNAVAILABLE")
      : (nodePreviewError?.message ?? null);

  return {
    activeNode,
    sourceNode,
    isStartNode,
    isEndNode,
    staticInputLabel,
    staticOutputLabel,
    executionData,
    nodePreviewData,
    schemaPreview,
    state,
    dataToDisplay,
    schemaToDisplay,
    schemaPreviewLabel,
    canViewExecutionData,
    isExecutionDataLoading: executionDataQuery.isLoading,
    isPreviewLoading,
    isSchemaPreviewLoading: schemaPreviewQuery.isLoading,
    isStaleAgainstCurrentEditor: isWorkflowDirty,
    isPreviewDataDisplayed,
    canRequestPreview,
    previewErrorMessage,
    requestPreview,
  };
};
