import { useMutation } from "@tanstack/react-query";

import { templateApi } from "../../api";
import { templateKeys } from "../../constants";
import { queryClient } from "../../libs";

export const useCreateTemplateMutation = () =>
  useMutation({
    mutationFn: (body: Parameters<typeof templateApi.create>[0]) =>
      templateApi.create(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: templateKeys.lists(),
      });
    },
  });
