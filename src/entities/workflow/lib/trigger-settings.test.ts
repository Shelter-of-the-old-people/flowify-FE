import { describe, expect, it } from "vitest";

import {
  buildTriggerStateFromDraft,
  createManualTrigger,
  createTriggerDraft,
  getWorkflowTriggerSummary,
  normalizeWorkflowActive,
  normalizeWorkflowTrigger,
  validateTriggerDraft,
} from "./trigger-settings";

describe("trigger settings helpers", () => {
  it("normalizes a missing trigger to manual", () => {
    expect(normalizeWorkflowTrigger(null)).toEqual(createManualTrigger());
    expect(normalizeWorkflowActive(null, false)).toBe(true);
  });

  it("builds an interval schedule payload with the Seoul timezone", () => {
    const draft = createTriggerDraft(createManualTrigger(), true);
    draft.type = "schedule";
    draft.scheduleMode = "interval";
    draft.intervalHours = 4;

    const nextState = buildTriggerStateFromDraft(draft);

    expect(nextState.active).toBe(true);
    expect(nextState.trigger).toEqual({
      type: "schedule",
      config: {
        schedule_mode: "interval",
        cron: "0 0 */4 * * *",
        timezone: "Asia/Seoul",
        interval_hours: 4,
        time_of_day: undefined,
        weekdays: undefined,
        skip_if_running: true,
      },
    });
  });

  it("normalizes unsupported schedule modes back to interval", () => {
    const draft = createTriggerDraft(
      {
        type: "schedule",
        config: {
          schedule_mode: "cron" as never,
          cron: "0 */4 * * * *",
          timezone: "Asia/Seoul",
        },
      },
      true,
    );

    expect(draft.scheduleMode).toBe("interval");
    expect(draft.intervalHours).toBe(4);
  });

  it("validates that weekly schedules need at least one weekday", () => {
    const draft = createTriggerDraft(createManualTrigger(), true);
    draft.type = "schedule";
    draft.scheduleMode = "weekly";
    draft.weekdays = [];

    expect(validateTriggerDraft(draft)).toBe("요일을 하나 이상 선택해 주세요.");
  });

  it("summarizes an inactive schedule workflow separately", () => {
    expect(
      getWorkflowTriggerSummary(
        {
          type: "schedule",
          config: {
            schedule_mode: "interval",
            cron: "0 0 */4 * * *",
            timezone: "Asia/Seoul",
            interval_hours: 4,
          },
        },
        false,
      ),
    ).toBe("자동 실행 꺼짐");
  });
});
