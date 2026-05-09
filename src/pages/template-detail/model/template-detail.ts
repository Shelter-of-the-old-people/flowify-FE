import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type TemplateDetail,
  getTemplateCategoryLabel,
  getTemplateCategorySummary,
  getTemplateDisplayDescription,
  getTemplateRuntimeNote,
} from "@/entities/template";
import { toFlowEdge, toFlowNode } from "@/entities/workflow";

type TemplateMetaItem = {
  label: string;
  value: string;
};

export type TemplatePreviewGraph = {
  edges: Edge[];
  endNodeIds: string[];
  endNodeId: string | null;
  nodes: Node<FlowNodeData>[];
  startNodeId: string | null;
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getTemplateDescription = (
  template: Pick<TemplateDetail, "category" | "description" | "name">,
) => getTemplateDisplayDescription(template);

export const getTemplatePreviewSummary = (template: TemplateDetail) => {
  const description = getTemplateDisplayDescription(template);

  if (description.trim().length > 0) {
    return description;
  }

  return getTemplateCategorySummary(template.category);
};

export const getTemplateRuntimeSummary = (
  template: Pick<TemplateDetail, "category" | "description" | "name">,
) => getTemplateRuntimeNote(template);

export const getTemplateMetaItems = (
  template: TemplateDetail,
): TemplateMetaItem[] => [
  {
    label: "카테고리",
    value: getTemplateCategoryLabel(template.category),
  },
  {
    label: "노드",
    value: `${template.nodes.length}개`,
  },
  {
    label: "연결",
    value: `${template.edges.length}개`,
  },
  {
    label: "사용",
    value: `${template.useCount}회`,
  },
  {
    label: "생성일",
    value: formatCreatedAt(template.createdAt),
  },
];

export const buildTemplatePreviewGraph = (
  template: TemplateDetail,
): TemplatePreviewGraph => {
  const nodes = template.nodes.map(toFlowNode);
  const edges = template.edges.map(toFlowEdge);
  const startNodeId =
    template.nodes.find((node) => node.role === "start")?.id ?? null;
  const endNodeIds = template.nodes
    .filter((node) => node.role === "end")
    .map((node) => node.id);

  return {
    nodes,
    edges,
    startNodeId,
    endNodeIds,
    endNodeId: endNodeIds[0] ?? null,
  };
};
