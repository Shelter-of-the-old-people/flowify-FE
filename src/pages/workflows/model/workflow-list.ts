import {
  type NodeDefinitionResponse,
  type WorkflowListResponse,
  type WorkflowResponse,
  getWorkflowTriggerDisplayLabel,
  normalizeWorkflowTrigger,
} from "@/entities/workflow";
import {
  getDateTimestamp,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromNodeConfig,
  getServiceBadgeKeyFromService,
} from "@/shared";

import { type ServiceBadgeKey } from "./types";

export const getWorkflowListPageContent = (page: {
  content?: WorkflowListResponse["content"];
}): WorkflowResponse[] => page.content ?? [];

export const sortWorkflowsByUpdatedAtDesc = (workflows: WorkflowResponse[]) =>
  [...workflows].sort(
    (leftWorkflow, rightWorkflow) =>
      getDateTimestamp(rightWorkflow.updatedAt) -
      getDateTimestamp(leftWorkflow.updatedAt),
  );

export type WorkflowListPrimaryActionKind =
  | "run"
  | "stop"
  | "enable-auto-run"
  | "disable-auto-run"
  | "disable-auto-run-and-stop";

const isWorkflowOwner = (
  workflow: WorkflowResponse,
  viewerUserId: string | null,
) => Boolean(viewerUserId && workflow.userId === viewerUserId);

export const canToggleWorkflowAutoRun = (
  workflow: WorkflowResponse,
  viewerUserId: string | null,
) =>
  normalizeWorkflowTrigger(workflow.trigger).type === "schedule" &&
  isWorkflowOwner(workflow, viewerUserId);

export const getWorkflowListTriggerDisplayLabel = (
  workflow: WorkflowResponse,
) => getWorkflowTriggerDisplayLabel(workflow.trigger);

export const getWorkflowListPrimaryActionKind = (
  workflow: WorkflowResponse,
  isRunning: boolean,
): WorkflowListPrimaryActionKind => {
  const trigger = normalizeWorkflowTrigger(workflow.trigger);

  if (trigger.type !== "schedule") {
    return isRunning ? "stop" : "run";
  }

  if (isRunning) {
    return workflow.active ? "disable-auto-run-and-stop" : "stop";
  }

  return workflow.active ? "disable-auto-run" : "enable-auto-run";
};

export const getWorkflowListPrimaryActionLabel = (
  kind: WorkflowListPrimaryActionKind,
) => {
  switch (kind) {
    case "run":
      return "워크플로우 실행";
    case "stop":
      return "워크플로우 중지";
    case "enable-auto-run":
      return "자동실행 켜기";
    case "disable-auto-run":
      return "자동실행 끄기";
    case "disable-auto-run-and-stop":
      return "자동실행 끄고 중지";
  }
};

export const getRelativeUpdateLabel = (updatedAt: string) =>
  getRelativeTimeLabel(updatedAt, {
    suffix: "변경됨",
  });

export const getBuildProgressLabel = (workflow: WorkflowResponse) => {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const totalNodes = nodes.length;
  const configuredNodes = nodes.filter((node) => {
    const isConfigured = node.config?.["isConfigured"];
    return isConfigured === true;
  }).length;

  return `${configuredNodes}/${totalNodes} 구성`;
};

export const getWorkflowWarningMessages = (workflow: WorkflowResponse) =>
  workflow.warnings?.map((warning) => warning.message).filter(Boolean) ?? [];

export const getEndpointNodes = (workflow: WorkflowResponse) => {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const startNode =
    nodes.find((node) => node.role === "start") ?? nodes[0] ?? null;
  const endNode =
    nodes.find((node) => node.role === "end") ?? nodes.at(-1) ?? startNode;

  return { startNode, endNode };
};

export const getServiceBadgeKey = (
  node: NodeDefinitionResponse | null,
): ServiceBadgeKey => {
  if (!node) {
    return "unknown";
  }

  const serviceBadgeKey = getServiceBadgeKeyFromNodeConfig(
    node.config?.["service"],
    node.config?.["source_mode"],
  );
  if (serviceBadgeKey !== "unknown") {
    return serviceBadgeKey;
  }

  const typeBadgeKey = getServiceBadgeKeyFromService(node.type);
  if (typeBadgeKey !== "unknown") {
    return typeBadgeKey;
  }

  switch (node.type) {
    case "calendar":
      return "calendar";
    case "communication":
      return "communication";
    case "storage":
      return "storage";
    case "spreadsheet":
      return "spreadsheet";
    case "web-scraping":
      return "web-scraping";
    case "notification":
      return "notification";
    case "llm":
      return "llm";
    case "trigger":
      return "trigger";
    case "data-process":
    case "condition":
    case "loop":
    case "filter":
    case "multi-output":
    case "output-format":
    case "early-exit":
      return "processing";
    default:
      return "unknown";
  }
};
