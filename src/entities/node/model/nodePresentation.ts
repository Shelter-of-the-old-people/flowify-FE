import { type IconType } from "react-icons";

import { NODE_REGISTRY } from "./nodeRegistry";
import { getTypedConfig } from "./types";
import {
  type CommunicationNodeConfig,
  type FlowNodeData,
  type StorageNodeConfig,
  type WebScrapingNodeConfig,
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

const STORAGE_SERVICE_TITLE: Record<
  NonNullable<StorageNodeConfig["service"]>,
  string
> = {
  canvas_lms: "Canvas LMS",
  google_drive: "Google Drive",
  notion: "Notion",
};

const COMMUNICATION_SERVICE_TITLE: Record<
  NonNullable<CommunicationNodeConfig["service"]>,
  string
> = {
  gmail: "Gmail",
  slack: "Slack",
};

const WEB_SCRAPING_SERVICE_TITLE: Record<
  NonNullable<WebScrapingNodeConfig["service"]>,
  string
> = {
  canvas_lms: "Canvas LMS",
  coupang: "Coupang",
  github: "GitHub",
  naver_news: "Naver News",
  youtube: "YouTube",
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
    case "communication": {
      const config = getTypedConfig("communication", data.config);
      return config.service
        ? COMMUNICATION_SERVICE_TITLE[config.service]
        : null;
    }
    case "storage": {
      const config = getTypedConfig("storage", data.config);
      return config.service ? STORAGE_SERVICE_TITLE[config.service] : null;
    }
    case "spreadsheet": {
      const config = getTypedConfig("spreadsheet", data.config);
      return config.service ? "Google Sheets" : null;
    }
    case "calendar": {
      const config = getTypedConfig("calendar", data.config);
      return config.service ? "Google Calendar" : null;
    }
    case "web-scraping": {
      const config = getTypedConfig("web-scraping", data.config);
      if (config.service) {
        return WEB_SCRAPING_SERVICE_TITLE[config.service] ?? config.targetUrl;
      }

      return config.targetUrl ?? null;
    }
    case "filter":
    case "loop":
    case "condition":
    case "multi-output":
    case "data-process":
    case "output-format":
    case "early-exit":
    case "notification":
    case "trigger":
      return null;
    case "llm": {
      const config = getTypedConfig("llm", data.config);
      return config.model ?? null;
    }
    default: {
      const _exhaustive: never = data.type;
      return _exhaustive;
    }
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
    iconComponent: meta.iconComponent,
  };
};
