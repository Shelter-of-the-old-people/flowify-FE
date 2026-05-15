import { describe, expect, it } from "vitest";

import { type WorkflowResponse } from "@/entities/workflow";

import {
  canToggleWorkflowAutoRun,
  getWorkflowListPrimaryActionKind,
  getWorkflowListTriggerDisplayLabel,
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
  it("displays manual workflows as manual execution", () => {
    const workflow = createWorkflow({
      trigger: { type: "manual", config: {} },
    });

    expect(getWorkflowListTriggerDisplayLabel(workflow)).toBe("수동 실행");
    expect(getWorkflowListPrimaryActionKind(workflow, false)).toBe("run");
  });

  it("shows schedule settings independently of active state", () => {
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

    expect(getWorkflowListTriggerDisplayLabel(workflow)).toBe("4시간마다 확인");
    expect(getWorkflowListPrimaryActionKind(workflow, false)).toBe(
      "disable-auto-run",
    );
  });

  it("uses the primary action to enable inactive schedules", () => {
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

    expect(getWorkflowListPrimaryActionKind(workflow, false)).toBe(
      "enable-auto-run",
    );
  });

  it("uses stop semantics when an active schedule is running", () => {
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

    expect(getWorkflowListPrimaryActionKind(workflow, true)).toBe(
      "disable-auto-run-and-stop",
    );
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

    expect(canToggleWorkflowAutoRun(workflow, "viewer-2")).toBe(false);
  });
});
