import type { IconType } from "react-icons";
import {
  MdDescription,
  MdDriveFileMove,
  MdEdit,
  MdEmail,
  MdFilePresent,
  MdForwardToInbox,
  MdMarkEmailRead,
  MdScheduleSend,
  MdSend,
  MdTableRows,
  MdUploadFile,
} from "react-icons/md";

import type { NodeType } from "@/entities/node";

/**
 * 서비스 선택 후 보여줄 요구사항(use-case) 옵션.
 * 각 옵션은 해당 서비스 노드의 config preset을 결정한다.
 */
export interface ServiceRequirement {
  id: string;
  label: string;
  iconComponent: IconType;
  /** config에 주입할 preset 값 */
  configPreset: Record<string, unknown>;
}

export interface ServiceRequirementGroup {
  title: string;
  /** OAuth 인증이 필요한 서비스인지 */
  requiresAuth: boolean;
  requirements: ServiceRequirement[];
}

/**
 * domain 카테고리 노드에 대한 요구사항 정의.
 * processing/ai 노드는 요구사항 없이 바로 추가된다.
 */
export const SERVICE_REQUIREMENTS: Partial<
  Record<NodeType, ServiceRequirementGroup>
> = {
  storage: {
    title: "어떻게 사용하시겠어요?",
    requiresAuth: true,
    requirements: [
      {
        id: "storage-read",
        label: "파일 사용",
        iconComponent: MdFilePresent,
        configPreset: { action: "read" },
      },
      {
        id: "storage-watch-file",
        label: "특정 파일이 변경되었을 때",
        iconComponent: MdDescription,
        configPreset: { action: "read" },
      },
      {
        id: "storage-watch-folder",
        label: "특정 폴더에 파일이 들어올 때",
        iconComponent: MdDriveFileMove,
        configPreset: { action: "read" },
      },
    ],
  },

  communication: {
    title: "어떻게 사용하시겠어요?",
    requiresAuth: true,
    requirements: [
      {
        id: "comm-send",
        label: "메일 보내기",
        iconComponent: MdSend,
        configPreset: { action: "send" },
      },
      {
        id: "comm-receive",
        label: "메일 받기",
        iconComponent: MdForwardToInbox,
        configPreset: { action: "receive" },
      },
      {
        id: "comm-read",
        label: "특정 메일 읽기",
        iconComponent: MdMarkEmailRead,
        configPreset: { action: "receive" },
      },
    ],
  },

  spreadsheet: {
    title: "어떻게 사용하시겠어요?",
    requiresAuth: true,
    requirements: [
      {
        id: "sheet-read",
        label: "시트 데이터 읽기",
        iconComponent: MdTableRows,
        configPreset: { action: "read" },
      },
      {
        id: "sheet-write",
        label: "시트에 데이터 쓰기",
        iconComponent: MdEdit,
        configPreset: { action: "write" },
      },
      {
        id: "sheet-append",
        label: "시트에 행 추가하기",
        iconComponent: MdUploadFile,
        configPreset: { action: "append" },
      },
    ],
  },

  calendar: {
    title: "어떻게 사용하시겠어요?",
    requiresAuth: true,
    requirements: [
      {
        id: "cal-read",
        label: "일정 확인하기",
        iconComponent: MdEmail,
        configPreset: { action: "read" },
      },
      {
        id: "cal-create",
        label: "새 일정 만들기",
        iconComponent: MdScheduleSend,
        configPreset: { action: "create" },
      },
    ],
  },

  "web-scraping": {
    title: "어떤 데이터를 수집하시겠어요?",
    requiresAuth: false,
    requirements: [
      {
        id: "scrape-page",
        label: "웹 페이지 데이터 수집",
        iconComponent: MdDescription,
        configPreset: { pagination: false },
      },
      {
        id: "scrape-paginated",
        label: "여러 페이지 데이터 수집",
        iconComponent: MdTableRows,
        configPreset: { pagination: true },
      },
    ],
  },
};
