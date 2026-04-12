import { type NodeDefinitionResponse, type WorkflowResponse } from "@/shared";

import { type ServiceBadgeKey } from "./types";

export const getUpdatedTimestamp = (updatedAt: string) => {
  const updatedTime = new Date(updatedAt).getTime();
  return Number.isNaN(updatedTime) ? 0 : updatedTime;
};

export const sortWorkflowsByUpdatedAtDesc = (workflows: WorkflowResponse[]) =>
  [...workflows].sort(
    (leftWorkflow, rightWorkflow) =>
      getUpdatedTimestamp(rightWorkflow.updatedAt) -
      getUpdatedTimestamp(leftWorkflow.updatedAt),
  );

export const getRelativeUpdateLabel = (updatedAt: string) => {
  const updatedTime = getUpdatedTimestamp(updatedAt);
  if (updatedTime === 0) {
    return "방금 전 변경됨";
  }

  const diffMs = Math.max(0, Date.now() - updatedTime);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < minuteMs) {
    return "방금 전 변경됨";
  }

  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}분 전 변경됨`;
  }

  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}시간 전 변경됨`;
  }

  if (diffMs < weekMs) {
    return `${Math.floor(diffMs / dayMs)}일 전 변경됨`;
  }

  return `${Math.floor(diffMs / weekMs)}주 전 변경됨`;
};

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
    switch (service) {
      case "google-calendar":
        return "calendar";
      case "gmail":
        return "gmail";
      case "google-drive":
        return "google-drive";
      case "google-sheets":
        return "google-sheets";
      case "notion":
        return "notion";
      case "slack":
        return "slack";
      default:
        break;
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
