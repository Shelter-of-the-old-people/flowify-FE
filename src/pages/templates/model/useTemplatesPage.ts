import { useNavigate } from "react-router";

import { buildPath } from "@/shared";

export const getTemplateDescription = (description: string) =>
  description?.trim().length > 0
    ? description
    : "설명이 아직 없는 템플릿입니다.";

export const useTemplatesPage = () => {
  const navigate = useNavigate();

  const handleOpenTemplate = (templateId: string) => {
    navigate(buildPath.templateDetail(templateId));
  };

  return {
    handleOpenTemplate,
  };
};
