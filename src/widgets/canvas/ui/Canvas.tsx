import { useCallback, useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  NotificationNode,
  OutputFormatNode,
  PlaceholderNode,
  SpreadsheetNode,
  StorageNode,
  TriggerNode,
  WebScrapingNode,
} from "@/entities/node";
import { getLeafNodeIds, useWorkflowStore } from "@/shared";

const PLACEHOLDER_OFFSET_X = 280;

const nodeTypes: NodeTypes = {
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
};

export const Canvas = () => {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter(
        (change) => !("id" in change && change.id.startsWith("placeholder-")),
      );
      onNodesChange(filtered);
    },
    [onNodesChange],
  );

  const nodesWithPlaceholders = useMemo(() => {
    if (nodes.length === 0) return nodes;

    const nodeIds = nodes.map((n) => n.id);
    const leafIds = getLeafNodeIds(nodeIds, edges);

    const placeholders: Node[] = leafIds.map((leafId) => {
      const leafNode = nodes.find((n) => n.id === leafId)!;
      return {
        id: `placeholder-${leafId}`,
        type: "placeholder",
        position: {
          x: leafNode.position.x + PLACEHOLDER_OFFSET_X,
          y: leafNode.position.y,
        },
        data: {},
        initialWidth: 100,
        initialHeight: 134,
        selectable: false,
        draggable: false,
      };
    });

    return [...nodes, ...placeholders];
  }, [nodes, edges]);

  return (
    <ReactFlow
      nodes={nodesWithPlaceholders}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
};
