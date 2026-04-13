import type { TemplateSummary } from "@/shared";

export const getCreatedTimestamp = (createdAt: string) => {
  const createdTime = new Date(createdAt).getTime();
  return Number.isNaN(createdTime) ? 0 : createdTime;
};

export const getRelativeCreatedLabel = (createdAt: string) => {
  const createdTime = getCreatedTimestamp(createdAt);
  if (createdTime === 0) {
    return "방금 전 생성됨";
  }

  const diffMs = Math.max(0, Date.now() - createdTime);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < minuteMs) {
    return "방금 전 생성됨";
  }

  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}분 전 생성됨`;
  }

  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}시간 전 생성됨`;
  }

  if (diffMs < weekMs) {
    return `${Math.floor(diffMs / dayMs)}일 전 생성됨`;
  }

  return `${Math.floor(diffMs / weekMs)}주 전 생성됨`;
};

export const getTemplateMetaLabel = (template: TemplateSummary) => {
  if (template.requiredServices.length > 0) {
    return `필요 서비스 ${template.requiredServices.length}개`;
  }

  return `사용 ${template.useCount}회`;
};
