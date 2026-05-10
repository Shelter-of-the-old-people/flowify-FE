import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import { type ValidationWarning } from "@/shared";

export type WorkflowStatus = "active" | "inactive";

export type WorkflowTriggerType = "manual" | "schedule";
export type WorkflowScheduleMode = "interval" | "daily" | "weekly";
export type WorkflowWeekday =
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT"
  | "SUN";

export interface WorkflowTriggerConfig {
  schedule_mode?: WorkflowScheduleMode;
  cron?: string;
  timezone?: string;
  interval_hours?: number;
  time_of_day?: string;
  weekdays?: WorkflowWeekday[];
  skip_if_running?: boolean;
}

export interface TriggerConfig {
  type: WorkflowTriggerType;
  config: WorkflowTriggerConfig;
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
