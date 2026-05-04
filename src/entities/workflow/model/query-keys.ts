import {
  type ChoiceQueryContext,
  type SinkTargetOptionsParameters,
  type SourceTargetOptionsParameters,
} from "../api";

const normalizeChoiceQueryContext = (context?: ChoiceQueryContext) => {
  const normalized = {
    file_subtype: context?.file_subtype?.trim() || undefined,
    service: context?.service?.trim() || undefined,
  };

  return normalized.file_subtype || normalized.service ? normalized : null;
};

const normalizeSourceTargetOptionsParameters = (
  params: SourceTargetOptionsParameters,
) => ({
  cursor: params.cursor?.trim() || null,
  mode: params.mode,
  parentId: params.parentId?.trim() || null,
  query: params.query?.trim() || null,
});

const normalizeSinkTargetOptionsParameters = (
  params: SinkTargetOptionsParameters,
) => ({
  cursor: params.cursor?.trim() || null,
  parentId: params.parentId?.trim() || null,
  query: params.query?.trim() || null,
  type: params.type,
});

export const workflowKeys = {
  all: () => ["workflow"] as const,
  editorCatalog: () => [...workflowKeys.all(), "editor-catalog"] as const,
  sourceCatalog: () => [...workflowKeys.editorCatalog(), "sources"] as const,
  sourceTargetOptionsRoot: (serviceKey: string) =>
    [...workflowKeys.sourceCatalog(), serviceKey, "target-options"] as const,
  sourceTargetOptions: (
    serviceKey: string,
    params: SourceTargetOptionsParameters,
  ) =>
    [
      ...workflowKeys.sourceTargetOptionsRoot(serviceKey),
      normalizeSourceTargetOptionsParameters(params),
    ] as const,
  sinkCatalog: () => [...workflowKeys.editorCatalog(), "sinks"] as const,
  sinkTargetOptionsRoot: (serviceKey: string) =>
    [...workflowKeys.sinkCatalog(), serviceKey, "target-options"] as const,
  sinkTargetOptions: (
    serviceKey: string,
    params: SinkTargetOptionsParameters,
  ) =>
    [
      ...workflowKeys.sinkTargetOptionsRoot(serviceKey),
      normalizeSinkTargetOptionsParameters(params),
    ] as const,
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
  nodeSchemaPreview: (workflowId: string, nodeId: string) =>
    [
      ...workflowKeys.detail(workflowId),
      "nodes",
      nodeId,
      "schema-preview",
    ] as const,
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
