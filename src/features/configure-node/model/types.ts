import { type ComponentType } from "react";

import { type FlowNodeData, type NodeType } from "@/entities/node";

export interface NodePanelProps {
  nodeId: string;
  data: FlowNodeData;
  readOnly?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
}

export type NodePanelComponent = ComponentType<NodePanelProps>;

export type NodePanelRegistry = Partial<Record<NodeType, NodePanelComponent>>;
