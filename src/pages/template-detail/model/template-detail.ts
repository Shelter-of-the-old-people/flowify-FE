import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import { type TemplateDetail } from "@/entities/template";
import { toFlowEdge, toFlowNode } from "@/entities/workflow";

type TemplateMetaItem = {
  label: string;
  value: string;
};

export type TemplatePreviewGraph = {
  edges: Edge[];
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

export const getTemplateDescription = (description: string) =>
  description?.trim().length > 0
    ? description
    : "설명이 아직 없는 템플릿입니다.";

export const getTemplatePreviewSummary = (template: TemplateDetail) => {
  if (template.description?.trim().length) {
    return template.description.trim();
  }

  return "템플릿의 핵심 흐름과 연결에 필요한 서비스를 한눈에 확인할 수 있습니다.";
};

export const getTemplateMetaItems = (
  template: TemplateDetail,
): TemplateMetaItem[] => [
  {
    label: "카테고리",
    value: template.category ?? "미분류",
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
  const endNodeId =
    template.nodes.find((node) => node.role === "end")?.id ?? null;

  return {
    nodes,
    edges,
    startNodeId,
    endNodeId,
  };
};
