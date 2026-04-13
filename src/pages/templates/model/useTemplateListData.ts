import { useMemo } from "react";

import { useTemplateListQuery } from "@/shared";

export const useTemplateListData = () => {
  const { data, isLoading, isError, refetch } = useTemplateListQuery();

  const templates = useMemo(() => data ?? [], [data]);
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
