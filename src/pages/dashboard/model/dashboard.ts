import {
  type DashboardIssueResponse,
  type DashboardMetricsResponse,
  type DashboardServiceResponse,
} from "@/entities/dashboard";
import {
  type OAuthTokenSummary,
  isOAuthConnectSupported,
} from "@/entities/oauth-token";
import {
  type NodeDefinitionResponse,
  type WorkflowResponse,
} from "@/entities/workflow";
import {
  type ServiceBadgeKey,
  type ValidationWarning,
  getDateTimestamp,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromNodeConfig,
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
  | "canvas-lms"
  | "discord"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "notion"
  | "slack";

type RecommendedDashboardService = {
  serviceKey: string;
  badgeKey: SupportedServiceKey;
  label: string;
};

const DASHBOARD_SERVICE_LABELS: Record<SupportedServiceKey, string> = {
  calendar: "Google Calendar",
  "canvas-lms": "Canvas LMS",
  discord: "Discord",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  "google-sheets": "Google Sheets",
  notion: "Notion",
  slack: "Slack",
};

const RECOMMENDED_DASHBOARD_SERVICES: RecommendedDashboardService[] = [
  {
    serviceKey: "canvas_lms",
    badgeKey: "canvas-lms",
    label: "Canvas LMS",
  },
  {
    serviceKey: "gmail",
    badgeKey: "gmail",
    label: "Gmail",
  },
  {
    serviceKey: "google_drive",
    badgeKey: "google-drive",
    label: "Google Drive",
  },
  {
    serviceKey: "notion",
    badgeKey: "notion",
    label: "Notion",
  },
  {
    serviceKey: "slack",
    badgeKey: "slack",
    label: "Slack",
  },
];

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

const getBuildProgressLabel = (workflow: WorkflowResponse) => {
  const totalNodes = workflow.nodes.length;
  const configuredNodes = workflow.nodes.filter((node) => {
    const isConfigured = node.config?.["isConfigured"];
    return isConfigured === true;
  }).length;

  return `${configuredNodes}/${totalNodes} 구성`;
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
        workflowId: workflow.id,
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
        serviceKey: token.service,
        statusLabel: "연결됨",
        actionKind: "disconnect",
        actionLabel: "연결 해제",
      };
    });

export const getRecommendedServiceCards = (tokens: OAuthTokenSummary[]) => {
  const connectedServiceKeys = new Set(
    tokens.filter((token) => token.connected).map((token) => token.service),
  );

  return RECOMMENDED_DASHBOARD_SERVICES.filter(({ serviceKey }) => {
    return (
      isOAuthConnectSupported(serviceKey) &&
      !connectedServiceKeys.has(serviceKey)
    );
  }).map<DashboardServiceCard>(({ serviceKey, badgeKey, label }) => ({
    id: `recommended-${serviceKey}`,
    label,
    badgeKey,
    serviceKey,
    statusLabel: "인증 전",
    actionKind: "connect",
    actionLabel: "연결 시작",
  }));
};

export const formatDashboardDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const getDashboardMetrics = (
  metrics: DashboardMetricsResponse | null | undefined,
): DashboardMetric[] => {
  const labelsById = new Map(
    DASHBOARD_METRICS.map((metric) => [metric.id, metric.label]),
  );

  return [
    {
      id: "today-processed",
      label: labelsById.get("today-processed") ?? "Today processed",
      value: String(metrics?.todayProcessedCount ?? 0),
    },
    {
      id: "total-processed",
      label: labelsById.get("total-processed") ?? "Total processed",
      value: String(metrics?.totalProcessedCount ?? 0),
    },
    {
      id: "total-duration",
      label: labelsById.get("total-duration") ?? "Total duration",
      value: formatDashboardDuration(metrics?.totalDurationMs ?? 0),
    },
  ];
};

export const getDashboardIssuesFromSummary = (
  issues: DashboardIssueResponse[] | null | undefined,
): DashboardIssue[] =>
  (issues ?? []).map((issue) => {
    const fallbackMessage = issue.message?.trim() || issue.type;
    const items = issue.items ?? [];

    return {
      id: issue.id,
      workflowId: issue.workflowId,
      name: issue.workflowName?.trim() || fallbackMessage || "Workflow",
      isActive: issue.isActive,
      startBadgeKey: getServiceBadgeKeyFromService(issue.startService),
      endBadgeKey: getServiceBadgeKeyFromService(issue.endService),
      relativeUpdateLabel: getRelativeTimeLabel(issue.occurredAt ?? "", {
        suffix: "발생",
      }),
      buildProgressLabel: fallbackMessage || "Issue",
      items:
        items.length > 0
          ? items.map<DashboardIssueItem>((item) => ({
              id: item.id,
              badgeKey: getServiceBadgeKeyFromService(item.service),
              message: item.message?.trim() || fallbackMessage || "Issue",
            }))
          : [
              {
                id: `${issue.id}-message`,
                badgeKey: "unknown",
                message: fallbackMessage || "Issue",
              },
            ],
    };
  });

const toOAuthTokenSummaries = (
  services: DashboardServiceResponse[] | null | undefined,
): OAuthTokenSummary[] =>
  (services ?? [])
    .filter(
      (service): service is DashboardServiceResponse & { service: string } =>
        typeof service.service === "string" && service.service.length > 0,
    )
    .map((service) => ({
      service: service.service,
      connected: service.connected,
      accountEmail: service.accountEmail,
      expiresAt: service.expiresAt,
      aliasOf: service.aliasOf,
      disconnectable: service.disconnectable,
      reason: service.reason,
    }));

export const getConnectedServiceCardsFromSummary = (
  services: DashboardServiceResponse[] | null | undefined,
) => getConnectedServiceCards(toOAuthTokenSummaries(services));

export const getRecommendedServiceCardsFromSummary = (
  services: DashboardServiceResponse[] | null | undefined,
) => getRecommendedServiceCards(toOAuthTokenSummaries(services));
