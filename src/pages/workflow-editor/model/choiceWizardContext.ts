import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type ChoiceQueryContext,
  type ChoiceSelectContext,
} from "@/entities/workflow";

const SERVICE_KEY_TO_CONTEXT_SERVICE: Record<string, string> = {
  coupang: "쿠팡",
  github: "GitHub",
  google_calendar: "Google Calendar",
  naver_news: "네이버 뉴스",
  youtube: "유튜브",
};

type ChoiceContextParams = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  anchorNodeId: string | null;
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeService = (service: string | null): string | null => {
  if (!service) {
    return null;
  }

  return SERVICE_KEY_TO_CONTEXT_SERVICE[service] ?? service;
};

const getConfig = (node: Node<FlowNodeData>) => toRecord(node.data.config);

const readService = (node: Node<FlowNodeData>) =>
  normalizeService(toStringValue(getConfig(node)?.["service"]));

const readFileSubtype = (node: Node<FlowNodeData>) => {
  const config = getConfig(node);
  return (
    toStringValue(config?.["file_subtype"]) ??
    toStringValue(config?.["fileSubtype"])
  );
};

const readFields = (node: Node<FlowNodeData>) => {
  const config = getConfig(node);
  const fields = toStringList(config?.["fields"]);
  return fields.length > 0 ? fields : toStringList(config?.["outputFields"]);
};

const getNodeLookup = (nodes: Node<FlowNodeData>[]) =>
  new Map(nodes.map((node) => [node.id, node]));

const getUpstreamNodes = ({
  anchorNodeId,
  edges,
  nodes,
}: Pick<ChoiceContextParams, "anchorNodeId" | "edges" | "nodes">) => {
  if (!anchorNodeId) {
    return [];
  }

  const nodeLookup = getNodeLookup(nodes);
  const result: Node<FlowNodeData>[] = [];
  const visited = new Set<string>();
  const queue = [anchorNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);

    const node = nodeLookup.get(nodeId);
    if (node) {
      result.push(node);
    }

    edges
      .filter((edge) => edge.target === nodeId)
      .forEach((edge) => queue.push(edge.source));
  }

  return result;
};

const firstNonNull = <T>(values: T[]): NonNullable<T> | null =>
  (values.find((value) => value != null) as NonNullable<T> | undefined) ?? null;

export const deriveChoiceQueryContext = ({
  anchorNodeId,
  edges,
  nodes,
}: ChoiceContextParams): ChoiceQueryContext | undefined => {
  const upstreamNodes = getUpstreamNodes({ anchorNodeId, edges, nodes });
  const service = firstNonNull(upstreamNodes.map(readService));
  const fileSubtype = firstNonNull(upstreamNodes.map(readFileSubtype));

  return service || fileSubtype
    ? {
        ...(service ? { service } : {}),
        ...(fileSubtype ? { file_subtype: fileSubtype } : {}),
      }
    : undefined;
};

export const deriveChoiceSelectContext = (
  params: ChoiceContextParams,
): ChoiceSelectContext | undefined => {
  const queryContext = deriveChoiceQueryContext(params);
  const upstreamNodes = getUpstreamNodes(params);
  const fields = firstNonNull(
    upstreamNodes
      .map(readFields)
      .map((values) => (values.length > 0 ? values : null)),
  );

  return queryContext || fields
    ? {
        ...(queryContext ?? {}),
        ...(fields ? { fields } : {}),
      }
    : undefined;
};
