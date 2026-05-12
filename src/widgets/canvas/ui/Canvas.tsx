import { useCallback, useEffect, useMemo, useState } from "react";
import { type MouseEvent } from "react";

import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useStore,
  useStoreApi,
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

import { getAutoLayoutPositions } from "../lib/autoLayout";

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

const AutoLayoutIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="21"
    viewBox="0 0 21 21"
    width="21"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.7195 0.228966C19.7887 0.157333 19.8714 0.100197 19.9629 0.0608902C20.0544 0.0215834 20.1529 0.00089368 20.2524 2.83175e-05C20.352 -0.000837045 20.4508 0.0181393 20.543 0.0558499C20.6351 0.0935606 20.7189 0.14925 20.7893 0.21967C20.8597 0.290089 20.9154 0.373828 20.9531 0.466001C20.9908 0.558173 21.0098 0.656933 21.0089 0.756517C21.0081 0.856102 20.9874 0.954517 20.9481 1.04602C20.9088 1.13752 20.8516 1.22028 20.78 1.28947L13.775 8.29447C14.5864 9.35625 14.9836 10.677 14.8925 12.0102C14.8014 13.3434 14.2283 14.5979 13.28 15.5395L12.6852 16.1342L4.89275 8.34172L5.4785 7.79422C7.45325 5.82922 10.535 5.58022 12.7137 7.23472L19.7195 0.228966ZM3.5795 9.14947L0.439247 10.5767C0.329006 10.6269 0.23256 10.703 0.158159 10.7986C0.0837574 10.8942 0.0336142 11.0064 0.0120175 11.1256C-0.00957922 11.2448 -0.00198692 11.3674 0.0341454 11.483C0.0702776 11.5986 0.133875 11.7038 0.219497 11.7895L9.2195 20.7895C9.30518 20.8751 9.41032 20.9387 9.52593 20.9748C9.64155 21.011 9.76419 21.0185 9.88338 20.9969C10.0026 20.9754 10.1147 20.9252 10.2103 20.8508C10.3059 20.7764 10.3821 20.68 10.4322 20.5697L11.8595 17.4295L3.5795 9.14947Z"
      fill="currentColor"
    />
  </svg>
);

const LockControlIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 25 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" />
  </svg>
);

const UnlockControlIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 25 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" />
  </svg>
);

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
  const applyLayoutPositions = useWorkflowStore(
    (state) => state.applyLayoutPositions,
  );
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const [activeNextStep, setActiveNextStep] = useState<ActiveNextStep | null>(
    null,
  );
  const [pendingAutoLayoutFit, setPendingAutoLayoutFit] = useState(false);
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

  const { fitView, getZoom, setCenter } = useReactFlow();
  const reactFlowStore = useStoreApi();
  const isInteractive = useStore(
    (state) =>
      state.nodesDraggable ||
      state.nodesConnectable ||
      state.elementsSelectable,
  );

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

  const isAutoLayoutDisabled =
    !canEditNodes ||
    nodes.length === 0 ||
    isAddNodePending ||
    isDeleteNodePending ||
    activePlaceholder !== null ||
    activeNextStep !== null;

  const handleAutoLayout = useCallback(() => {
    if (isAutoLayoutDisabled) {
      return;
    }

    closePanel();
    setActivePlaceholder(null);
    setActiveNextStep(null);

    const updates = getAutoLayoutPositions({
      edges,
      nodes,
      options: {
        branchGapY: 220,
        fallbackNodeHeight: DEFAULT_FLOW_NODE_HEIGHT,
        fallbackNodeWidth: DEFAULT_FLOW_NODE_WIDTH,
        nodeGapX: NODE_GAP_X,
      },
    });

    if (updates.length === 0) {
      return;
    }

    applyLayoutPositions(updates);
    setPendingAutoLayoutFit(true);
  }, [
    applyLayoutPositions,
    closePanel,
    edges,
    isAutoLayoutDisabled,
    nodes,
    setActivePlaceholder,
  ]);

  const handleToggleInteractivity = useCallback(() => {
    reactFlowStore.setState({
      elementsSelectable: !isInteractive,
      nodesConnectable: !isInteractive,
      nodesDraggable: !isInteractive,
    });
  }, [isInteractive, reactFlowStore]);

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

  useEffect(() => {
    if (!pendingAutoLayoutFit) {
      return;
    }

    if (activePanelNodeId || activePlaceholder || activeNextStep) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      void fitView({ duration: 300, padding: 0.2 });
      setPendingAutoLayoutFit(false);
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    activeNextStep,
    activePanelNodeId,
    activePlaceholder,
    fitView,
    pendingAutoLayoutFit,
    visibleNodes,
  ]);

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
        <Controls showInteractive={false}>
          <ControlButton
            aria-label="자동 정렬"
            disabled={isAutoLayoutDisabled}
            onClick={handleAutoLayout}
            title="자동 정렬"
          >
            <AutoLayoutIcon />
          </ControlButton>
          <ControlButton
            aria-label={isInteractive ? "화면 잠금" : "화면 잠금 해제"}
            className="react-flow__controls-interactive"
            onClick={handleToggleInteractivity}
            title={isInteractive ? "화면 잠금" : "화면 잠금 해제"}
          >
            {isInteractive ? <UnlockControlIcon /> : <LockControlIcon />}
          </ControlButton>
        </Controls>
        <MiniMap />
      </ReactFlow>
    </NodeEditorProvider>
  );
};
