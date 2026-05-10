const SINK_SERVICE_ROLLOUT_ALLOWLIST = [
  "slack",
  "discord",
  "notion",
  "google_drive",
  "google_sheets",
  "google_calendar",
  "gmail",
] as const;

export const isSinkServiceInRollout = (serviceKey: string) =>
  SINK_SERVICE_ROLLOUT_ALLOWLIST.includes(
    serviceKey as (typeof SINK_SERVICE_ROLLOUT_ALLOWLIST)[number],
  );
