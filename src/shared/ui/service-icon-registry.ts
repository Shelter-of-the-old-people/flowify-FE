import { type ComponentType, type SVGProps } from "react";
import { type IconType } from "react-icons";
import {
  MdAutoAwesome,
  MdBolt,
  MdCalendarMonth,
  MdEmail,
  MdFolder,
  MdLanguage,
  MdNotifications,
  MdSchool,
  MdSettings,
  MdTableChart,
} from "react-icons/md";

import {
  type ServiceBadgeKey,
  getServiceBadgeKeyFromNodeConfig,
} from "../utils";

import {
  CanvasLmsIcon,
  DiscordIcon,
  GitHubIcon,
  GmailIcon,
  GoogleCalendarIcon,
  GoogleDriveIcon,
  GoogleSheetsIcon,
  NaverIcon,
  NotionIcon,
  SeBoardIcon,
} from "./icons";

export type ServiceIconKind = "brand" | "domain" | "category" | "unknown";

export type ServiceBrandIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "height" | "width"
> & {
  size?: number | string;
};

export type ServiceBrandIconComponent = ComponentType<ServiceBrandIconProps>;

export type ServiceIconMeta = {
  key: ServiceBadgeKey;
  label: string;
  kind: ServiceIconKind;
  fallbackIcon: IconType;
  BrandIcon?: ServiceBrandIconComponent;
};

const SERVICE_ICON_META = {
  calendar: {
    key: "calendar",
    label: "Google Calendar",
    kind: "brand",
    fallbackIcon: MdCalendarMonth,
    BrandIcon: GoogleCalendarIcon,
  },
  "canvas-lms": {
    key: "canvas-lms",
    label: "Canvas LMS",
    kind: "brand",
    fallbackIcon: MdSchool,
    BrandIcon: CanvasLmsIcon,
  },
  discord: {
    key: "discord",
    label: "Discord",
    kind: "brand",
    fallbackIcon: MdNotifications,
    BrandIcon: DiscordIcon,
  },
  gmail: {
    key: "gmail",
    label: "Gmail",
    kind: "brand",
    fallbackIcon: MdEmail,
    BrandIcon: GmailIcon,
  },
  "google-drive": {
    key: "google-drive",
    label: "Google Drive",
    kind: "brand",
    fallbackIcon: MdFolder,
    BrandIcon: GoogleDriveIcon,
  },
  "google-sheets": {
    key: "google-sheets",
    label: "Google Sheets",
    kind: "brand",
    fallbackIcon: MdTableChart,
    BrandIcon: GoogleSheetsIcon,
  },
  github: {
    key: "github",
    label: "GitHub",
    kind: "brand",
    fallbackIcon: MdLanguage,
    BrandIcon: GitHubIcon,
  },
  "naver-news": {
    key: "naver-news",
    label: "Naver News",
    kind: "brand",
    fallbackIcon: MdLanguage,
    BrandIcon: NaverIcon,
  },
  notion: {
    key: "notion",
    label: "Notion",
    kind: "brand",
    fallbackIcon: MdFolder,
    BrandIcon: NotionIcon,
  },
  seboard: {
    key: "seboard",
    label: "SE Board",
    kind: "brand",
    fallbackIcon: MdLanguage,
    BrandIcon: SeBoardIcon,
  },
  communication: {
    key: "communication",
    label: "Communication",
    kind: "domain",
    fallbackIcon: MdEmail,
  },
  storage: {
    key: "storage",
    label: "Storage",
    kind: "domain",
    fallbackIcon: MdFolder,
  },
  spreadsheet: {
    key: "spreadsheet",
    label: "Spreadsheet",
    kind: "domain",
    fallbackIcon: MdTableChart,
  },
  "web-scraping": {
    key: "web-scraping",
    label: "Web Scraping",
    kind: "domain",
    fallbackIcon: MdLanguage,
  },
  notification: {
    key: "notification",
    label: "Notification",
    kind: "domain",
    fallbackIcon: MdNotifications,
  },
  llm: {
    key: "llm",
    label: "AI",
    kind: "category",
    fallbackIcon: MdAutoAwesome,
  },
  trigger: {
    key: "trigger",
    label: "Trigger",
    kind: "category",
    fallbackIcon: MdBolt,
  },
  processing: {
    key: "processing",
    label: "Processing",
    kind: "category",
    fallbackIcon: MdSettings,
  },
  unknown: {
    key: "unknown",
    label: "Unknown",
    kind: "unknown",
    fallbackIcon: MdSettings,
  },
} satisfies Record<ServiceBadgeKey, ServiceIconMeta>;

export const getServiceIconMeta = (type: ServiceBadgeKey): ServiceIconMeta =>
  SERVICE_ICON_META[type];

export const getServiceIconMetaFromService = (
  serviceKey?: string | null,
  sourceMode?: string | null,
): ServiceIconMeta =>
  getServiceIconMeta(getServiceBadgeKeyFromNodeConfig(serviceKey, sourceMode));
