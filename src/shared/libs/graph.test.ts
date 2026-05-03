import { type Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { getLeafNodeIds } from "./graph";

const createEdge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe("getLeafNodeIds", () => {
  it("returns nodes without outgoing edges inside the candidate set", () => {
    const leaves = getLeafNodeIds(
      ["start", "middle"],
      [createEdge("start", "middle")],
    );

    expect(leaves).toEqual(["middle"]);
  });

  it("ignores outgoing edges to nodes outside the candidate set", () => {
    const leaves = getLeafNodeIds(
      ["start", "middle", "ai"],
      [
        createEdge("start", "middle"),
        createEdge("middle", "ai"),
        createEdge("ai", "end"),
      ],
    );

    expect(leaves).toEqual(["ai"]);
  });

  it("keeps branch leaves when one branch already points to an excluded end node", () => {
    const leaves = getLeafNodeIds(
      ["start", "branch-a", "branch-b"],
      [
        createEdge("start", "branch-a"),
        createEdge("start", "branch-b"),
        createEdge("branch-b", "end"),
      ],
    );

    expect(leaves).toEqual(["branch-a", "branch-b"]);
  });
});
