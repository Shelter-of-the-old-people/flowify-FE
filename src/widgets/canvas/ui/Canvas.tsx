import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
  SpreadsheetNode,
  StorageNode,
  TriggerNode,
  WebScrapingNode,
} from "@/entities/node";
import { useWorkflowStore } from "@/shared";

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
};

export const Canvas = () => {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
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
