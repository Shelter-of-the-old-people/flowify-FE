import { useCallback, useMemo } from "react";
import type { MouseEvent } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import type { Node, NodeChange, NodeTypes } from "@xyflow/react";
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

const getNodeCenterY = (
  node: Node,
  fallbackHeight = DEFAULT_FLOW_NODE_HEIGHT,
) =>
  getCenterYFromTop(node.position.y, node.measured?.height ?? fallbackHeight);

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

export const Canvas = () => {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const startNodeId = useWorkflowStore((s) => s.startNodeId);
  const endNodeId = useWorkflowStore((s) => s.endNodeId);
  const creationMethod = useWorkflowStore((s) => s.creationMethod);
  const setCreationMethod = useWorkflowStore((s) => s.setCreationMethod);
  const activePlaceholder = useWorkflowStore((s) => s.activePlaceholder);
  const setActivePlaceholder = useWorkflowStore((s) => s.setActivePlaceholder);

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

  const { setCenter } = useReactFlow();

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (node.id.startsWith("placeholder-")) {
        const nodeHeight = node.measured?.height ?? PLACEHOLDER_NODE_HEIGHT;
        const centerY = node.position.y + nodeHeight / 2;

        setActivePlaceholder({
          id: node.id,
          position: {
            x: node.position.x,
            y: getTopYFromCenter(centerY, DEFAULT_FLOW_NODE_HEIGHT),
          },
        });

        const viewportWidth = window.innerWidth;
        const offsetX = viewportWidth * 0.2;

        setCenter(node.position.x + offsetX, centerY, {
          zoom: 1,
          duration: 300,
        });
      } else {
        setActivePlaceholder(null);
      }
    },
    [setActivePlaceholder, setCenter],
  );

  const handlePaneClick = useCallback(() => {
    setActivePlaceholder(null);
  }, [setActivePlaceholder]);

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

  const nodesWithPlaceholders = useMemo(() => {
    const result: Node[] = [...nodes];

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

    if (!endNodeId) {
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

    // 분기 2, 3: 둘 다 설정됨
    if (startNodeId && endNodeId) {
      const startNode = nodes.find((n) => n.id === startNodeId);
      const startX = startNode?.position.x ?? 0;
      const startWidth = startNode
        ? getNodeWidth(startNode)
        : DEFAULT_FLOW_NODE_WIDTH;
      const startCenterY = startNode
        ? getNodeCenterY(startNode)
        : DEFAULT_ROW_CENTER_Y;

      if (!creationMethod) {
        // 분기 2: 생성 방식 미결정 → CreationMethodNode 표시
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
      } else if (creationMethod === "manual") {
        // 분기 3: 수동 생성 → endNode 제외 leaf 뒤에 "다음" placeholder
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

  const isCanvasLocked = activePlaceholder !== null;

  return (
    <ReactFlow
      nodes={nodesWithPlaceholders}
      edges={edges}
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
