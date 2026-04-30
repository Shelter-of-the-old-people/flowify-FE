import { type ChoiceQueryContext } from "../api";

const normalizeChoiceQueryContext = (context?: ChoiceQueryContext) => {
  const normalized = {
    file_subtype: context?.file_subtype?.trim() || undefined,
    service: context?.service?.trim() || undefined,
  };

  return normalized.file_subtype || normalized.service ? normalized : null;
};

export const workflowKeys = {
  all: () => ["workflow"] as const,
  editorCatalog: () => [...workflowKeys.all(), "editor-catalog"] as const,
  sourceCatalog: () => [...workflowKeys.editorCatalog(), "sources"] as const,
  sinkCatalog: () => [...workflowKeys.editorCatalog(), "sinks"] as const,
  sinkSchema: (serviceKey: string, inputType: string) =>
    [...workflowKeys.sinkCatalog(), serviceKey, "schema", inputType] as const,
  mappingRules: () =>
    [...workflowKeys.editorCatalog(), "mapping-rules"] as const,
  lists: () => [...workflowKeys.all(), "list"] as const,
  list: (params: { page: number; size: number }) =>
    [...workflowKeys.lists(), params.page, params.size] as const,
  infiniteList: (size: number) =>
    [...workflowKeys.lists(), "infinite", size] as const,
  details: () => [...workflowKeys.all(), "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  schemaPreview: (workflowId: string) =>
    [...workflowKeys.detail(workflowId), "schema-preview"] as const,
  choicesRoot: (workflowId: string) =>
    [...workflowKeys.detail(workflowId), "choices"] as const,
  choice: (
    workflowId: string,
    prevNodeId: string,
    context?: ChoiceQueryContext,
  ) => {
    const normalizedContext = normalizeChoiceQueryContext(context);

    return normalizedContext
      ? ([
          ...workflowKeys.choicesRoot(workflowId),
          prevNodeId,
          normalizedContext,
        ] as const)
      : ([...workflowKeys.choicesRoot(workflowId), prevNodeId] as const);
  },
} as const;
