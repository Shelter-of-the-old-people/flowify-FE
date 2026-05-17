import { useMemo } from "react";

import { useTemplateListQuery } from "@/entities";
import { isRemovedServiceTemplate } from "@/entities/template";

export const useTemplateListData = () => {
  const { data, isLoading, isError, refetch } = useTemplateListQuery();

  const templates = useMemo(
    () =>
      (data ?? []).filter(
        (template) => !isRemovedServiceTemplate(template.requiredServices),
      ),
    [data],
  );
  const hasTemplates = templates.length > 0;

  const handleReload = () => {
    void refetch();
  };

  return {
    templates,
    hasTemplates,
    isLoading,
    isError,
    handleReload,
  };
};
