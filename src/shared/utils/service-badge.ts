export type ServiceBadgeKey =
  | "calendar"
  | "canvas-lms"
  | "discord"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "naver-news"
  | "notion"
  | "seboard"
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
    case "google_calendar":
      return "calendar";
    case "canvas-lms":
    case "canvas_lms":
      return "canvas-lms";
    case "discord":
      return "discord";
    case "gmail":
      return "gmail";
    case "google-drive":
    case "google_drive":
      return "google-drive";
    case "google-sheets":
    case "google_sheets":
      return "google-sheets";
    case "naver-news":
    case "naver_news":
      return "naver-news";
    case "notion":
      return "notion";
    case "seboard":
    case "seboard_new_posts":
    case "seboard_posts":
      return "seboard";
    case "slack":
      return "slack";
    case "web":
    case "web-news":
    case "web_news":
    case "web-scraping":
    case "website_feed":
      return "web-scraping";
    default:
      return "unknown";
  }
};

export const getServiceBadgeKeyFromNodeConfig = (
  service: unknown,
  sourceMode: unknown,
): ServiceBadgeKey => {
  if (
    service === "web_news" &&
    (sourceMode === "seboard_posts" || sourceMode === "seboard_new_posts")
  ) {
    return "seboard";
  }

  return getServiceBadgeKeyFromService(
    typeof service === "string" ? service : null,
  );
};
