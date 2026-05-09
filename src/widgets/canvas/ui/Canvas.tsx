import { useCallback, useEffect, useMemo, useState } from "react";
import { type MouseEvent } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import {
  type DefaultEdgeOptions,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { FlowArrowEdge } from "@/entities/connection";
import {
  CalendarNode,
  CommunicationNode,
  ConditionNode,
  DataProcessNode,
  EarlyExitNode,
  FilterNode,
  LLMNode,
  LoopNode,
  MultiOutputNode,
  NextStepChoiceNode,
  NodeEditorProvider,
  NotificationNode,
  OutputFormatNode,
  PlaceholderNode,
  SpreadsheetNode,
  StorageNode,
  TriggerNode,
  WebScrapingNode,
} from "@/entities/node";
import { type NodeType } from "@/entities/node";
import { isDataTypeCompatible } from "@/entities/node";
import { isEndWorkflowNodeId } from "@/entities/node";
import {
  findAddedNodeId,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
} from "@/entities/workflow";
import { getFileTypeBranchPlaceholderSpecs } from "@/features/choice-panel";
import {
  type PlaceholderRoutingMeta,
  hydrateStore,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { getLeafNodeIds } from "@/shared";
import { toaster } from "@/shared/utils/toaster/toaster";

const NODE_GAP_X = 96;
const DEFAULT_ROW_CENTER_Y = 320;
const DEFAULT_FLOW_NODE_WIDTH = 172;
const DEFAULT_FLOW_NODE_HEIGHT = 176;
const PLACEHOLDER_NODE_WIDTH = 100;
const PLACEHOLDER_NODE_HEIGHT = 134;
const NEXT_STEP_CHOICE_NODE_WIDTH = 244;
const NEXT_STEP_CHOICE_NODE_HEIGHT = 148;

type ActiveNextStep = {
  centerY: number;
  id: string;
  position: { x: number; y: number };
  routing?: PlaceholderRoutingMeta | null;
  sourceNodeId: string;
};

const getNextStepPlaceholderId = (nodeId: string) =>
  `placeholder-next-${nodeId}`;

const getTopYFromCenter = (centerY: number, height: number) =>
  centerY - height / 2;

const getCenterYFromTop = (topY: number, height: number) => topY + height / 2;

const getNodeWidth = (node: Node, fallbackWidth = DEFAULT_FLOW_NODE_WIDTH) =>
  node.measured?.width ?? fallbackWidth;

const getNodeHeight = (node: Node, fallbackHeight = DEFAULT_FLOW_NODE_HEIGHT) =>
  node.measured?.height ?? fallbackHeight;

const getNodeFallbackWidth = (node: Node) => {
  if (node.type === "placeholder") return PLACEHOLDER_NODE_WIDTH;
  if (node.type === "next-step-choice") return NEXT_STEP_CHOICE_NODE_WIDTH;
  return DEFAULT_FLOW_NODE_WIDTH;
};

const getNodeFallbackHeight = (node: Node) => {
  if (node.type === "placeholder") return PLACEHOLDER_NODE_HEIGHT;
  if (node.type === "next-step-choice") return NEXT_STEP_CHOICE_NODE_HEIGHT;
  return DEFAULT_FLOW_NODE_HEIGHT;
};

const getNodeCenterY = (
  node: Node,
  fallbackHeight = DEFAULT_FLOW_NODE_HEIGHT,
) =>
  getCenterYFromTop(node.position.y, node.measured?.height ?? fallbackHeight);

const getNodeBounds = (node: Node) => {
  const width = getNodeWidth(node, getNodeFallbackWidth(node));
  const height = getNodeHeight(node, getNodeFallbackHeight(node));

  return {
    minX: node.position.x,
    maxX: node.position.x + width,
    minY: node.position.y,
    maxY: node.position.y + height,
  };
};

const getNodesBoundsCenter = (chainNodes: Node[]) => {
  const bounds = chainNodes.map((node) => getNodeBounds(node));
  const minX = Math.min(...bounds.map((bound) => bound.minX));
  const maxX = Math.max(...bounds.map((bound) => bound.maxX));
  const minY = Math.min(...bounds.map((bound) => bound.minY));
  const maxY = Math.max(...bounds.map((bound) => bound.maxY));

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

const createVirtualPlaceholderNode = (
  id: string,
  x: number,
  centerY: number,
): Node => ({
  id,
  type: "placeholder",
  position: {
    x,
    y: getTopYFromCenter(centerY, PLACEHOLDER_NODE_HEIGHT),
  },
  data: { label: "" },
  initialWidth: PLACEHOLDER_NODE_WIDTH,
  initialHeight: PLACEHOLDER_NODE_HEIGHT,
  selectable: false,
  draggable: false,
  hidden: true,
});

const toPlaceholderRoutingMeta = (
  value: unknown,
): PlaceholderRoutingMeta | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    branchKey:
      typeof candidate.branchKey === "string" ? candidate.branchKey : null,
    prevEdgeLabel:
      typeof candidate.prevEdgeLabel === "string"
        ? candidate.prevEdgeLabel
        : null,
    prevEdgeSourceHandle:
      typeof candidate.prevEdgeSourceHandle === "string"
        ? candidate.prevEdgeSourceHandle
        : null,
    prevEdgeTargetHandle:
      typeof candidate.prevEdgeTargetHandle === "string"
        ? candidate.prevEdgeTargetHandle
        : null,
  };
};

type CanvasNodeType = NodeType | "placeholder" | "next-step-choice";

const nodeTypes = {
  communication: CommunicationNode,
  storage: StorageNode,
  spreadsheet: SpreadsheetNode,
  "web-scraping": WebScrapingNode,
  calendar: CalendarNode,
  trigger: TriggerNode,
  filter: FilterNode,
  loop: LoopNode,
  condition: ConditionNode,
  "multi-output": MultiOutputNode,
  "data-process": DataProcessNode,
  "output-format": OutputFormatNode,
  "early-exit": EarlyExitNode,
  notification: NotificationNode,
  llm: LLMNode,
  placeholder: PlaceholderNode,
  "next-step-choice": NextStepChoiceNode,
} satisfies Record<CanvasNodeType, NodeTypes[string]>;

const edgeTypes = {
  "flow-arrow": FlowArrowEdge,
} satisfies EdgeTypes;

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "flow-arrow",
  animated: false,
  data: {
    variant: "flow-arrow",
  },
};

export const Canvas = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeIds = useWorkflowStore((state) => state.endNodeIds);
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const [activeNextStep, setActiveNextStep] = useState<ActiveNextStep | null>(
    null,
  );
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: deleteWorkflowNode, isPending: isDeleteNodePending } =
    useDeleteWorkflowNodeMutation();
  const syncWorkflowFromResponse = useCallback(
    (workflow: Parameters<typeof hydrateStore>[0]) => {
      syncWorkflowGraph(hydrateStore(workflow), {
        preserveActivePanelNodeId: true,
        preserveActivePlaceholder: true,
        preserveDirty: true,
      });
    },
    [syncWorkflowGraph],
  );
  const handleRemoveNode = useCallback(
    async (nodeId: string) => {
      if (!workflowId) {
        toaster.create({
          title: "워크플로우 정보를 불러오지 못했습니다",
          description: "페이지를 새로고침해주세요.",
          type: "error",
        });
        return;
      }

      try {
        const nextWorkflow = await deleteWorkflowNode({
          workflowId,
          nodeId,
        });
        syncWorkflowFromResponse(nextWorkflow);
      } catch {
        toaster.create({
          title: "노드 삭제 실패",
          description: "노드를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.",
          type: "error",
        });
      }
    },
    [deleteWorkflowNode, syncWorkflowFromResponse, workflowId],
  );
  const nodeEditorContextValue = useMemo(
    () => ({
      canEditNodes,
      startNodeId,
      endNodeIds,
      getNodeStatus: (nodeId: string) => nodeStatuses[nodeId] ?? null,
      onOpenPanel: openPanel,
      onRemoveNode: handleRemoveNode,
    }),
    [
      canEditNodes,
      endNodeIds,
      handleRemoveNode,
      nodeStatuses,
      openPanel,
      startNodeId,
    ],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter(
        (change) =>
          !(
            "id" in change &&
            (change.id.startsWith("placeholder-") ||
              change.id.startsWith("next-step-choice-"))
          ),
      );
      if (filtered.length > 0) {
        onNodesChange(filtered);
      }
    },
    [onNodesChange],
  );

  const { getZoom, setCenter } = useReactFlow();

  const handleCreateMiddleNode = useCallback(
    async ({
      position,
      routing,
      sourceNodeId,
    }: {
      position: { x: number; y: number };
      routing?: PlaceholderRoutingMeta | null;
      sourceNodeId: string;
    }) => {
      if (isAddNodePending || isDeleteNodePending) {
        return;
      }

      const sourceNode = nodes.find(
        (currentNode) => currentNode.id === sourceNodeId,
      );
      const sourceOutputType = sourceNode?.data.outputTypes[0] ?? null;

      if (!workflowId) {
        toaster.create({
          title: "워크플로우 정보를 불러오지 못했습니다",
          description: "페이지를 새로고침해주세요.",
          type: "error",
        });
        return;
      }

      try {
        const previousNodes = useWorkflowStore.getState().nodes;
        const nextWorkflow = await addWorkflowNode({
          workflowId,
          body: toNodeAddRequest({
            type: "data-process",
            position,
            role: "middle",
            prevNodeId: sourceNodeId,
            prevEdgeLabel: routing?.prevEdgeLabel ?? undefined,
            prevEdgeSourceHandle: routing?.prevEdgeSourceHandle ?? undefined,
            prevEdgeTargetHandle: routing?.prevEdgeTargetHandle ?? undefined,
            inputTypes: sourceNode
              ? [...sourceNode.data.outputTypes]
              : undefined,
            outputTypes: sourceOutputType ? [sourceOutputType] : undefined,
          }),
        });

        const addedNodeId =
          findAddedNodeId(previousNodes, nextWorkflow.nodes) ??
          nextWorkflow.nodes.at(-1)?.id ??
          null;
        const addedNode =
          addedNodeId !== null
            ? (nextWorkflow.nodes.find(
                (currentNode) => currentNode.id === addedNodeId,
              ) ?? null)
            : null;

        if (!addedNodeId || !addedNode) {
          toaster.create({
            title: "노드 추가 실패",
            description: "서버 응답을 해석하지 못했습니다.",
            type: "error",
          });
          return;
        }

        syncWorkflowFromResponse(nextWorkflow);
        setActivePlaceholder(null);
        setActiveNextStep(null);
        openPanel(addedNodeId);
      } catch {
        toaster.create({
          title: "노드 추가 실패",
          description: "노드를 추가하지 못했습니다. 잠시 후 다시 시도해주세요.",
          type: "error",
        });
      }
    },
    [
      addWorkflowNode,
      isAddNodePending,
      isDeleteNodePending,
      nodes,
      openPanel,
      setActivePlaceholder,
      syncWorkflowFromResponse,
      workflowId,
    ],
  );

  const handleNodeClick = useCallback(
    async (_event: MouseEvent, node: Node) => {
      if (
        !canEditNodes &&
        (node.type === "next-step-choice" || node.type === "placeholder")
      ) {
        return;
      }

      if (node.type === "next-step-choice") {
        return;
      }

      if (node.type === "placeholder") {
        const nodeHeight = node.measured?.height ?? PLACEHOLDER_NODE_HEIGHT;
        const centerY = node.position.y + nodeHeight / 2;
        const panelNodePosition = {
          x: node.position.x,
          y: getTopYFromCenter(centerY, DEFAULT_FLOW_NODE_HEIGHT),
        };

        closePanel();

        if (node.id === "placeholder-start") {
          setActiveNextStep(null);
          setActivePlaceholder({
            id: node.id,
            kind: "start",
            position: panelNodePosition,
          });

          const viewportWidth = window.innerWidth;
          const offsetX = viewportWidth * 0.2;
          setCenter(node.position.x + offsetX, centerY, {
            zoom: 1,
            duration: 300,
          });
          return;
        }

        const rawSourceNodeId = node.data?.sourceNodeId;
        const routing = toPlaceholderRoutingMeta(node.data?.routing);
        const sourceNodeId =
          typeof rawSourceNodeId === "string"
            ? rawSourceNodeId
            : node.id.replace("placeholder-next-", "");

        setActivePlaceholder(null);
        setActiveNextStep({
          centerY,
          id: node.id,
          position: panelNodePosition,
          routing,
          sourceNodeId,
        });
      } else {
        setActiveNextStep(null);
        setActivePlaceholder(null);
        openPanel(node.id, { mode: "view" });
      }
    },
    [canEditNodes, closePanel, openPanel, setActivePlaceholder, setCenter],
  );

  const handlePaneClick = useCallback(() => {
    if (activeNextStep) {
      setActiveNextStep(null);
    }

    if (activePlaceholder) {
      setActivePlaceholder(null);
    }

    if (activePanelNodeId) {
      closePanel();
    }
  }, [
    activeNextStep,
    activePanelNodeId,
    activePlaceholder,
    closePanel,
    setActivePlaceholder,
  ]);

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      if (!canEditNodes) {
        return;
      }

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (sourceNode && targetNode) {
        const compatible = isDataTypeCompatible(
          sourceNode.data.outputTypes,
          targetNode.data.inputTypes,
        );

        if (!compatible) {
          return;
        }
      }

      onConnect(connection);
    },
    [canEditNodes, nodes, onConnect],
  );

  const handleSelectMiddleNode = useCallback(() => {
    if (!activeNextStep) {
      return;
    }

    void handleCreateMiddleNode({
      position: activeNextStep.position,
      routing: activeNextStep.routing,
      sourceNodeId: activeNextStep.sourceNodeId,
    });
  }, [activeNextStep, handleCreateMiddleNode]);

  const handleSelectSinkNode = useCallback(() => {
    if (!activeNextStep) {
      return;
    }

    closePanel();
    setActivePlaceholder({
      id: `placeholder-sink-${activeNextStep.id}`,
      kind: "sink",
      position: activeNextStep.position,
      routing: activeNextStep.routing,
      sourceNodeId: activeNextStep.sourceNodeId,
    });
    setActiveNextStep(null);

    const viewportWidth = window.innerWidth;
    const offsetX = viewportWidth * 0.2;
    setCenter(activeNextStep.position.x + offsetX, activeNextStep.centerY, {
      zoom: 1,
      duration: 300,
    });
  }, [activeNextStep, closePanel, setActivePlaceholder, setCenter]);

  const branchPlaceholderSpecs = useMemo(
    () =>
      nodes.flatMap((node) =>
        getFileTypeBranchPlaceholderSpecs({
          branchNode: node,
          edges,
        }),
      ),
    [edges, nodes],
  );

  const virtualBranchEdges = useMemo<Edge[]>(
    () =>
      branchPlaceholderSpecs.map((spec) => ({
        id: `virtual-branch-edge-${spec.sourceNodeId}-${spec.branchKey}`,
        source: spec.sourceNodeId,
        sourceHandle: spec.prevEdgeSourceHandle,
        target: spec.id,
        type: "flow-arrow",
        animated: false,
        data: {
          branchKey: spec.branchKey,
          label: spec.branchLabel,
          variant: "flow-arrow",
        },
      })),
    [branchPlaceholderSpecs],
  );

  const edgesWithVirtualBranches = useMemo(
    () => [...edges, ...virtualBranchEdges],
    [edges, virtualBranchEdges],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (activePlaceholder) {
        setActivePlaceholder(null);
        return;
      }

      if (activeNextStep) {
        setActiveNextStep(null);
        return;
      }

      if (activePanelNodeId) {
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeNextStep,
    activePanelNodeId,
    activePlaceholder,
    closePanel,
    setActivePlaceholder,
  ]);

  const nodesWithPlaceholders = useMemo(() => {
    const result: Node[] = [...nodes];
    const branchPlaceholderSourceNodeIds = new Set(
      branchPlaceholderSpecs.map((spec) => spec.sourceNodeId),
    );

    if (!startNodeId) {
      result.push({
        id: "placeholder-start",
        type: "placeholder",
        position: {
          x: 0,
          y: getTopYFromCenter(DEFAULT_ROW_CENTER_Y, PLACEHOLDER_NODE_HEIGHT),
        },
        data: { label: "시작" },
        initialWidth: PLACEHOLDER_NODE_WIDTH,
        initialHeight: PLACEHOLDER_NODE_HEIGHT,
        selectable: false,
        draggable: false,
      });
    }

    if (startNodeId) {
      const nodeIds = nodes.map((node) => node.id);
      const leafIds = getLeafNodeIds(nodeIds, edges);

      for (const leafId of leafIds) {
        if (isEndWorkflowNodeId(leafId, endNodeIds)) {
          continue;
        }

        const placeholderId = getNextStepPlaceholderId(leafId);

        if (branchPlaceholderSourceNodeIds.has(leafId)) {
          continue;
        }

        if (activeNextStep?.id === placeholderId) {
          continue;
        }

        const leafNode = nodes.find((node) => node.id === leafId);
        if (!leafNode) continue;

        const placeholderX =
          leafNode.position.x + getNodeWidth(leafNode) + NODE_GAP_X;

        result.push({
          id: placeholderId,
          type: "placeholder",
          position: {
            x: placeholderX,
            y: getTopYFromCenter(
              getNodeCenterY(leafNode),
              PLACEHOLDER_NODE_HEIGHT,
            ),
          },
          data: { label: "다음 단계", sourceNodeId: leafId },
          initialWidth: PLACEHOLDER_NODE_WIDTH,
          initialHeight: PLACEHOLDER_NODE_HEIGHT,
          selectable: false,
          draggable: false,
        });
      }

      for (const spec of branchPlaceholderSpecs) {
        if (activeNextStep?.id === spec.id) {
          continue;
        }

        result.push({
          id: spec.id,
          type: "placeholder",
          position: spec.position,
          data: {
            label: "다음 단계",
            routing: {
              branchKey: spec.branchKey,
              prevEdgeLabel: spec.prevEdgeLabel,
              prevEdgeSourceHandle: spec.prevEdgeSourceHandle,
              prevEdgeTargetHandle: spec.prevEdgeTargetHandle,
            },
            sourceNodeId: spec.sourceNodeId,
          },
          initialWidth: PLACEHOLDER_NODE_WIDTH,
          initialHeight: PLACEHOLDER_NODE_HEIGHT,
          selectable: false,
          draggable: false,
        });
      }

      if (activeNextStep) {
        result.push({
          id: `next-step-choice-${activeNextStep.id}`,
          type: "next-step-choice",
          position: {
            x: activeNextStep.position.x,
            y: getTopYFromCenter(
              activeNextStep.centerY,
              NEXT_STEP_CHOICE_NODE_HEIGHT,
            ),
          },
          data: {
            disabled: isAddNodePending || isDeleteNodePending,
            onSelectMiddle: handleSelectMiddleNode,
            onSelectSink: handleSelectSinkNode,
          },
          initialWidth: NEXT_STEP_CHOICE_NODE_WIDTH,
          initialHeight: NEXT_STEP_CHOICE_NODE_HEIGHT,
          selectable: false,
          draggable: false,
        });
      }
    }

    return result;
  }, [
    activeNextStep,
    branchPlaceholderSpecs,
    edges,
    endNodeIds,
    handleSelectMiddleNode,
    handleSelectSinkNode,
    isAddNodePending,
    isDeleteNodePending,
    nodes,
    startNodeId,
  ]);

  const nodesWithDragControl = useMemo(
    () =>
      nodesWithPlaceholders.map((node) => ({
        ...node,
        draggable:
          node.draggable === false ? false : node.id !== activePanelNodeId,
      })),
    [activePanelNodeId, nodesWithPlaceholders],
  );

  const visibleNodeIds = useMemo(() => {
    if (!activePanelNodeId) return null;

    const relatedIds = new Set<string>([activePanelNodeId]);
    const incomingEdges = edgesWithVirtualBranches.filter(
      (edge) => edge.target === activePanelNodeId,
    );
    const outgoingEdges = edgesWithVirtualBranches.filter(
      (edge) => edge.source === activePanelNodeId,
    );
    const placeholderNodes = nodesWithDragControl.filter(
      (node) =>
        node.type === "placeholder" &&
        node.data?.sourceNodeId === activePanelNodeId,
    );

    for (const incomingEdge of incomingEdges) {
      relatedIds.add(incomingEdge.source);
    }

    outgoingEdges.forEach((outgoingEdge) =>
      relatedIds.add(outgoingEdge.target),
    );
    placeholderNodes.forEach((placeholderNode) =>
      relatedIds.add(placeholderNode.id),
    );

    if (outgoingEdges.length === 0 && placeholderNodes.length === 0) {
      relatedIds.add(getNextStepPlaceholderId(activePanelNodeId));
    }

    return relatedIds;
  }, [activePanelNodeId, edgesWithVirtualBranches, nodesWithDragControl]);

  const visibleNodes = useMemo(
    () =>
      nodesWithDragControl.map((node) => ({
        ...node,
        hidden: visibleNodeIds ? !visibleNodeIds.has(node.id) : false,
      })),
    [nodesWithDragControl, visibleNodeIds],
  );

  const visibleEdges = useMemo(() => {
    if (!visibleNodeIds) return edgesWithVirtualBranches;

    return edgesWithVirtualBranches.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [edgesWithVirtualBranches, visibleNodeIds]);

  const getChainNodes = useCallback(
    (nodeId: string) => {
      const activeNode =
        nodesWithDragControl.find((node) => node.id === nodeId) ?? null;

      if (!activeNode) return [];

      const chainNodes: Node[] = [activeNode];
      const incomingEdges = edgesWithVirtualBranches.filter(
        (edge) => edge.target === nodeId,
      );
      const outgoingEdges = edgesWithVirtualBranches.filter(
        (edge) => edge.source === nodeId,
      );
      const placeholderNodes = nodesWithDragControl.filter(
        (node) =>
          node.type === "placeholder" && node.data?.sourceNodeId === nodeId,
      );
      const activeNodeCenterY = getNodeCenterY(
        activeNode,
        getNodeFallbackHeight(activeNode),
      );

      if (incomingEdges.length > 0) {
        for (const incomingEdge of incomingEdges) {
          const previousNode = nodesWithDragControl.find(
            (node) => node.id === incomingEdge.source,
          );

          if (previousNode) {
            chainNodes.unshift(previousNode);
          }
        }
      } else {
        chainNodes.unshift(
          createVirtualPlaceholderNode(
            `virtual-placeholder-before-${nodeId}`,
            activeNode.position.x - NODE_GAP_X - PLACEHOLDER_NODE_WIDTH,
            activeNodeCenterY,
          ),
        );
      }

      const nextNodeIds = new Set<string>();

      for (const outgoingEdge of outgoingEdges) {
        if (nextNodeIds.has(outgoingEdge.target)) {
          continue;
        }

        const nextNode = nodesWithDragControl.find(
          (node) => node.id === outgoingEdge.target,
        );

        if (nextNode) {
          chainNodes.push(nextNode);
          nextNodeIds.add(outgoingEdge.target);
        }
      }

      for (const placeholderNode of placeholderNodes) {
        if (nextNodeIds.has(placeholderNode.id)) {
          continue;
        }

        chainNodes.push(placeholderNode);
        nextNodeIds.add(placeholderNode.id);
      }

      if (nextNodeIds.size === 0) {
        const nextPlaceholder =
          nodesWithDragControl.find(
            (node) => node.id === getNextStepPlaceholderId(nodeId),
          ) ?? null;

        if (nextPlaceholder) {
          chainNodes.push(nextPlaceholder);
        } else {
          chainNodes.push(
            createVirtualPlaceholderNode(
              `virtual-placeholder-after-${nodeId}`,
              activeNode.position.x +
                getNodeWidth(activeNode, getNodeFallbackWidth(activeNode)) +
                NODE_GAP_X,
              activeNodeCenterY,
            ),
          );
        }
      }

      return chainNodes;
    },
    [edgesWithVirtualBranches, nodesWithDragControl],
  );

  useEffect(() => {
    if (!activePanelNodeId) return;

    const chainNodes = getChainNodes(activePanelNodeId);
    if (chainNodes.length === 0) return;

    const { centerX, centerY } = getNodesBoundsCenter(chainNodes);

    setCenter(centerX, centerY, {
      duration: 300,
      zoom: getZoom(),
    });
  }, [activePanelNodeId, getChainNodes, getZoom, setCenter]);

  const isCanvasLocked = activePlaceholder !== null;

  return (
    <NodeEditorProvider value={nodeEditorContextValue}>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        defaultEdgeOptions={defaultEdgeOptions}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        panOnDrag={!isCanvasLocked}
        panOnScroll={false}
        nodesConnectable={canEditNodes}
        nodesDraggable={!isCanvasLocked && canEditNodes}
        zoomOnScroll={!isCanvasLocked}
        zoomOnPinch={!isCanvasLocked}
        zoomOnDoubleClick={!isCanvasLocked}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </NodeEditorProvider>
  );
};
