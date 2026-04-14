import { type OAuthTokenSummary } from "@/entities/oauth-token";
import {
  type NodeDefinitionResponse,
  type WorkflowResponse,
} from "@/entities/workflow";
import {
  type ServiceBadgeKey,
  type ValidationWarning,
  getDateTimestamp,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromService,
} from "@/shared";

import {
  type DashboardIssue,
  type DashboardIssueItem,
  type DashboardMetric,
  type DashboardServiceCard,
} from "./types";

type SupportedServiceKey =
  | "calendar"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "notion"
  | "slack";

const DASHBOARD_SERVICE_PRIORITY: SupportedServiceKey[] = [
  "calendar",
  "notion",
  "google-drive",
  "gmail",
  "google-sheets",
  "slack",
];

const DASHBOARD_SERVICE_LABELS: Record<SupportedServiceKey, string> = {
  calendar: "Google Calendar",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  "google-sheets": "Google Sheets",
  notion: "Notion",
  slack: "Slack",
};

export const DASHBOARD_METRICS: DashboardMetric[] = [
  {
    id: "today-processed",
    label: "오늘 처리량",
    value: "000",
  },
  {
    id: "total-processed",
    label: "누적 처리량",
    value: "000",
  },
  {
    id: "total-duration",
    label: "누적 실행 시간",
    value: "00:00:00",
  },
];

export const sortWorkflowsByUpdatedAtDesc = (workflows: WorkflowResponse[]) =>
  [...workflows].sort(
    (leftWorkflow, rightWorkflow) =>
      getDateTimestamp(rightWorkflow.updatedAt) -
      getDateTimestamp(leftWorkflow.updatedAt),
  );

const getEndpointNodes = (workflow: WorkflowResponse) => {
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

const getWorkflowServiceBadgeKey = (
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

const getBuildProgressLabel = (workflow: WorkflowResponse) => {
  const totalNodes = workflow.nodes.length;
  const configuredNodes = workflow.nodes.filter((node) => {
    const isConfigured = node.config?.["isConfigured"];
    return isConfigured === true;
  }).length;

  return `${configuredNodes}/${totalNodes} 구축`;
};

const getWorkflowWarningMessages = (workflow: WorkflowResponse) =>
  workflow.warnings?.map((warning) => warning.message).filter(Boolean) ?? [];

const getFallbackBadgeKeyFromWarning = (warning: ValidationWarning) => {
  const targetBadgeKey = getServiceBadgeKeyFromService(warning.targetType);
  if (targetBadgeKey !== "unknown") {
    return targetBadgeKey;
  }

  const sourceBadgeKey = getServiceBadgeKeyFromService(warning.sourceType);
  if (sourceBadgeKey !== "unknown") {
    return sourceBadgeKey;
  }

  return "unknown";
};

const getDashboardIssueItems = (
  workflow: WorkflowResponse,
): DashboardIssueItem[] =>
  workflow.warnings?.map((warning, index) => {
    const relatedNode =
      workflow.nodes.find((node) => node.id === warning.nodeId) ?? null;

    return {
      id: `${workflow.id}-warning-${index}`,
      badgeKey: relatedNode
        ? getWorkflowServiceBadgeKey(relatedNode)
        : getFallbackBadgeKeyFromWarning(warning),
      message: warning.message,
    };
  }) ?? [];

const getServiceLabelFromBadgeKey = (badgeKey: ServiceBadgeKey) => {
  if (badgeKey in DASHBOARD_SERVICE_LABELS) {
    return DASHBOARD_SERVICE_LABELS[badgeKey as SupportedServiceKey];
  }

  return "Unknown";
};

export const getDashboardIssues = (workflows: WorkflowResponse[]) =>
  sortWorkflowsByUpdatedAtDesc(workflows)
    .filter((workflow) => getWorkflowWarningMessages(workflow).length > 0)
    .slice(0, 2)
    .map<DashboardIssue>((workflow) => {
      const { startNode, endNode } = getEndpointNodes(workflow);

      return {
        id: workflow.id,
        name: workflow.name,
        isActive: workflow.active,
        startBadgeKey: getWorkflowServiceBadgeKey(startNode),
        endBadgeKey: getWorkflowServiceBadgeKey(endNode),
        relativeUpdateLabel: getRelativeTimeLabel(workflow.updatedAt, {
          suffix: "변경됨",
        }),
        buildProgressLabel: getBuildProgressLabel(workflow),
        items: getDashboardIssueItems(workflow),
      };
    });

export const getConnectedServiceCards = (tokens: OAuthTokenSummary[]) =>
  tokens
    .filter((token) => token.connected)
    .map<DashboardServiceCard>((token) => {
      const badgeKey = getServiceBadgeKeyFromService(token.service);

      return {
        id: `connected-${token.service}`,
        label:
          badgeKey === "unknown"
            ? token.service
            : getServiceLabelFromBadgeKey(badgeKey),
        badgeKey,
        statusLabel: "연결됨",
      };
    });

export const getRecommendedServiceCards = (tokens: OAuthTokenSummary[]) => {
  const connectedKeys = new Set(
    tokens
      .filter((token) => token.connected)
      .map((token) => getServiceBadgeKeyFromService(token.service)),
  );

  return DASHBOARD_SERVICE_PRIORITY.filter((serviceKey) => {
    return !connectedKeys.has(serviceKey);
  })
    .slice(0, 4)
    .map<DashboardServiceCard>((serviceKey) => ({
      id: `recommended-${serviceKey}`,
      label: DASHBOARD_SERVICE_LABELS[serviceKey],
      badgeKey: serviceKey,
      statusLabel: "인증 전",
    }));
};
