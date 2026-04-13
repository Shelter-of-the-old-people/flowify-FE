export type ServiceBadgeKey =
  | "calendar"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "notion"
  | "slack"
  | "communication"
  | "storage"
  | "spreadsheet"
  | "web-scraping"
  | "notification"
  | "llm"
  | "trigger"
  | "processing"
  | "unknown";

export const getServiceBadgeKeyFromService = (
  value: string | null | undefined,
): ServiceBadgeKey => {
  switch (value) {
    case "calendar":
    case "google-calendar":
      return "calendar";
    case "gmail":
      return "gmail";
    case "google-drive":
      return "google-drive";
    case "google-sheets":
      return "google-sheets";
    case "notion":
      return "notion";
    case "slack":
      return "slack";
    case "web":
    case "web-scraping":
      return "web-scraping";
    default:
      return "unknown";
  }
};
