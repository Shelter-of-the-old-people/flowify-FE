const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  communication: "커뮤니케이션",
  file_upload_auto_share: "파일 업로드 자동 공유",
  folder_document_summary: "폴더 문서 자동 요약",
  mail_summary_forward: "메일 요약 후 전달",
  spreadsheet: "시트 데이터 자동화",
  storage: "문서 및 파일 자동화",
  web_crawl: "웹 데이터 자동화",
  web_scraping: "웹 데이터 자동화",
};

const TEMPLATE_SERVICE_LABELS: Record<string, string> = {
  canvas_lms: "Canvas LMS",
  discord: "Discord",
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_drive: "Google Drive",
  google_sheets: "Google Sheets",
  notion: "Notion",
};

const REMOVED_TEMPLATE_SERVICE_KEYS = new Set(["slack"]);

type TemplatePresentationInput = {
  category?: string | null;
  description?: string | null;
  name?: string | null;
};

const TEMPLATE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "중요 메일 목록 요약 후 Notion 저장":
    "중요 메일 목록을 정해진 형식으로 요약해 Notion 페이지에 저장합니다.",
  "중요 메일 목록에서 할 일 추출 후 Notion 저장":
    "중요 메일 목록에서 해야 할 일을 추출해 Notion 페이지에 정리합니다.",
  "신규 문서 요약 후 Gmail 전달":
    "지정한 Google Drive 폴더의 문서를 읽어 핵심 내용을 요약하고 이메일로 전달합니다.",
  "문서 요약 결과를 Google Sheets에 저장":
    "지정한 Google Drive 폴더의 문서를 읽어 요약한 뒤 Google Sheets에 기록합니다.",
  "새 파일 업로드 알림 메일 발송":
    "지정한 Google Drive 폴더의 새 파일 정보를 정리해 이메일 알림을 발송합니다.",
  "새 파일 업로드 후 Notion 기록":
    "지정한 Google Drive 폴더의 새 파일 정보를 정리해 Notion 페이지에 기록합니다.",
};

export const getTemplateCategoryLabel = (
  category: string | null | undefined,
) => {
  if (!category) {
    return "미분류";
  }

  return TEMPLATE_CATEGORY_LABELS[category] ?? category;
};

export const getTemplateServiceLabel = (service: string) =>
  TEMPLATE_SERVICE_LABELS[service] ?? service;

export const isRemovedTemplateService = (service: string) =>
  REMOVED_TEMPLATE_SERVICE_KEYS.has(service);

export const isRemovedServiceTemplate = (requiredServices: readonly string[]) =>
  requiredServices.some(isRemovedTemplateService);

export const getTemplateCategorySummary = (
  category: string | null | undefined,
) => {
  switch (category) {
    case "file_upload_auto_share":
      return "Google Drive 폴더의 새 파일을 확인해 요약하고, 정리된 결과를 다른 서비스로 공유하거나 기록하는 자동화입니다.";
    case "folder_document_summary":
      return "Google Drive 폴더 안의 문서나 파일을 읽어 요약하고, 정리된 결과를 다른 서비스로 공유하거나 저장하는 자동화입니다.";
    case "mail_summary_forward":
      return "Gmail 메일 목록을 정리해 Notion 또는 Gmail 같은 다른 서비스로 전달하는 자동화입니다.";
    case "storage":
      return "파일과 문서를 읽고 정리한 뒤 다른 서비스로 전달하거나 저장하는 자동화입니다.";
    case "spreadsheet":
      return "시트 데이터를 읽어 정리하고 다시 전달하거나 저장하는 자동화입니다.";
    case "web_crawl":
    case "web_scraping":
      return "웹 데이터를 수집하고 필요한 형태로 정리해 전달하는 자동화입니다.";
    default:
      return "템플릿 이름과 연결된 서비스를 확인해 자동화의 흐름을 파악해보세요.";
  }
};

export const getTemplateDisplayDescription = ({
  category,
  description,
  name,
}: TemplatePresentationInput) => {
  const normalizedName = name?.trim() ?? "";
  const override = normalizedName
    ? TEMPLATE_DESCRIPTION_OVERRIDES[normalizedName]
    : undefined;

  if (override) {
    return override;
  }

  if (description?.trim().length) {
    return description.trim();
  }

  return getTemplateCategorySummary(category);
};

export const getTemplateRuntimeNote = ({
  category,
}: TemplatePresentationInput) => {
  if (category === "mail_summary_forward") {
    return "현재 메일 템플릿은 메일을 하나씩 개별 전송하기보다, 읽어온 메일 목록을 정리해 한 번에 요약하고 전달하는 흐름을 기준으로 동작합니다.";
  }

  if (category === "folder_document_summary") {
    return "현재 Drive 기반 템플릿은 1차 구현 기준으로 folder_new_file 모드를 중심으로 동작하며, 파일 유형에 따라 문서 본문 대신 신규 파일 1건 또는 파일 메타데이터를 중심으로 처리할 수 있습니다.";
  }

  if (category === "file_upload_auto_share") {
    return "현재 Drive 기반 업로드 템플릿은 1차 구현 기준으로 folder_new_file 모드를 중심으로 동작하며, 선택한 폴더의 최신 파일 1건을 기준으로 공유/기록하는 흐름에 가깝습니다. Notion은 기존 공유 페이지 선택을 기준으로 설명됩니다.";
  }

  return null;
};
