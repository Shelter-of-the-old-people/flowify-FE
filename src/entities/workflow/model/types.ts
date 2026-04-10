import type { Edge, Node } from "@xyflow/react";

import type { FlowNodeData } from "@/entities/node";
import type { ValidationWarning } from "@/shared";

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
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  userId: string;
  sharedWith?: string[];
  isTemplate?: boolean;
  templateId?: string | null;
  trigger: TriggerConfig | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warnings?: ValidationWarning[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export const getWorkflowStatus = (isActive: boolean): WorkflowStatus =>
  isActive ? "active" : "inactive";
