import { WORKFLOW_FILTERS } from "./constants";

export type WorkflowFilterKey = (typeof WORKFLOW_FILTERS)[number]["key"];

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
