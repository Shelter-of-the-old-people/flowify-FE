import type { Edge, Node } from "@xyflow/react";

import type { FlowNodeData } from "@/entities/node";

export type WorkflowStatus = "active" | "inactive";

export type ExecutionStatus = "idle" | "running" | "success" | "failed";

export interface TriggerConfig {
  type: "manual" | "schedule" | "event";
  schedule?: string;
  eventService?: string;
  eventType?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  userId: string;
  sharedWith: string[];
  isTemplate: boolean;
  templateId: string | null;
  trigger: TriggerConfig | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowSummary = Pick<
  Workflow,
  | "id"
  | "name"
  | "description"
  | "status"
  | "isActive"
  | "createdAt"
  | "updatedAt"
>;
