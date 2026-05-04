import { useNavigate } from "react-router";

import { buildPath } from "@/shared";

export const useTemplatesPage = () => {
  const navigate = useNavigate();

  const handleOpenTemplate = (templateId: string) => {
    navigate(buildPath.templateDetail(templateId));
  };

  return {
    handleOpenTemplate,
  };
};
