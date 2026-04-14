import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import { type ValidationWarning } from "@/shared";

export type WorkflowStatus = "active" | "inactive";

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
  active: boolean;
  createdAt: string;
  updatedAt: string;
  warnings?: ValidationWarning[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  active: boolean;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export const getWorkflowStatus = (active: boolean): WorkflowStatus =>
  active ? "active" : "inactive";
