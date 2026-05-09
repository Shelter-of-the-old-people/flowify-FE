import { type Edge } from "@xyflow/react";

import {
  type DataType,
  type FlowNodeData,
  type NodeType,
} from "@/entities/node";
import {
  type WorkflowResponse,
  findAddedNodeId,
  toBackendDataType,
  toBackendNodeType,
  toNodeAddRequest,
} from "@/entities/workflow";
import {
  type MappingDataTypeKey,
  toDataType,
  toMappingKey,
} from "@/features/choice-panel";

export type WizardNodeSnapshot = {
  authWarning?: boolean;
  config: FlowNodeData["config"];
  inputTypes: DataType[];
  outputTypes: DataType[];
  position: { x: number; y: number };
  role: "start" | "middle" | "end";
  type: NodeType;
};

type ResolveNodeRole = (nodeId: string) => "start" | "middle" | "end";

type UpdateWorkflowNode = (args: {
  workflowId: string;
  nodeId: string;
  body: {
    category?: string;
    type?: string;
    config?: Record<string, unknown>;
    position?: { x: number; y: number };
    dataType?: string | null;
    outputDataType?: string | null;
    role?: "start" | "middle" | "end";
    authWarning?: boolean;
  };
}) => Promise<WorkflowResponse>;

type AddWorkflowNode = (args: {
  workflowId: string;
  body: ReturnType<typeof toNodeAddRequest>;
}) => Promise<WorkflowResponse>;

type DeleteWorkflowNode = (args: {
  workflowId: string;
  nodeId: string;
}) => Promise<WorkflowResponse>;

type FlowNode = {
  id: string;
  position: { x: number; y: number };
  data: {
    type: NodeType;
    config: FlowNodeData["config"];
    inputTypes: DataType[];
    outputTypes: DataType[];
    authWarning?: boolean;
  };
};

export const canSafelyDeleteChoiceWizardLeaf = ({
  edges,
  nodeId,
  resolveNodeRole,
  sessionOwnedLeafNodeIds,
  stagingNodeId,
}: {
  edges: Edge[];
  nodeId: string;
  resolveNodeRole: ResolveNodeRole;
  sessionOwnedLeafNodeIds: string[];
  stagingNodeId: string | null;
}) => {
  if (!sessionOwnedLeafNodeIds.includes(nodeId)) {
    return false;
  }

  if (nodeId === stagingNodeId) {
    return false;
  }

  if (resolveNodeRole(nodeId) !== "middle") {
    return false;
  }

  return !edges.some((edge) => edge.source === nodeId);
};

export const createChoiceWizardNodePersistence = ({
  addWorkflowNode,
  deleteWorkflowNode,
  resolveNodeRole,
  syncWorkflowFromResponse,
  updateWorkflowNode,
  workflowId,
}: {
  addWorkflowNode: AddWorkflowNode;
  deleteWorkflowNode: DeleteWorkflowNode;
  resolveNodeRole: ResolveNodeRole;
  syncWorkflowFromResponse: (workflow: WorkflowResponse) => void;
  updateWorkflowNode: UpdateWorkflowNode;
  workflowId: string | null;
}) => {
  const syncUpdatedNode = (workflow: WorkflowResponse, nodeId: string) => {
    const nextNode = workflow.nodes.find((node) => node.id === nodeId);
    if (!nextNode) {
      throw new Error("node was not updated");
    }

    syncWorkflowFromResponse(workflow);
    return nextNode.id;
  };

  const updatePersistedNode = async ({
    config,
    inputDataTypeKey,
    node,
    outputDataTypeKey,
    position,
    role,
    type,
  }: {
    node: FlowNode;
    type: NodeType;
    config: FlowNodeData["config"];
    inputDataTypeKey?: MappingDataTypeKey | null;
    outputDataTypeKey?: MappingDataTypeKey | null;
    position?: { x: number; y: number };
    role?: "start" | "middle" | "end";
  }) => {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }

    const nextWorkflow = await updateWorkflowNode({
      workflowId,
      nodeId: node.id,
      body: {
        category: toBackendNodeType(type).category,
        type: toBackendNodeType(type).type,
        config: config as unknown as Record<string, unknown>,
        position: position ?? node.position,
        dataType:
          inputDataTypeKey !== undefined
            ? inputDataTypeKey
              ? toBackendDataType(toDataType(inputDataTypeKey))
              : null
            : node.data.inputTypes[0]
              ? toBackendDataType(node.data.inputTypes[0])
              : null,
        outputDataType:
          outputDataTypeKey !== undefined
            ? outputDataTypeKey
              ? toBackendDataType(toDataType(outputDataTypeKey))
              : null
            : node.data.outputTypes[0]
              ? toBackendDataType(node.data.outputTypes[0])
              : null,
        role: role ?? resolveNodeRole(node.id),
        authWarning: node.data.authWarning ?? false,
      },
    });

    return syncUpdatedNode(nextWorkflow, node.id);
  };

  const placeWorkflowNode = async ({
    config,
    inputDataTypeKey,
    label,
    outputDataTypeKey,
    position,
    prevEdgeLabel,
    prevEdgeSourceHandle,
    prevEdgeTargetHandle,
    previousNodes,
    sourceNodeId,
    type,
  }: {
    type: NodeType;
    sourceNodeId: string;
    position: { x: number; y: number };
    previousNodes: FlowNode[];
    inputDataTypeKey?: MappingDataTypeKey | null;
    outputDataTypeKey: MappingDataTypeKey | null;
    config?: Partial<FlowNodeData["config"]>;
    label?: string;
    prevEdgeLabel?: string;
    prevEdgeSourceHandle?: string;
    prevEdgeTargetHandle?: string;
  }) => {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }

    const nextWorkflow = await addWorkflowNode({
      workflowId,
      body: toNodeAddRequest({
        type,
        position,
        label,
        prevNodeId: sourceNodeId,
        prevEdgeLabel,
        prevEdgeSourceHandle,
        prevEdgeTargetHandle,
        config,
        inputTypes: inputDataTypeKey
          ? [toDataType(inputDataTypeKey)]
          : undefined,
        outputTypes: outputDataTypeKey
          ? [toDataType(outputDataTypeKey)]
          : undefined,
      }),
    });

    const addedNodeId =
      findAddedNodeId(previousNodes, nextWorkflow.nodes) ??
      nextWorkflow.nodes.at(-1)?.id ??
      null;
    const addedNode = nextWorkflow.nodes.find(
      (node) => node.id === addedNodeId,
    );

    if (!addedNodeId || !addedNode) {
      return null;
    }

    syncWorkflowFromResponse(nextWorkflow);
    return addedNodeId;
  };

  const removeWorkflowNode = async (nodeId: string) => {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }

    const nextWorkflow = await deleteWorkflowNode({
      workflowId,
      nodeId,
    });
    syncWorkflowFromResponse(nextWorkflow);
  };

  return {
    placeWorkflowNode,
    removeWorkflowNode,
    syncUpdatedNode,
    syncWorkflowFromResponse,
    updatePersistedNode,
  };
};

export const toSnapshotDataTypeKey = (dataType?: DataType | null) =>
  dataType ? toMappingKey(dataType) : null;
