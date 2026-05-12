import { describe, expect, it } from "vitest";

import { type WorkflowResponse } from "@/entities/workflow";

import { getWorkflowAutoRunState } from "./workflow-list";

const createWorkflow = (
  overrides: Partial<WorkflowResponse>,
): WorkflowResponse => ({
  id: overrides.id ?? "workflow-1",
  name: overrides.name ?? "Test workflow",
  description: overrides.description ?? "",
  nodes: overrides.nodes ?? [],
  edges: overrides.edges ?? [],
  userId: overrides.userId ?? "owner-1",
  sharedWith: overrides.sharedWith ?? [],
  isTemplate: overrides.isTemplate ?? false,
  templateId: overrides.templateId ?? null,
  trigger: overrides.trigger ?? { type: "manual", config: {} },
  active: overrides.active ?? true,
  createdAt: overrides.createdAt ?? "2026-05-10T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-05-10T00:00:00.000Z",
  warnings: overrides.warnings,
  nodeStatuses: overrides.nodeStatuses,
});

describe("workflow list helpers", () => {
  it("treats manual workflows as read-only auto-run state", () => {
    const workflow = createWorkflow({
      trigger: { type: "manual", config: {} },
    });

    expect(getWorkflowAutoRunState(workflow, "owner-1")).toEqual({
      kind: "manual",
      label: "수동 실행",
      canToggle: false,
      nextActive: null,
    });
  });

  it("allows the owner to disable an enabled schedule", () => {
    const workflow = createWorkflow({
      trigger: {
        type: "schedule",
        config: {
          schedule_mode: "interval",
          cron: "0 0 */4 * * *",
          timezone: "Asia/Seoul",
          interval_hours: 4,
        },
      },
      active: true,
    });

    expect(getWorkflowAutoRunState(workflow, "owner-1")).toEqual({
      kind: "enabled",
      label: "자동 실행 켜짐",
      canToggle: true,
      nextActive: false,
    });
  });

  it("prevents shared viewers from toggling schedule auto-run", () => {
    const workflow = createWorkflow({
      trigger: {
        type: "schedule",
        config: {
          schedule_mode: "interval",
          cron: "0 0 */4 * * *",
          timezone: "Asia/Seoul",
          interval_hours: 4,
        },
      },
      active: false,
    });

    expect(getWorkflowAutoRunState(workflow, "viewer-2")).toEqual({
      kind: "disabled",
      label: "자동 실행 꺼짐",
      canToggle: false,
      nextActive: true,
    });
  });
});
