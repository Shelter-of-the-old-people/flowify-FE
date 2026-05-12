import { type Edge, type Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { type FlowNodeData } from "@/entities/node";

import { getAutoLayoutPositions } from "./autoLayout";

const createDataProcessConfig = (
  overrides: Partial<FlowNodeData["config"]> = {},
) => ({
  aggregateFunction: null,
  field: null,
  isConfigured: false,
  operation: null,
  sortDirection: null,
  ...overrides,
});

const createNode = ({
  branchTypes,
  id,
  measured,
  position,
}: {
  branchTypes?: string[];
  id: string;
  measured?: { height: number; width: number };
  position: { x: number; y: number };
}): Node<FlowNodeData> => ({
  data: {
    config: createDataProcessConfig(
      branchTypes
        ? {
            branchTypes,
            choiceSelections: { branch_config: branchTypes },
          }
        : {},
    ),
    inputTypes: [],
    label: id,
    outputTypes: [],
    type: "data-process",
  },
  id,
  measured,
  position,
  type: "data-process",
});

const createEdge = ({
  branchKey,
  source,
  target,
}: {
  branchKey?: string;
  source: string;
  target: string;
}): Edge => ({
  data: branchKey
    ? {
        branchKey,
        label: branchKey,
      }
    : undefined,
  id: `${source}-${target}-${branchKey ?? "default"}`,
  source,
  sourceHandle: branchKey,
  target,
});

const toPositionMap = (updates: ReturnType<typeof getAutoLayoutPositions>) =>
  new Map(updates.map((update) => [update.nodeId, update.position] as const));

const getCenterY = (
  position: { x: number; y: number } | undefined,
  height = 176,
) => {
  if (!position) {
    throw new Error("missing position");
  }

  return position.y + height / 2;
};

describe("getAutoLayoutPositions", () => {
  it("lays out a linear flow from left to right", () => {
    const nodes = [
      createNode({ id: "start", position: { x: 0, y: 0 } }),
      createNode({ id: "middle", position: { x: 30, y: 40 } }),
      createNode({ id: "end", position: { x: 60, y: 80 } }),
    ];
    const edges = [
      createEdge({ source: "start", target: "middle" }),
      createEdge({ source: "middle", target: "end" }),
    ];

    const updates = getAutoLayoutPositions({ edges, nodes });
    const positions = toPositionMap(updates);

    expect(positions.get("start")?.x).toBeLessThan(
      positions.get("middle")?.x ?? 0,
    );
    expect(positions.get("middle")?.x).toBeLessThan(
      positions.get("end")?.x ?? 0,
    );
  });

  it("preserves configured file branch order even when initial y-order is reversed", () => {
    const nodes = [
      createNode({
        branchTypes: ["pdf", "other"],
        id: "branch",
        position: { x: 0, y: 0 },
      }),
      createNode({ id: "pdf-node", position: { x: 300, y: 420 } }),
      createNode({ id: "other-node", position: { x: 300, y: 20 } }),
    ];
    const edges = [
      createEdge({ source: "branch", target: "pdf-node", branchKey: "pdf" }),
      createEdge({
        source: "branch",
        target: "other-node",
        branchKey: "other",
      }),
    ];

    const updates = getAutoLayoutPositions({ edges, nodes });
    const positions = toPositionMap(updates);

    expect(getCenterY(positions.get("pdf-node"))).toBeLessThan(
      getCenterY(positions.get("other-node")),
    );
  });

  it("spreads three branch lanes in configured order", () => {
    const nodes = [
      createNode({
        branchTypes: ["pdf", "image", "other"],
        id: "branch",
        position: { x: 0, y: 0 },
      }),
      createNode({ id: "pdf-node", position: { x: 200, y: 420 } }),
      createNode({ id: "image-node", position: { x: 200, y: 240 } }),
      createNode({ id: "other-node", position: { x: 200, y: 20 } }),
    ];
    const edges = [
      createEdge({ source: "branch", target: "pdf-node", branchKey: "pdf" }),
      createEdge({
        source: "branch",
        target: "image-node",
        branchKey: "image",
      }),
      createEdge({
        source: "branch",
        target: "other-node",
        branchKey: "other",
      }),
    ];

    const updates = getAutoLayoutPositions({ edges, nodes });
    const positions = toPositionMap(updates);

    const pdfCenterY = getCenterY(positions.get("pdf-node"));
    const imageCenterY = getCenterY(positions.get("image-node"));
    const otherCenterY = getCenterY(positions.get("other-node"));

    expect(pdfCenterY).toBeLessThan(imageCenterY);
    expect(imageCenterY).toBeLessThan(otherCenterY);
  });

  it("moves a branch subtree together while leaving the merge centered between lanes", () => {
    const nodes = [
      createNode({
        branchTypes: ["pdf", "other"],
        id: "branch",
        position: { x: 0, y: 0 },
      }),
      createNode({ id: "pdf-node", position: { x: 220, y: 360 } }),
      createNode({ id: "pdf-child", position: { x: 440, y: 360 } }),
      createNode({ id: "other-node", position: { x: 220, y: 40 } }),
      createNode({ id: "other-child", position: { x: 440, y: 40 } }),
      createNode({ id: "merge", position: { x: 680, y: 180 } }),
    ];
    const edges = [
      createEdge({ source: "branch", target: "pdf-node", branchKey: "pdf" }),
      createEdge({
        source: "branch",
        target: "other-node",
        branchKey: "other",
      }),
      createEdge({ source: "pdf-node", target: "pdf-child" }),
      createEdge({ source: "other-node", target: "other-child" }),
      createEdge({ source: "pdf-child", target: "merge" }),
      createEdge({ source: "other-child", target: "merge" }),
    ];

    const updates = getAutoLayoutPositions({ edges, nodes });
    const positions = toPositionMap(updates);

    const pdfCenterY = getCenterY(positions.get("pdf-node"));
    const pdfChildCenterY = getCenterY(positions.get("pdf-child"));
    const otherCenterY = getCenterY(positions.get("other-node"));
    const otherChildCenterY = getCenterY(positions.get("other-child"));
    const mergeCenterY = getCenterY(positions.get("merge"));

    expect(pdfCenterY).toBe(pdfChildCenterY);
    expect(otherCenterY).toBe(otherChildCenterY);
    expect(pdfCenterY).toBeLessThan(mergeCenterY);
    expect(mergeCenterY).toBeLessThan(otherCenterY);
  });
});
