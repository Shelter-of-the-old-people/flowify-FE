import {
  type TriggerConfig,
  type WorkflowScheduleMode,
  type WorkflowTriggerType,
  type WorkflowWeekday,
} from "../model";

export const DEFAULT_WORKFLOW_TIMEZONE = "Asia/Seoul";
export const DEFAULT_INTERVAL_HOURS = 4;
export const DEFAULT_TIME_OF_DAY = "09:00";
export const INTERVAL_HOUR_PRESETS = [1, 2, 4, 6, 12, 24] as const;
export const WEEKDAY_ORDER: WorkflowWeekday[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

const WEEKDAY_LABELS: Record<WorkflowWeekday, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

export type WorkflowTriggerDraft = {
  type: WorkflowTriggerType;
  scheduleMode: WorkflowScheduleMode;
  active: boolean;
  timezone: string;
  intervalHours: number;
  timeOfDay: string;
  weekdays: WorkflowWeekday[];
  skipIfRunning: boolean;
};

const hasText = (value: string | null | undefined) =>
  Boolean(value && value.trim().length > 0);

const parseInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && hasText(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
};

const normalizeWeekdays = (value: unknown): WorkflowWeekday[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim().toUpperCase())
    .filter((item): item is WorkflowWeekday =>
      WEEKDAY_ORDER.includes(item as WorkflowWeekday),
    );
};

const normalizeScheduleMode = (value: unknown): WorkflowScheduleMode => {
  if (value === "daily" || value === "weekly") {
    return value;
  }

  return "interval";
};

const buildIntervalCron = (intervalHours: number) =>
  intervalHours >= 24 ? "0 0 0 * * *" : `0 0 */${intervalHours} * * *`;

const buildDailyCron = (timeOfDay: string) => {
  const [hours = "9", minutes = "0"] = timeOfDay.split(":");
  return `0 ${Number.parseInt(minutes, 10)} ${Number.parseInt(hours, 10)} * * *`;
};

const buildWeeklyCron = (timeOfDay: string, weekdays: WorkflowWeekday[]) => {
  const [hours = "9", minutes = "0"] = timeOfDay.split(":");
  return `0 ${Number.parseInt(minutes, 10)} ${Number.parseInt(hours, 10)} * * ${weekdays.join(",")}`;
};

export const createManualTrigger = (): TriggerConfig => ({
  type: "manual",
  config: {},
});

export const normalizeWorkflowTrigger = (
  trigger: TriggerConfig | null | undefined,
): TriggerConfig => {
  if (!trigger?.type) {
    return createManualTrigger();
  }

  const config = trigger.config ?? {};

  if (trigger.type === "manual") {
    return createManualTrigger();
  }

  const scheduleMode = normalizeScheduleMode(config.schedule_mode);
  const intervalHours = parseInteger(config.interval_hours);

  return {
    type: "schedule",
    config: {
      ...config,
      schedule_mode: scheduleMode,
      timezone: hasText(config.timezone)
        ? config.timezone
        : DEFAULT_WORKFLOW_TIMEZONE,
      interval_hours:
        scheduleMode === "interval"
          ? (intervalHours ?? DEFAULT_INTERVAL_HOURS)
          : (intervalHours ?? undefined),
      time_of_day: hasText(config.time_of_day) ? config.time_of_day : undefined,
      weekdays: normalizeWeekdays(config.weekdays),
      skip_if_running: config.skip_if_running ?? true,
    },
  };
};

export const normalizeWorkflowActive = (
  trigger: TriggerConfig | null | undefined,
  active: boolean | null | undefined,
) => {
  const normalizedTrigger = normalizeWorkflowTrigger(trigger);
  if (normalizedTrigger.type === "manual") {
    return true;
  }
  return active ?? true;
};

export const createTriggerDraft = (
  trigger: TriggerConfig | null | undefined,
  active: boolean | null | undefined,
): WorkflowTriggerDraft => {
  const normalizedTrigger = normalizeWorkflowTrigger(trigger);
  const normalizedActive = normalizeWorkflowActive(normalizedTrigger, active);

  if (normalizedTrigger.type === "manual") {
    return {
      type: "manual",
      scheduleMode: "interval",
      active: true,
      timezone: DEFAULT_WORKFLOW_TIMEZONE,
      intervalHours: DEFAULT_INTERVAL_HOURS,
      timeOfDay: DEFAULT_TIME_OF_DAY,
      weekdays: ["MON"],
      skipIfRunning: true,
    };
  }

  return {
    type: "schedule",
    scheduleMode: normalizeScheduleMode(normalizedTrigger.config.schedule_mode),
    active: normalizedActive,
    timezone: normalizedTrigger.config.timezone ?? DEFAULT_WORKFLOW_TIMEZONE,
    intervalHours:
      normalizedTrigger.config.interval_hours ?? DEFAULT_INTERVAL_HOURS,
    timeOfDay: normalizedTrigger.config.time_of_day ?? DEFAULT_TIME_OF_DAY,
    weekdays:
      normalizedTrigger.config.weekdays &&
      normalizedTrigger.config.weekdays.length > 0
        ? normalizedTrigger.config.weekdays
        : ["MON"],
    skipIfRunning: normalizedTrigger.config.skip_if_running ?? true,
  };
};

export const hasTriggerDraftChanges = (
  draft: WorkflowTriggerDraft,
  trigger: TriggerConfig | null | undefined,
  active: boolean | null | undefined,
) =>
  JSON.stringify(draft) !== JSON.stringify(createTriggerDraft(trigger, active));

export const validateTriggerDraft = (draft: WorkflowTriggerDraft) => {
  if (draft.type === "manual") {
    return null;
  }

  if (draft.scheduleMode === "interval") {
    if (!Number.isInteger(draft.intervalHours)) {
      return "시간 단위는 정수만 가능합니다.";
    }
    if (draft.intervalHours < 1 || draft.intervalHours > 24) {
      return "시간 단위는 1시간에서 24시간 사이여야 합니다.";
    }
  }

  if (draft.scheduleMode === "daily" && !hasText(draft.timeOfDay)) {
    return "실행 시간을 입력해 주세요.";
  }

  if (draft.scheduleMode === "weekly") {
    if (!hasText(draft.timeOfDay)) {
      return "실행 시간을 입력해 주세요.";
    }
    if (draft.weekdays.length === 0) {
      return "요일을 하나 이상 선택해 주세요.";
    }
  }

  return null;
};

export const buildTriggerStateFromDraft = (draft: WorkflowTriggerDraft) => {
  if (draft.type === "manual") {
    return {
      trigger: createManualTrigger(),
      active: true,
    };
  }

  const cron =
    draft.scheduleMode === "daily"
      ? buildDailyCron(draft.timeOfDay)
      : draft.scheduleMode === "weekly"
        ? buildWeeklyCron(draft.timeOfDay, draft.weekdays)
        : buildIntervalCron(draft.intervalHours);

  return {
    trigger: {
      type: "schedule" as const,
      config: {
        schedule_mode: draft.scheduleMode,
        cron,
        timezone: DEFAULT_WORKFLOW_TIMEZONE,
        interval_hours:
          draft.scheduleMode === "interval" ? draft.intervalHours : undefined,
        time_of_day:
          draft.scheduleMode === "daily" || draft.scheduleMode === "weekly"
            ? draft.timeOfDay
            : undefined,
        weekdays: draft.scheduleMode === "weekly" ? draft.weekdays : undefined,
        skip_if_running: draft.skipIfRunning,
      },
    },
    active: draft.active,
  };
};

export const getWorkflowTriggerSummary = (
  trigger: TriggerConfig | null | undefined,
  active: boolean | null | undefined,
) => {
  const normalizedTrigger = normalizeWorkflowTrigger(trigger);
  const normalizedActive = normalizeWorkflowActive(normalizedTrigger, active);

  if (normalizedTrigger.type === "manual") {
    return "수동 실행";
  }

  if (!normalizedActive) {
    return "자동 실행 꺼짐";
  }

  switch (normalizedTrigger.config.schedule_mode) {
    case "interval":
      return `${normalizedTrigger.config.interval_hours ?? DEFAULT_INTERVAL_HOURS}시간마다 확인`;
    case "daily":
      return `매일 ${normalizedTrigger.config.time_of_day ?? DEFAULT_TIME_OF_DAY} 실행`;
    case "weekly": {
      const weekdays =
        normalizedTrigger.config.weekdays
          ?.map((weekday) => WEEKDAY_LABELS[weekday])
          .join(", ") ?? WEEKDAY_LABELS.MON;
      return `매주 ${weekdays} ${normalizedTrigger.config.time_of_day ?? DEFAULT_TIME_OF_DAY}`;
    }
    default:
      return `${normalizedTrigger.config.interval_hours ?? DEFAULT_INTERVAL_HOURS}시간마다 확인`;
  }
};

export const getWeekdayLabel = (weekday: WorkflowWeekday) =>
  WEEKDAY_LABELS[weekday];
