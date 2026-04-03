import type { ComponentType } from "react";

import type { FlowNodeData, NodeType } from "@/entities/node";

export interface NodePanelProps {
  nodeId: string;
  data: FlowNodeData;
}

export type NodePanelComponent = ComponentType<NodePanelProps>;

export type NodePanelRegistry = Partial<Record<NodeType, NodePanelComponent>>;
