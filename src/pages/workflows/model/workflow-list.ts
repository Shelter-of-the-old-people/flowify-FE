import {
  type NodeDefinitionResponse,
  type WorkflowListResponse,
  type WorkflowResponse,
  normalizeWorkflowTrigger,
} from "@/entities/workflow";
import {
  getDateTimestamp,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromNodeConfig,
  getServiceBadgeKeyFromService,
} from "@/shared";

import { type ServiceBadgeKey, type WorkflowFilterKey } from "./types";

export const getWorkflowListPageContent = (page: {
  content?: WorkflowListResponse["content"];
}): WorkflowResponse[] => page.content ?? [];

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

export type WorkflowAutoRunState =
  | {
      kind: "manual";
      label: "수동 실행";
      canToggle: false;
      nextActive: null;
    }
  | {
      kind: "enabled";
      label: "자동 실행 켜짐";
      canToggle: boolean;
      nextActive: false;
    }
  | {
      kind: "disabled";
      label: "자동 실행 꺼짐";
      canToggle: boolean;
      nextActive: true;
    };

const isWorkflowOwner = (
  workflow: WorkflowResponse,
  viewerUserId: string | null,
) => Boolean(viewerUserId && workflow.userId === viewerUserId);

export const getWorkflowAutoRunState = (
  workflow: WorkflowResponse,
  viewerUserId: string | null,
): WorkflowAutoRunState => {
  const trigger = normalizeWorkflowTrigger(workflow.trigger);

  if (trigger.type !== "schedule") {
    return {
      kind: "manual",
      label: "수동 실행",
      canToggle: false,
      nextActive: null,
    };
  }

  const canToggle = isWorkflowOwner(workflow, viewerUserId);

  if (workflow.active) {
    return {
      kind: "enabled",
      label: "자동 실행 켜짐",
      canToggle,
      nextActive: false,
    };
  }

  return {
    kind: "disabled",
    label: "자동 실행 꺼짐",
    canToggle,
    nextActive: true,
  };
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
