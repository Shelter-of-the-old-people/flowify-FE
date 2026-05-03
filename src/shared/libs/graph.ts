import { type Edge } from "@xyflow/react";

/**
 * 시작 노드에서 엣지를 따라 하위 방향(source → target)으로 탐색하여
 * 모든 후속 노드 ID를 수집한다.
 * 조건 분기 노드의 경우 모든 분기 경로를 포함한다.
 */
export const collectDescendantIds = (
  startId: string,
  edges: Edge[],
): Set<string> => {
  const descendants = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    for (const edge of edges) {
      if (edge.source === currentId && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return descendants;
};

/**
 * outgoing edge가 없는 끝단(leaf) 노드의 ID 목록을 반환한다.
 */
export const getLeafNodeIds = (nodeIds: string[], edges: Edge[]): string[] => {
  const nodeIdSet = new Set(nodeIds);
  const sourcesWithOutgoing = new Set(
    edges
      .filter(
        (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
      )
      .map((edge) => edge.source),
  );

  return nodeIds.filter((id) => !sourcesWithOutgoing.has(id));
};
