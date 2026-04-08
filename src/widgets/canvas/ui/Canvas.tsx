import { useCallback, useEffect, useMemo } from "react";
import type { MouseEvent } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import type {
  DefaultEdgeOptions,
  Node,
  NodeChange,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  CalendarNode,
  CommunicationNode,
  ConditionNode,
  CreationMethodNode,
  DataProcessNode,
  EarlyExitNode,
  FilterNode,
  LLMNode,
  LoopNode,
  MultiOutputNode,
  NotificationNode,
  OutputFormatNode,
  PlaceholderNode,
  SpreadsheetNode,
  StorageNode,
  TriggerNode,
  WebScrapingNode,
} from "@/entities/node";
import type { NodeType } from "@/entities/node";
import { isDataTypeCompatible } from "@/entities/node";
import { useAddNode } from "@/features/add-node";
import { getLeafNodeIds, useWorkflowStore } from "@/shared";

const NODE_GAP_X = 96;
const DEFAULT_ROW_CENTER_Y = 320;
const DEFAULT_FLOW_NODE_WIDTH = 172;
const DEFAULT_FLOW_NODE_HEIGHT = 176;
const PLACEHOLDER_NODE_WIDTH = 100;
const PLACEHOLDER_NODE_HEIGHT = 134;
const CREATION_METHOD_NODE_WIDTH = 244;
const CREATION_METHOD_NODE_HEIGHT = 112;

const getTopYFromCenter = (centerY: number, height: number) =>
  centerY - height / 2;

const getCenterYFromTop = (topY: number, height: number) => topY + height / 2;

const getNodeWidth = (node: Node, fallbackWidth = DEFAULT_FLOW_NODE_WIDTH) =>
  node.measured?.width ?? fallbackWidth;

const getNodeHeight = (node: Node, fallbackHeight = DEFAULT_FLOW_NODE_HEIGHT) =>
  node.measured?.height ?? fallbackHeight;

const getNodeFallbackWidth = (node: Node) => {
  if (node.type === "placeholder") return PLACEHOLDER_NODE_WIDTH;
  if (node.type === "creation-method") return CREATION_METHOD_NODE_WIDTH;
  return DEFAULT_FLOW_NODE_WIDTH;
};

const getNodeFallbackHeight = (node: Node) => {
  if (node.type === "placeholder") return PLACEHOLDER_NODE_HEIGHT;
  if (node.type === "creation-method") return CREATION_METHOD_NODE_HEIGHT;
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

type CanvasNodeType = NodeType | "placeholder" | "creation-method";

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
  "creation-method": CreationMethodNode,
} satisfies Record<CanvasNodeType, NodeTypes[string]>;

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: {
    stroke: "#94a3b8",
    strokeWidth: 2,
  },
};

export const Canvas = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const creationMethod = useWorkflowStore((state) => state.creationMethod);
  const setCreationMethod = useWorkflowStore(
    (state) => state.setCreationMethod,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const { addNode } = useAddNode();

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter(
        (change) => !("id" in change && change.id.startsWith("placeholder-")),
      );
      if (filtered.length > 0) {
        onNodesChange(filtered);
      }
    },
    [onNodesChange],
  );

  const { getZoom, setCenter } = useReactFlow();

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (node.type === "creation-method") {
        return;
      }

      if (node.type === "placeholder") {
        const nodeHeight = node.measured?.height ?? PLACEHOLDER_NODE_HEIGHT;
        const centerY = node.position.y + nodeHeight / 2;
        const panelNodePosition = {
          x: node.position.x,
          y: getTopYFromCenter(centerY, DEFAULT_FLOW_NODE_HEIGHT),
        };

        const isStartOrEndPlaceholder =
          node.id === "placeholder-start" || node.id === "placeholder-end";

        closePanel();

        if (isStartOrEndPlaceholder) {
          setActivePlaceholder({
            id: node.id,
            position: panelNodePosition,
          });
        } else {
          const sourceNodeId = node.id.replace("placeholder-", "");
          const sourceNode = nodes.find(
            (currentNode) => currentNode.id === sourceNodeId,
          );
          const sourceOutputType = sourceNode?.data.outputTypes[0] ?? null;

          const tempNodeId = addNode("data-process", {
            position: panelNodePosition,
            inputTypes: sourceNode
              ? [...sourceNode.data.outputTypes]
              : undefined,
            outputTypes: sourceOutputType ? [sourceOutputType] : undefined,
            label: sourceOutputType ? "설정 중" : "가공",
          });

          onConnect({
            source: sourceNodeId,
            target: tempNodeId,
            sourceHandle: null,
            targetHandle: null,
          });

          setActivePlaceholder(null);
          openPanel(tempNodeId);
        }

        const viewportWidth = window.innerWidth;
        const offsetX = viewportWidth * 0.2;

        if (isStartOrEndPlaceholder) {
          setCenter(node.position.x + offsetX, centerY, {
            zoom: 1,
            duration: 300,
          });
        }
      } else {
        setActivePlaceholder(null);
        openPanel(node.id);
      }
    },
    [
      addNode,
      closePanel,
      nodes,
      onConnect,
      openPanel,
      setActivePlaceholder,
      setCenter,
    ],
  );

  const handlePaneClick = useCallback(() => {
    if (activePlaceholder) {
      setActivePlaceholder(null);
    }

    if (activePanelNodeId) {
      closePanel();
    }
  }, [activePanelNodeId, activePlaceholder, closePanel, setActivePlaceholder]);

  const handleSelectManual = useCallback(() => {
    setCreationMethod("manual");
  }, [setCreationMethod]);

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
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
    [nodes, onConnect],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (activePlaceholder) {
        setActivePlaceholder(null);
        return;
      }

      if (activePanelNodeId) {
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePanelNodeId, activePlaceholder, closePanel, setActivePlaceholder]);

  const nodesWithPlaceholders = useMemo(() => {
    const result: Node[] = [...nodes];
    const endNode = endNodeId
      ? (nodes.find((node) => node.id === endNodeId) ?? null)
      : null;
    const showCreationMethod =
      startNodeId !== null &&
      endNodeId !== null &&
      endNode?.data.config.isConfigured === true &&
      !creationMethod;

    // 분기 1: 시작/도착 미설정 → placeholder 표시
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

    if (!endNodeId && !creationMethod) {
      // 도착 노드 미설정 & 수동 모드 아님 → 시작 노드 옆에 도착 placeholder
      const startNode = nodes.find((n) => n.id === startNodeId);
      const anchorX = startNode
        ? startNode.position.x + getNodeWidth(startNode) + NODE_GAP_X
        : PLACEHOLDER_NODE_WIDTH + NODE_GAP_X;
      const anchorCenterY = startNode
        ? getNodeCenterY(startNode)
        : DEFAULT_ROW_CENTER_Y;

      result.push({
        id: "placeholder-end",
        type: "placeholder",
        position: {
          x: anchorX,
          y: getTopYFromCenter(anchorCenterY, PLACEHOLDER_NODE_HEIGHT),
        },
        data: { label: "도착" },
        initialWidth: PLACEHOLDER_NODE_WIDTH,
        initialHeight: PLACEHOLDER_NODE_HEIGHT,
        selectable: false,
        draggable: false,
      });
    }

    // 분기 2: 둘 다 설정됨 + 생성 방식 미결정
    if (showCreationMethod) {
      const startNode = nodes.find((n) => n.id === startNodeId);
      const startX = startNode?.position.x ?? 0;
      const startWidth = startNode
        ? getNodeWidth(startNode)
        : DEFAULT_FLOW_NODE_WIDTH;
      const startCenterY = startNode
        ? getNodeCenterY(startNode)
        : DEFAULT_ROW_CENTER_Y;

      // 도착 노드를 오른쪽으로 밀어 겹침 방지
      const endNodeIndex = result.findIndex((n) => n.id === endNodeId);
      if (endNodeIndex !== -1) {
        result[endNodeIndex] = {
          ...result[endNodeIndex],
          position: {
            x:
              startX +
              startWidth +
              NODE_GAP_X +
              CREATION_METHOD_NODE_WIDTH +
              NODE_GAP_X,
            y: result[endNodeIndex].position.y,
          },
        };
      }

      result.push({
        id: "placeholder-creation-method",
        type: "creation-method",
        position: {
          x: startX + startWidth + NODE_GAP_X,
          y: getTopYFromCenter(startCenterY, CREATION_METHOD_NODE_HEIGHT),
        },
        data: { onSelectManual: handleSelectManual },
        initialWidth: CREATION_METHOD_NODE_WIDTH,
        initialHeight: CREATION_METHOD_NODE_HEIGHT,
        selectable: false,
        draggable: false,
      });
    }

    // 분기 3: 수동 생성 모드
    if (startNodeId && creationMethod === "manual") {
      // endNode가 있으면 제외하고 leaf 계산
      const nodeIds = nodes.map((n) => n.id).filter((id) => id !== endNodeId);
      const leafIds = getLeafNodeIds(nodeIds, edges);

      let maxPlaceholderX = 0;

      for (const leafId of leafIds) {
        const leafNode = nodes.find((n) => n.id === leafId);
        if (!leafNode) continue;

        const placeholderX =
          leafNode.position.x + getNodeWidth(leafNode) + NODE_GAP_X;
        if (placeholderX > maxPlaceholderX) {
          maxPlaceholderX = placeholderX;
        }

        result.push({
          id: `placeholder-${leafId}`,
          type: "placeholder",
          position: {
            x: placeholderX,
            y: getTopYFromCenter(
              getNodeCenterY(leafNode),
              PLACEHOLDER_NODE_HEIGHT,
            ),
          },
          data: { label: "다음" },
          initialWidth: PLACEHOLDER_NODE_WIDTH,
          initialHeight: PLACEHOLDER_NODE_HEIGHT,
          selectable: false,
          draggable: false,
        });
      }

      if (endNodeId) {
        // 도착 노드를 "다음" placeholder 뒤로 밀기
        const endNodeIndex = result.findIndex((n) => n.id === endNodeId);
        if (endNodeIndex !== -1) {
          result[endNodeIndex] = {
            ...result[endNodeIndex],
            position: {
              x: maxPlaceholderX + PLACEHOLDER_NODE_WIDTH + NODE_GAP_X,
              y: result[endNodeIndex].position.y,
            },
          };
        }
      } else {
        // 도착 노드 삭제됨 → 체인 끝에 도착 placeholder 표시
        const lastLeaf =
          leafIds.length > 0 ? nodes.find((n) => n.id === leafIds[0]) : null;
        const placeholderEndX =
          maxPlaceholderX + PLACEHOLDER_NODE_WIDTH + NODE_GAP_X;
        const placeholderEndCenterY = lastLeaf
          ? getNodeCenterY(lastLeaf)
          : DEFAULT_ROW_CENTER_Y;

        result.push({
          id: "placeholder-end",
          type: "placeholder",
          position: {
            x: placeholderEndX,
            y: getTopYFromCenter(
              placeholderEndCenterY,
              PLACEHOLDER_NODE_HEIGHT,
            ),
          },
          data: { label: "도착" },
          initialWidth: PLACEHOLDER_NODE_WIDTH,
          initialHeight: PLACEHOLDER_NODE_HEIGHT,
          selectable: false,
          draggable: false,
        });
      }
    }

    return result;
  }, [
    nodes,
    edges,
    startNodeId,
    endNodeId,
    creationMethod,
    handleSelectManual,
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
    const incomingEdge = edges.find(
      (edge) => edge.target === activePanelNodeId,
    );
    const outgoingEdge = edges.find(
      (edge) => edge.source === activePanelNodeId,
    );

    if (incomingEdge) {
      relatedIds.add(incomingEdge.source);
    }

    if (outgoingEdge) {
      relatedIds.add(outgoingEdge.target);
    } else {
      relatedIds.add(`placeholder-${activePanelNodeId}`);
    }

    return relatedIds;
  }, [activePanelNodeId, edges]);

  const visibleNodes = useMemo(
    () =>
      nodesWithDragControl.map((node) => ({
        ...node,
        hidden: visibleNodeIds ? !visibleNodeIds.has(node.id) : false,
      })),
    [nodesWithDragControl, visibleNodeIds],
  );

  const visibleEdges = useMemo(() => {
    if (!visibleNodeIds) return edges;

    return edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [edges, visibleNodeIds]);

  const getChainNodes = useCallback(
    (nodeId: string) => {
      const activeNode =
        nodesWithDragControl.find((node) => node.id === nodeId) ?? null;

      if (!activeNode) return [];

      const chainNodes: Node[] = [activeNode];
      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      const outgoingEdge = edges.find((edge) => edge.source === nodeId);

      if (incomingEdge) {
        const previousNode = nodesWithDragControl.find(
          (node) => node.id === incomingEdge.source,
        );

        if (previousNode) {
          chainNodes.unshift(previousNode);
        }
      }

      if (outgoingEdge) {
        const nextNode = nodesWithDragControl.find(
          (node) => node.id === outgoingEdge.target,
        );

        if (nextNode) {
          chainNodes.push(nextNode);
        }
      } else {
        const nextPlaceholder =
          nodesWithDragControl.find(
            (node) => node.id === `placeholder-${nodeId}`,
          ) ??
          nodesWithDragControl.find((node) => node.id === "placeholder-end") ??
          null;

        if (nextPlaceholder) {
          chainNodes.push(nextPlaceholder);
        }
      }

      return chainNodes;
    },
    [edges, nodesWithDragControl],
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
    <ReactFlow
      nodes={visibleNodes}
      edges={visibleEdges}
      defaultEdgeOptions={defaultEdgeOptions}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      panOnDrag={!isCanvasLocked}
      panOnScroll={false}
      nodesDraggable={!isCanvasLocked}
      zoomOnScroll={!isCanvasLocked}
      zoomOnPinch={!isCanvasLocked}
      zoomOnDoubleClick={!isCanvasLocked}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
};
