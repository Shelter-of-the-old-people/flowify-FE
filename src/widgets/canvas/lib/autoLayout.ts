import dagre from "@dagrejs/dagre";
import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type FileTypeBranchKey,
  getFileTypeBranchKeyFromEdge,
  getFileTypeBranchKeysFromNode,
} from "@/features/choice-panel";

const DEFAULT_FALLBACK_NODE_WIDTH = 172;
const DEFAULT_FALLBACK_NODE_HEIGHT = 176;
const DEFAULT_NODE_GAP_X = 96;
const DEFAULT_NODE_GAP_Y = 96;
const DEFAULT_BRANCH_GAP_Y = 220;

type Position = {
  x: number;
  y: number;
};

type PositionedNode = {
  height: number;
  id: string;
  position: Position;
  width: number;
};

type DagreNodeLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type AutoLayoutOptions = {
  branchGapY?: number;
  direction?: "LR";
  fallbackNodeHeight?: number;
  fallbackNodeWidth?: number;
  nodeGapX?: number;
  nodeGapY?: number;
};

export type AutoLayoutPositionUpdate = {
  nodeId: string;
  position: Position;
};

const sortByPosition = (a: Position, b: Position) => {
  const yDiff = a.y - b.y;
  return yDiff === 0 ? a.x - b.x : yDiff;
};

const getNodeDimensions = (
  node: Node<FlowNodeData>,
  fallbackWidth: number,
  fallbackHeight: number,
) => ({
  height:
    node.measured?.height ??
    node.height ??
    node.initialHeight ??
    fallbackHeight,
  width:
    node.measured?.width ?? node.width ?? node.initialWidth ?? fallbackWidth,
});

const toTopLeftPosition = ({ height, width, x, y }: DagreNodeLayout) => ({
  x: x - width / 2,
  y: y - height / 2,
});

const getNodeCenterY = (node: PositionedNode) =>
  node.position.y + node.height / 2;

const sortEdgesByTargetPosition = (
  edgeA: Edge,
  edgeB: Edge,
  nodePositionMap: Map<string, Position>,
) => {
  const targetPositionA = nodePositionMap.get(edgeA.target) ?? { x: 0, y: 0 };
  const targetPositionB = nodePositionMap.get(edgeB.target) ?? { x: 0, y: 0 };
  const targetDiff = sortByPosition(targetPositionA, targetPositionB);

  if (targetDiff !== 0) {
    return targetDiff;
  }

  const sourcePositionA = nodePositionMap.get(edgeA.source) ?? { x: 0, y: 0 };
  const sourcePositionB = nodePositionMap.get(edgeB.source) ?? { x: 0, y: 0 };

  return sortByPosition(sourcePositionA, sourcePositionB);
};

const getBranchTargetNodeIds = (
  edges: Edge[],
  branchNodeId: string,
  branchKeys: FileTypeBranchKey[],
) =>
  new Set(
    branchKeys.flatMap((branchKey) =>
      edges
        .filter(
          (edge) =>
            edge.source === branchNodeId &&
            getFileTypeBranchKeyFromEdge(edge) === branchKey,
        )
        .map((edge) => edge.target),
    ),
  );

const collectBranchLaneNodeIds = ({
  branchRootId,
  branchTargetNodeIds,
  incomingEdgeCountByNodeId,
  outgoingEdgesBySourceId,
  usedNodeIds,
}: {
  branchRootId: string;
  branchTargetNodeIds: Set<string>;
  incomingEdgeCountByNodeId: Map<string, number>;
  outgoingEdgesBySourceId: Map<string, Edge[]>;
  usedNodeIds: Set<string>;
}) => {
  if ((incomingEdgeCountByNodeId.get(branchRootId) ?? 0) > 1) {
    return [];
  }

  const laneNodeIds: string[] = [];
  const pendingNodeIds = [branchRootId];
  const visitedNodeIds = new Set<string>();

  while (pendingNodeIds.length > 0) {
    const currentNodeId = pendingNodeIds.shift();
    if (!currentNodeId || visitedNodeIds.has(currentNodeId)) {
      continue;
    }

    if (usedNodeIds.has(currentNodeId) && currentNodeId !== branchRootId) {
      return [];
    }

    visitedNodeIds.add(currentNodeId);
    laneNodeIds.push(currentNodeId);

    const outgoingEdges = outgoingEdgesBySourceId.get(currentNodeId) ?? [];
    for (const edge of outgoingEdges) {
      const nextNodeId = edge.target;
      if (visitedNodeIds.has(nextNodeId)) {
        continue;
      }

      if (
        nextNodeId !== branchRootId &&
        branchTargetNodeIds.has(nextNodeId) &&
        nextNodeId !== branchRootId
      ) {
        continue;
      }

      if ((incomingEdgeCountByNodeId.get(nextNodeId) ?? 0) > 1) {
        continue;
      }

      pendingNodeIds.push(nextNodeId);
    }
  }

  return laneNodeIds;
};

const applyFileTypeBranchLaneLayout = ({
  edges,
  nodes,
  positionedNodeById,
  branchGapY,
}: {
  branchGapY: number;
  edges: Edge[];
  nodes: Node<FlowNodeData>[];
  positionedNodeById: Map<string, PositionedNode>;
}) => {
  const outgoingEdgesBySourceId = new Map<string, Edge[]>();
  const incomingEdgeCountByNodeId = new Map<string, number>();

  edges.forEach((edge) => {
    const currentOutgoingEdges = outgoingEdgesBySourceId.get(edge.source) ?? [];
    currentOutgoingEdges.push(edge);
    outgoingEdgesBySourceId.set(edge.source, currentOutgoingEdges);

    incomingEdgeCountByNodeId.set(
      edge.target,
      (incomingEdgeCountByNodeId.get(edge.target) ?? 0) + 1,
    );
  });

  const usedNodeIds = new Set<string>();

  nodes.forEach((branchNode) => {
    const branchKeys = getFileTypeBranchKeysFromNode(branchNode);
    if (branchKeys.length < 2) {
      return;
    }

    const positionedBranchNode = positionedNodeById.get(branchNode.id);
    if (!positionedBranchNode) {
      return;
    }

    const branchTargetNodeIds = getBranchTargetNodeIds(
      edges,
      branchNode.id,
      branchKeys,
    );
    const branchCenterY = getNodeCenterY(positionedBranchNode);

    branchKeys.forEach((branchKey, index) => {
      const branchEdge =
        outgoingEdgesBySourceId
          .get(branchNode.id)
          ?.find((edge) => getFileTypeBranchKeyFromEdge(edge) === branchKey) ??
        null;

      if (!branchEdge) {
        return;
      }

      const branchRootId = branchEdge.target;
      const laneNodeIds = collectBranchLaneNodeIds({
        branchRootId,
        branchTargetNodeIds,
        incomingEdgeCountByNodeId,
        outgoingEdgesBySourceId,
        usedNodeIds,
      });

      if (laneNodeIds.length === 0) {
        return;
      }

      const branchRootNode = positionedNodeById.get(branchRootId);
      if (!branchRootNode) {
        return;
      }

      const targetCenterY =
        branchCenterY + (index - (branchKeys.length - 1) / 2) * branchGapY;
      const deltaY = targetCenterY - getNodeCenterY(branchRootNode);

      laneNodeIds.forEach((nodeId) => {
        const node = positionedNodeById.get(nodeId);
        if (!node) {
          return;
        }

        node.position = {
          x: node.position.x,
          y: node.position.y + deltaY,
        };

        usedNodeIds.add(nodeId);
      });
    });
  });
};

export const getAutoLayoutPositions = ({
  nodes,
  edges,
  options,
}: {
  edges: Edge[];
  nodes: Array<Node<FlowNodeData>>;
  options?: AutoLayoutOptions;
}): AutoLayoutPositionUpdate[] => {
  if (nodes.length === 0) {
    return [];
  }

  const direction = options?.direction ?? "LR";
  const fallbackNodeWidth =
    options?.fallbackNodeWidth ?? DEFAULT_FALLBACK_NODE_WIDTH;
  const fallbackNodeHeight =
    options?.fallbackNodeHeight ?? DEFAULT_FALLBACK_NODE_HEIGHT;
  const nodeGapX = options?.nodeGapX ?? DEFAULT_NODE_GAP_X;
  const nodeGapY = options?.nodeGapY ?? DEFAULT_NODE_GAP_Y;
  const branchGapY = options?.branchGapY ?? DEFAULT_BRANCH_GAP_Y;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    edgesep: nodeGapY,
    nodesep: nodeGapY,
    rankdir: direction,
    ranksep: nodeGapX,
  });

  const sortedNodes = [...nodes].sort((nodeA, nodeB) =>
    sortByPosition(nodeA.position, nodeB.position),
  );
  const nodePositionMap = new Map(
    sortedNodes.map((node) => [node.id, node.position] as const),
  );

  sortedNodes.forEach((node) => {
    const { width, height } = getNodeDimensions(
      node,
      fallbackNodeWidth,
      fallbackNodeHeight,
    );

    graph.setNode(node.id, {
      height,
      width,
      x: node.position.x,
      y: node.position.y,
    });
  });

  const filteredEdges = edges
    .filter(
      (edge) =>
        nodePositionMap.has(edge.source) && nodePositionMap.has(edge.target),
    )
    .sort((edgeA, edgeB) =>
      sortEdgesByTargetPosition(edgeA, edgeB, nodePositionMap),
    );

  filteredEdges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph, { disableOptimalOrderHeuristic: true });

  const graphNodeById = new Map<string, PositionedNode>(
    sortedNodes.map((node) => {
      const graphNode = graph.node(node.id) as DagreNodeLayout | undefined;
      const { width, height } = getNodeDimensions(
        node,
        fallbackNodeWidth,
        fallbackNodeHeight,
      );
      const position = graphNode
        ? toTopLeftPosition(graphNode)
        : { ...node.position };

      return [
        node.id,
        {
          height,
          id: node.id,
          position,
          width,
        },
      ] as const;
    }),
  );

  applyFileTypeBranchLaneLayout({
    branchGapY,
    edges: filteredEdges,
    nodes: sortedNodes,
    positionedNodeById: graphNodeById,
  });

  return sortedNodes.map((node) => ({
    nodeId: node.id,
    position: graphNodeById.get(node.id)?.position ?? node.position,
  }));
};
