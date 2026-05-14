import { useMemo } from "react";
import { useNavigate } from "react-router";

import {
  type WorkflowResponse,
  getNodeStatusMissingFieldLabel,
  useWorkflowQuery,
} from "@/entities/workflow";
import {
  type ServiceBadgeKey,
  buildPath,
  getServiceBadgeKeyFromNodeConfig,
  getServiceBadgeKeyFromService,
} from "@/shared";

import { type DashboardIssue } from "../model";

import { DashboardErrorCard } from "./DashboardErrorCard";

type Props = {
  issue: DashboardIssue;
  isExpanded: boolean;
  onToggle: () => void;
};

type MissingFieldLookup = {
  workflowMissingFieldLabels: string[];
  missingFieldLabelsByBadgeKey: Partial<Record<ServiceBadgeKey, string[]>>;
};

const getStringConfigValue = (
  config: Record<string, unknown>,
  keys: string[],
) => {
  const value = keys
    .map((key) => config[key])
    .find((candidate) => typeof candidate === "string");

  return typeof value === "string" ? value : null;
};

const getWorkflowNodeBadgeKey = (
  node: WorkflowResponse["nodes"][number],
): ServiceBadgeKey => {
  const service = getStringConfigValue(node.config, [
    "service",
    "serviceKey",
    "eventService",
    "source_service",
    "sourceService",
  ]);
  const sourceMode = getStringConfigValue(node.config, [
    "source_mode",
    "sourceMode",
  ]);
  const configBadgeKey = getServiceBadgeKeyFromNodeConfig(service, sourceMode);

  if (configBadgeKey !== "unknown") {
    return configBadgeKey;
  }

  const typeBadgeKey = getServiceBadgeKeyFromService(node.type);

  if (typeBadgeKey !== "unknown") {
    return typeBadgeKey;
  }

  return getServiceBadgeKeyFromService(node.category);
};

const getUniqueMissingFieldLabels = (missingFields: string[] | null) =>
  Array.from(
    new Set((missingFields ?? []).map(getNodeStatusMissingFieldLabel)),
  );

const getWorkflowMissingFieldLookup = (
  workflow: WorkflowResponse | undefined,
): MissingFieldLookup => {
  const missingFieldLabelsByBadgeKey: Partial<
    Record<ServiceBadgeKey, string[]>
  > = {};
  const workflowMissingFieldLabels: string[] = [];
  const nodeStatusesById = new Map(
    (workflow?.nodeStatuses ?? []).map((nodeStatus) => [
      nodeStatus.nodeId,
      nodeStatus,
    ]),
  );

  for (const node of workflow?.nodes ?? []) {
    const nodeStatus = nodeStatusesById.get(node.id);
    const missingFieldLabels = getUniqueMissingFieldLabels(
      nodeStatus?.missingFields ?? null,
    );

    if (missingFieldLabels.length === 0) {
      continue;
    }

    const badgeKey = getWorkflowNodeBadgeKey(node);
    const currentLabels = missingFieldLabelsByBadgeKey[badgeKey] ?? [];
    const nextLabels = Array.from(
      new Set([...currentLabels, ...missingFieldLabels]),
    );

    missingFieldLabelsByBadgeKey[badgeKey] = nextLabels;
    workflowMissingFieldLabels.push(...missingFieldLabels);
  }

  return {
    workflowMissingFieldLabels: Array.from(new Set(workflowMissingFieldLabels)),
    missingFieldLabelsByBadgeKey,
  };
};

export const DashboardIssueCardItem = ({
  issue,
  isExpanded,
  onToggle,
}: Props) => {
  const navigate = useNavigate();
  const workflowId =
    typeof issue.workflowId === "string" ? issue.workflowId.trim() : "";
  const canOpenWorkflow = workflowId.length > 0;
  const { data: workflow } = useWorkflowQuery(
    canOpenWorkflow ? workflowId : undefined,
    {
      enabled: canOpenWorkflow,
      staleTime: 30_000,
    },
  );
  const { workflowMissingFieldLabels, missingFieldLabelsByBadgeKey } = useMemo(
    () => getWorkflowMissingFieldLookup(workflow),
    [workflow],
  );

  const handleOpenWorkflow = () => {
    if (!canOpenWorkflow) {
      return;
    }

    navigate(buildPath.workflowEditor(workflowId));
  };

  return (
    <DashboardErrorCard
      issue={issue}
      isExpanded={isExpanded}
      canOpenWorkflow={canOpenWorkflow}
      workflowMissingFieldLabels={workflowMissingFieldLabels}
      missingFieldLabelsByBadgeKey={missingFieldLabelsByBadgeKey}
      onOpenWorkflow={handleOpenWorkflow}
      onToggle={onToggle}
    />
  );
};
