import {
  type NodeDefinitionResponse,
  type WorkflowResponse,
  getDateTimestamp,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromService,
} from "@/shared";

import { type ServiceBadgeKey, type WorkflowFilterKey } from "./types";

export const sortWorkflowsByUpdatedAtDesc = (workflows: WorkflowResponse[]) =>
  [...workflows].sort(
    (leftWorkflow, rightWorkflow) =>
      getDateTimestamp(rightWorkflow.updatedAt) -
      getDateTimestamp(leftWorkflow.updatedAt),
  );

export const filterWorkflowsByStatus = (
  workflows: WorkflowResponse[],
  activeFilter: WorkflowFilterKey,
) => {
  switch (activeFilter) {
    case "active":
      return workflows.filter((workflow) => workflow.active);
    case "inactive":
      return workflows.filter((workflow) => !workflow.active);
    case "all":
    default:
      return workflows;
  }
};

export const getRelativeUpdateLabel = (updatedAt: string) =>
  getRelativeTimeLabel(updatedAt, {
    suffix: "변경됨",
  });

export const getBuildProgressLabel = (workflow: WorkflowResponse) => {
  const totalNodes = workflow.nodes.length;
  const configuredNodes = workflow.nodes.filter((node) => {
    const isConfigured = node.config?.["isConfigured"];
    return isConfigured === true;
  }).length;

  return `${configuredNodes}/${totalNodes} 구축`;
};

export const getWorkflowWarningMessages = (workflow: WorkflowResponse) =>
  workflow.warnings?.map((warning) => warning.message).filter(Boolean) ?? [];

export const getEndpointNodes = (workflow: WorkflowResponse) => {
  const startNode =
    workflow.nodes.find((node) => node.role === "start") ??
    workflow.nodes[0] ??
    null;
  const endNode =
    workflow.nodes.find((node) => node.role === "end") ??
    workflow.nodes.at(-1) ??
    startNode;

  return { startNode, endNode };
};

export const getServiceBadgeKey = (
  node: NodeDefinitionResponse | null,
): ServiceBadgeKey => {
  if (!node) {
    return "unknown";
  }

  const service = node.config?.["service"];
  if (typeof service === "string") {
    const serviceBadgeKey = getServiceBadgeKeyFromService(service);
    if (serviceBadgeKey !== "unknown") {
      return serviceBadgeKey;
    }
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
