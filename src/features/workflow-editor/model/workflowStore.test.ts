import { beforeEach, describe, expect, it } from "vitest";

import { createManualTrigger } from "@/entities/workflow";

import { useWorkflowStore } from "./workflowStore";

const createHydratedWorkflow = () => ({
  workflowId: "workflow-1",
  workflowName: "테스트 워크플로우",
  workflowTrigger: createManualTrigger(),
  workflowActive: true,
  nodes: [],
  edges: [],
  nodeStatuses: {},
  startNodeId: null,
  endNodeIds: [],
  endNodeId: null,
});

describe("workflowStore dirty revision", () => {
  beforeEach(() => {
    useWorkflowStore.getState().resetEditor();
  });

  it("increments dirty revision when workflow content changes", () => {
    useWorkflowStore.getState().setWorkflowName("새 이름");

    expect(useWorkflowStore.getState().isDirty).toBe(true);
    expect(useWorkflowStore.getState().dirtyRevision).toBe(1);
  });

  it("marks clean only when the saved revision is still current", () => {
    useWorkflowStore.getState().setWorkflowName("첫 번째 이름");
    const savedRevision = useWorkflowStore.getState().dirtyRevision;

    useWorkflowStore.getState().markCleanIfUnchanged(savedRevision);

    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().dirtyRevision).toBe(savedRevision);
  });

  it("keeps dirty when a stale save response completes after a newer edit", () => {
    useWorkflowStore.getState().setWorkflowName("첫 번째 이름");
    const staleRevision = useWorkflowStore.getState().dirtyRevision;

    useWorkflowStore.getState().setWorkflowName("두 번째 이름");
    useWorkflowStore.getState().markCleanIfUnchanged(staleRevision);

    expect(useWorkflowStore.getState().isDirty).toBe(true);
    expect(useWorkflowStore.getState().dirtyRevision).toBeGreaterThan(
      staleRevision,
    );
  });

  it("resets dirty revision after hydrating workflow from server", () => {
    useWorkflowStore.getState().setWorkflowName("임시 이름");

    useWorkflowStore.getState().hydrateWorkflow(createHydratedWorkflow());

    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().dirtyRevision).toBe(0);
  });
});
