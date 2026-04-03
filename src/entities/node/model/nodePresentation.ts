import type { IconType } from "react-icons";
import { MdApps } from "react-icons/md";

import { NODE_REGISTRY } from "./nodeRegistry";
import type {
  CommunicationNodeConfig,
  FlowNodeData,
  StorageNodeConfig,
} from "./types";

export type NodeRole = "source" | "process" | "destination";

export type NodeSurfaceState =
  | "pending"
  | "ready"
  | "auth_required"
  | "incompatible"
  | "running";

export interface NodePresentationContext {
  nodeId: string;
  startNodeId: string | null;
  endNodeId: string | null;
}

export interface NodePresentation {
  role: NodeRole;
  roleLabel: string;
  title: string;
  helperText: string | null;
  surfaceState: NodeSurfaceState;
  iconComponent: IconType;
}

const TEMPORARY_ICON = MdApps;

const STORAGE_SERVICE_TITLE: Record<
  NonNullable<StorageNodeConfig["service"]>,
  string
> = {
  "google-drive": "Google Drive",
  notion: "Notion",
};

const COMMUNICATION_SERVICE_TITLE: Record<
  NonNullable<CommunicationNodeConfig["service"]>,
  string
> = {
  gmail: "Gmail",
  slack: "Slack",
};

export const getNodeRole = ({
  nodeId,
  startNodeId,
  endNodeId,
}: NodePresentationContext): NodeRole => {
  if (nodeId === startNodeId) return "source";
  if (nodeId === endNodeId) return "destination";
  return "process";
};

const getRoleLabel = (role: NodeRole): string => {
  switch (role) {
    case "source":
      return "가져올 곳";
    case "destination":
      return "보낼 곳";
    case "process":
    default:
      return "중간 처리";
  }
};

const getConfiguredTitle = (data: FlowNodeData): string | null => {
  switch (data.type) {
    case "storage": {
      const service = (data.config as StorageNodeConfig).service;
      return service ? STORAGE_SERVICE_TITLE[service] : null;
    }
    case "communication": {
      const service = (data.config as CommunicationNodeConfig).service;
      return service ? COMMUNICATION_SERVICE_TITLE[service] : null;
    }
    default:
      return null;
  }
};

const getSurfaceState = (data: FlowNodeData): NodeSurfaceState => {
  return data.config.isConfigured ? "ready" : "pending";
};

const getHelperText = (
  role: NodeRole,
  surfaceState: NodeSurfaceState,
): string | null => {
  if (surfaceState !== "pending") {
    return null;
  }

  switch (role) {
    case "source":
      return "어디서 가져올까요?";
    case "destination":
      return "어디로 보낼까요?";
    case "process":
    default:
      return "무엇을 하게 할까요?";
  }
};

export const getNodePresentation = (
  data: FlowNodeData,
  context: NodePresentationContext,
): NodePresentation => {
  const meta = NODE_REGISTRY[data.type];
  const role = getNodeRole(context);
  const surfaceState = getSurfaceState(data);
  const configuredTitle = getConfiguredTitle(data);
  const fallbackTitle = data.label.trim() || meta.label;

  return {
    role,
    roleLabel: getRoleLabel(role),
    title: configuredTitle ?? fallbackTitle,
    helperText: getHelperText(role, surfaceState),
    surfaceState,
    iconComponent: TEMPORARY_ICON,
  };
};
