export const SOURCE_SERVICE_ROLLOUT_ALLOWLIST = {
  google_drive: [
    "single_file",
    "file_changed",
    "new_file",
    "folder_new_file",
    "folder_all_files",
  ],
  gmail: [
    "single_email",
    "new_email",
    "sender_email",
    "starred_email",
    "label_emails",
    "attachment_email",
  ],
  google_sheets: ["sheet_all", "new_row", "row_updated"],
  slack: ["channel_messages"],
} as const satisfies Record<string, readonly string[]>;

export const isSourceModeInRollout = (serviceKey: string, modeKey: string) => {
  const allowedModes = SOURCE_SERVICE_ROLLOUT_ALLOWLIST[serviceKey];
  return allowedModes ? allowedModes.includes(modeKey) : false;
};
