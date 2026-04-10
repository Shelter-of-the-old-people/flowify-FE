import { useMutation, useQuery } from "@tanstack/react-query";

import type { WorkflowResponse } from "../api";
import { templateApi } from "../api";
import { QUERY_KEYS } from "../constants";
import { queryClient } from "../libs";

export const useTemplateListQuery = (category?: string) =>
  useQuery({
    queryKey: QUERY_KEYS.templates(category),
    queryFn: async () => {
      const response = await templateApi.getList(category);
      return response.data.data;
    },
    throwOnError: false,
  });

export const useTemplateQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? QUERY_KEYS.template(id) : ["templates", "unknown"],
    queryFn: async () => {
      if (!id) {
        throw new Error("template id is required");
      }

      const response = await templateApi.getById(id);
      return response.data.data;
    },
    enabled: Boolean(id),
    throwOnError: false,
  });

export const useInstantiateTemplateMutation = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.instantiate(id);
      return response.data.data;
    },
    onSuccess: async (workflow: WorkflowResponse) => {
      queryClient.setQueryData(QUERY_KEYS.workflow(workflow.id), workflow);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflows,
      });
    },
  });

export const useCreateTemplateMutation = () =>
  useMutation({
    mutationFn: async (body: Parameters<typeof templateApi.create>[0]) => {
      const response = await templateApi.create(body);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.templates(),
      });
    },
  });
