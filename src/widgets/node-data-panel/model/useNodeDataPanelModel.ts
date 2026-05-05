import { useMemo } from "react";

import {
  getDataTypeDisplayLabel,
  useLatestExecutionNodeDataQuery,
  useWorkflowNodeSchemaPreviewQuery,
} from "@/entities";
import { type FlowNodeData } from "@/entities/node";
import { useWorkflowStore } from "@/features/workflow-editor";

import {
  getPanelData,
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
  const executionData = executionDataQuery.data ?? null;
  const schemaPreview = schemaPreviewQuery.data ?? null;
  const dataToDisplay = getPanelData(panelKind, executionData, isStartNode);
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
  const state = resolveNodeDataPanelState({
    hasActiveNode: Boolean(activeNode),
    canViewExecutionData,
    isExecutionDataLoading: executionDataQuery.isLoading,
    isExecutionDataError: executionDataQuery.isError,
    executionData,
    dataToDisplay,
  });

  return {
    activeNode,
    sourceNode,
    isStartNode,
    isEndNode,
    staticInputLabel,
    staticOutputLabel,
    executionData,
    schemaPreview,
    state,
    dataToDisplay,
    schemaToDisplay,
    schemaPreviewLabel,
    canViewExecutionData,
    isExecutionDataLoading: executionDataQuery.isLoading,
    isSchemaPreviewLoading: schemaPreviewQuery.isLoading,
    isStaleAgainstCurrentEditor: isWorkflowDirty,
  };
};
