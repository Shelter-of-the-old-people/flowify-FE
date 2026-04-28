const SINK_SERVICE_ROLLOUT_ALLOWLIST = [
  "slack",
  "gmail",
  "notion",
  "google_drive",
  "google_sheets",
  "google_calendar",
] as const;

export const isSinkServiceInRollout = (serviceKey: string) =>
  SINK_SERVICE_ROLLOUT_ALLOWLIST.includes(
    serviceKey as (typeof SINK_SERVICE_ROLLOUT_ALLOWLIST)[number],
  );
