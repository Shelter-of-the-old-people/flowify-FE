import {
  type TemplateSummary,
  getTemplateCategoryLabel,
  getTemplateDisplayDescription,
} from "@/entities/template";
import { getRelativeTimeLabel } from "@/shared";

export const getRelativeCreatedLabel = (createdAt: string) =>
  getRelativeTimeLabel(createdAt, {
    suffix: "생성됨",
  });

export const getTemplateDescription = (
  template: Pick<TemplateSummary, "category" | "description" | "name">,
) => getTemplateDisplayDescription(template);

export const getTemplateMetaLabel = (template: TemplateSummary) => {
  const categoryLabel = getTemplateCategoryLabel(template.category);

  if (template.requiredServices.length > 0) {
    return `${categoryLabel} · 필요 서비스 ${template.requiredServices.length}개`;
  }

  return `${categoryLabel} · 사용 ${template.useCount}회`;
};
