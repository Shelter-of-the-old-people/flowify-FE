import { describe, expect, it } from "vitest";

import { type WorkflowResponse } from "@/entities/workflow";

import {
  filterWorkflowsByStatus,
  getWorkflowAutoRunState,
} from "./workflow-list";

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

  it("filters running and stopped tabs by the workflow active flag", () => {
    const manualWorkflow = createWorkflow({
      id: "manual",
      trigger: { type: "manual", config: {} },
      active: true,
    });
    const enabledSchedule = createWorkflow({
      id: "enabled",
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
    const disabledSchedule = createWorkflow({
      id: "disabled",
      trigger: {
        type: "schedule",
        config: {
          schedule_mode: "daily",
          cron: "0 0 9 * * *",
          timezone: "Asia/Seoul",
          time_of_day: "09:00",
        },
      },
      active: false,
    });

    expect(
      filterWorkflowsByStatus(
        [manualWorkflow, enabledSchedule, disabledSchedule],
        "running",
      ).map((workflow) => workflow.id),
    ).toEqual(["manual", "enabled"]);

    expect(
      filterWorkflowsByStatus(
        [manualWorkflow, enabledSchedule, disabledSchedule],
        "stopped",
      ).map((workflow) => workflow.id),
    ).toEqual(["disabled"]);
  });
});
