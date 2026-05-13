import { getNodeStatusSummaryLabel } from "@/entities/workflow";

export type NodeVisualIssueTone = "error" | "warning";

export type NodeVisualIssue = {
  tone: NodeVisualIssueTone;
  message: string;
};

type NodeStatusSummarySource = {
  configured: boolean;
  executable: boolean;
  missingFields: readonly string[] | null;
};

type ResolveNodeVisualIssueParameters = {
  runtimeIssue?: NodeVisualIssue | null;
  nodeStatus?: NodeStatusSummarySource | null;
};

export const resolveNodeVisualIssue = ({
  runtimeIssue,
  nodeStatus,
}: ResolveNodeVisualIssueParameters): NodeVisualIssue | null => {
  if (runtimeIssue) {
    return runtimeIssue;
  }

  const statusMessage = nodeStatus
    ? getNodeStatusSummaryLabel(nodeStatus)
    : null;

  return statusMessage
    ? {
        tone: "warning",
        message: statusMessage,
      }
    : null;
};
