export const SOURCE_SERVICE_ROLLOUT_ALLOWLIST = {
  canvas_lms: ["course_files", "course_new_file", "term_all_files"],
  google_drive: [
    "single_file",
    "file_changed",
    "new_file",
    "folder_new_file",
    "folder_all_files",
  ],
  google_sheets: ["sheet_all", "new_row", "row_updated"],
  gmail: [
    "single_email",
    "new_email",
    "sender_email",
    "starred_email",
    "label_emails",
    "attachment_email",
  ],
  slack: ["channel_messages"],
} as const satisfies Record<string, readonly string[]>;

type SourceServiceRolloutKey = keyof typeof SOURCE_SERVICE_ROLLOUT_ALLOWLIST;

const isSourceServiceRolloutKey = (
  serviceKey: string,
): serviceKey is SourceServiceRolloutKey =>
  Object.prototype.hasOwnProperty.call(
    SOURCE_SERVICE_ROLLOUT_ALLOWLIST,
    serviceKey,
  );

export const isSourceModeInRollout = (serviceKey: string, modeKey: string) => {
  if (!isSourceServiceRolloutKey(serviceKey)) {
    return false;
  }

  const allowedModes = SOURCE_SERVICE_ROLLOUT_ALLOWLIST[serviceKey];
  return (allowedModes as readonly string[]).includes(modeKey);
};
