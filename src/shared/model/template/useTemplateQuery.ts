import { useQuery } from "@tanstack/react-query";

import { templateApi } from "../../api";
import { templateKeys } from "../../constants";

export const useTemplateQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? templateKeys.detail(id) : ["template", "unknown"],
    queryFn: () => {
      if (!id) {
        throw new Error("template id is required");
      }

      return templateApi.getById(id);
    },
    enabled: Boolean(id),
    throwOnError: false,
  });
