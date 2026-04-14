import { useQuery } from "@tanstack/react-query";

import { templateApi } from "../../api";
import { templateKeys } from "../../constants";

export const useTemplateListQuery = (category?: string) =>
  useQuery({
    queryKey: templateKeys.list(category),
    queryFn: () => templateApi.getList(category),
    throwOnError: false,
  });
