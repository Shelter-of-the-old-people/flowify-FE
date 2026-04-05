import type { IconType } from "react-icons";
import {
  MdCalendarMonth,
  MdEmail,
  MdFolder,
  MdLanguage,
  MdTableChart,
} from "react-icons/md";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiGooglesheets,
  SiNotion,
  SiSlack,
} from "react-icons/si";

import type { NodeType } from "@/entities/node";

/**
 * 카테고리(NodeType) 내 실제 서비스 정의.
 * 서비스 선택 시 config.service에 value가 주입된다.
 */
export interface ServiceOption {
  /** config.service에 들어갈 값 */
  value: string;
  /** 표시 이름 */
  label: string;
  /** 서비스 아이콘 */
  iconComponent: IconType;
}

export interface CategoryServiceGroup {
  /** 카테고리 표시 아이콘 (NODE_REGISTRY의 iconComponent) */
  categoryIcon: IconType;
  /** 카테고리 표시 이름 */
  categoryLabel: string;
  /** 이 카테고리에 속한 서비스 목록 */
  services: ServiceOption[];
  /** OAuth 인증 필요 여부 */
  requiresAuth: boolean;
}

/**
 * domain 노드 타입 → 서비스 매핑.
 * processing/ai 노드는 서비스 개념이 없으므로 포함하지 않는다.
 */
export const CATEGORY_SERVICE_MAP: Partial<
  Record<NodeType, CategoryServiceGroup>
> = {
  storage: {
    categoryIcon: MdFolder,
    categoryLabel: "저장소",
    requiresAuth: true,
    services: [
      {
        value: "google-drive",
        label: "Google Drive",
        iconComponent: SiGoogledrive,
      },
      {
        value: "notion",
        label: "Notion",
        iconComponent: SiNotion,
      },
    ],
  },

  communication: {
    categoryIcon: MdEmail,
    categoryLabel: "커뮤니케이션",
    requiresAuth: true,
    services: [
      {
        value: "gmail",
        label: "Gmail",
        iconComponent: SiGmail,
      },
      {
        value: "slack",
        label: "Slack",
        iconComponent: SiSlack,
      },
    ],
  },

  spreadsheet: {
    categoryIcon: MdTableChart,
    categoryLabel: "스프레드시트",
    requiresAuth: true,
    services: [
      {
        value: "google-sheets",
        label: "Google Sheets",
        iconComponent: SiGooglesheets,
      },
    ],
  },

  calendar: {
    categoryIcon: MdCalendarMonth,
    categoryLabel: "캘린더",
    requiresAuth: true,
    services: [
      {
        value: "google-calendar",
        label: "Google Calendar",
        iconComponent: SiGooglecalendar,
      },
    ],
  },

  "web-scraping": {
    categoryIcon: MdLanguage,
    categoryLabel: "웹 수집",
    requiresAuth: false,
    services: [],
  },
};
