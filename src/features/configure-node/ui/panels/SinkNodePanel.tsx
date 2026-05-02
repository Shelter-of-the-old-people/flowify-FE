import { useMemo, useState } from "react";

import { Box, Button, Input, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type TargetOptionItemResponse,
  getNodeStatusMissingFieldLabel,
  toBackendDataType,
  toEdgeDefinition,
  toNodeDefinition,
  useCreateGoogleDriveFolderMutation,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
  useTargetOptionsQuery,
  useWorkflowSchemaPreviewMutation,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";
import { RemoteOptionPicker, getApiErrorMessage } from "@/shared";

import { type NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

const FIELD_LABELS: Record<string, string> = {
  calendar_picker: "캘린더",
  channel_picker: "채널",
  email_input: "이메일",
  folder_picker: "폴더",
  number: "숫자",
  page_picker: "페이지",
  select: "선택",
  sheet_picker: "시트",
  text: "텍스트",
};

const getFieldInputType = (fieldType: string) => {
  if (fieldType === "email_input") {
    return "email";
  }

  if (fieldType === "number") {
    return "number";
  }

  return "text";
};

interface GoogleDriveFolderPickerFieldProps {
  disabled: boolean;
  fieldKey: string;
  label: string;
  required: boolean;
  selectedId: string;
  selectedLabel: string;
  onChange: (nextConfig: Partial<FlowNodeData["config"]>) => void;
}

const GoogleDriveFolderPickerField = ({
  disabled,
  fieldKey,
  label,
  onChange,
  required,
  selectedId,
  selectedLabel,
}: GoogleDriveFolderPickerFieldProps) => {
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const [createName, setCreateName] = useState("");
  const [createdItems, setCreatedItems] = useState<TargetOptionItemResponse[]>(
    [],
  );
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [path, setPath] = useState<TargetOptionItemResponse[]>([]);
  const [query, setQuery] = useState("");
  const { isPending: isCreatePending, mutateAsync: createFolder } =
    useCreateGoogleDriveFolderMutation();
  const parentId = path.length > 0 ? (path[path.length - 1]?.id ?? null) : null;
  const currentLocationLabel = path[path.length - 1]?.label ?? "내 드라이브";
  const { data, error, fetchNextPage, hasNextPage, isFetching, isLoading } =
    useTargetOptionsQuery(
      {
        mode: "folder_all_files",
        parentId,
        query: query.trim() || null,
        serviceKey: "google_drive",
      },
      {
        enabled: !disabled,
      },
    );
  const items = useMemo(() => {
    const seenIds = new Set<string>();
    const mergedItems: TargetOptionItemResponse[] = [];

    for (const item of createdItems) {
      if (seenIds.has(item.id)) {
        continue;
      }
      seenIds.add(item.id);
      mergedItems.push(item);
    }

    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (seenIds.has(item.id)) {
          continue;
        }
        seenIds.add(item.id);
        mergedItems.push(item);
      }
    }

    return mergedItems;
  }, [createdItems, data?.pages]);

  const handleCreateFolder = () => {
    const normalizedName = createName.trim();
    if (!normalizedName) {
      return;
    }

    void (async () => {
      try {
        setCreateErrorMessage(null);
        const createdFolder = await createFolder({
          name: normalizedName,
          parentId,
        });

        setCreatedItems((current) => [
          createdFolder,
          ...current.filter((item) => item.id !== createdFolder.id),
        ]);
        setCreateName("");
        setIsCreateFormOpen(false);
        onChange({
          [fieldKey]: createdFolder.id,
          [`${fieldKey}_label`]: createdFolder.label,
        } as Partial<FlowNodeData["config"]>);
      } catch (error) {
        setCreateErrorMessage(getApiErrorMessage(error));
      }
    })();
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        {label}
        {required ? " *" : ""}
      </Text>

      <Text color="text.secondary" fontSize="xs">
        {selectedId
          ? `선택됨: ${selectedLabel || selectedId}`
          : "저장할 Google Drive 폴더를 선택해주세요."}
      </Text>

      <Box
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="2xl"
        p={3}
      >
        <Text color="text.secondary" fontSize="xs" mb={3}>
          현재 위치: {currentLocationLabel}
        </Text>

        {isCreateFormOpen ? (
          <Box display="flex" flexDirection="column" gap={2}>
            <Input
              disabled={disabled || isCreatePending}
              placeholder="새 폴더 이름"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
            <Box display="flex" gap={2}>
              <Button
                disabled={disabled || createName.trim().length === 0}
                loading={isCreatePending}
                size="sm"
                onClick={handleCreateFolder}
              >
                폴더 만들기
              </Button>
              <Button
                disabled={disabled || isCreatePending}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreateErrorMessage(null);
                  setCreateName("");
                  setIsCreateFormOpen(false);
                }}
              >
                취소
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            alignSelf="flex-start"
            disabled={disabled}
            size="sm"
            variant="outline"
            onClick={() => {
              setCreateErrorMessage(null);
              setCreateName("");
              setIsCreateFormOpen(true);
            }}
          >
            새 폴더 만들기
          </Button>
        )}

        {createErrorMessage ? (
          <Text color="status.error" fontSize="xs" mt={2}>
            {createErrorMessage}
          </Text>
        ) : null}
      </Box>

      <RemoteOptionPicker
        disabled={disabled}
        emptyMessage="표시할 폴더가 없습니다."
        errorMessage={error ? getApiErrorMessage(error) : null}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetching && !isLoading}
        items={items}
        path={path.map((item) => ({ id: item.id, label: item.label }))}
        rootLabel="내 드라이브"
        searchPlaceholder="폴더 검색"
        searchValue={query}
        selectedId={selectedId || null}
        onBrowse={(option) => {
          setCreatedItems([]);
          setPath((current) => [...current, option]);
        }}
        onLoadMore={() => {
          if (!hasNextPage) {
            return;
          }

          void fetchNextPage();
        }}
        onPathSelect={(index) => {
          setCreatedItems([]);
          setPath((current) => current.slice(0, index + 1));
        }}
        onResetPath={() => {
          setCreatedItems([]);
          setPath([]);
        }}
        onSearchChange={(nextQuery) => {
          setCreatedItems([]);
          setQuery(nextQuery);
        }}
        onSelect={(option) =>
          onChange({
            [fieldKey]: option.id,
            [`${fieldKey}_label`]: option.label,
          } as Partial<FlowNodeData["config"]>)
        }
      />
    </Box>
  );
};

export const SinkNodePanel = ({
  data,
  nodeId,
  readOnly = false,
}: NodePanelProps) => {
  const edges = useWorkflowStore((state) => state.edges);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const nodes = useWorkflowStore((state) => state.nodes);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: sinkCatalog } = useSinkCatalogQuery();
  const {
    data: schemaPreview,
    isPending: isSchemaPreviewPending,
    mutate: previewSchema,
  } = useWorkflowSchemaPreviewMutation();
  const sinkConfig = data.config as unknown as Record<string, unknown>;
  const serviceKey =
    typeof sinkConfig.service === "string" ? sinkConfig.service : null;
  const inputType = data.inputTypes[0] ?? null;
  const sinkInputType = inputType ? toBackendDataType(inputType) : null;
  const selectedSinkService =
    sinkCatalog?.services.find((service) => service.key === serviceKey) ?? null;
  const { data: sinkSchema } = useSinkSchemaQuery(serviceKey, sinkInputType);
  const nodeStatus = nodeStatuses[nodeId] ?? null;
  const missingFields =
    nodeStatus?.missingFields.map(getNodeStatusMissingFieldLabel) ?? [];

  const previewRequest = useMemo(() => {
    const previewNodes = nodes.filter((node) => node.id !== nodeId);
    const previewEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    );

    return {
      nodes: previewNodes.map((node) =>
        toNodeDefinition(node, startNodeId, endNodeId),
      ),
      edges: previewEdges.map(toEdgeDefinition),
    };
  }, [edges, endNodeId, nodeId, nodes, startNodeId]);

  useEffect(() => {
    if (!workflowId || previewRequest.nodes.length === 0) {
      return;
    }

    previewSchema(previewRequest);
  }, [previewRequest, previewSchema, workflowId]);

  const handleFieldChange = (
    fieldKey: string,
    fieldType: string,
    value: string,
  ) => {
    const nextValue =
      value === "" ? null : fieldType === "number" ? Number(value) : value;

    updateNodeConfig(nodeId, {
      [fieldKey]: nextValue,
    } as Partial<FlowNodeData["config"]>);
  };

  return (
    <NodePanelShell
      eyebrow="도착 설정"
      title={selectedSinkService?.label ?? "Destination"}
      description="현재 결과를 어디로 보낼지 정한 뒤 마지막 단계에서 상세 설정을 채웁니다."
    >
      <Box display="flex" flexDirection="column" gap={6}>
        {nodeStatus ? (
          <Box bg="gray.50" borderRadius="2xl" px={4} py={4}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              현재 상태
            </Text>
            <Text color="text.secondary" fontSize="sm">
              설정 완료: {nodeStatus.configured ? "예" : "아니오"}
            </Text>
            <Text color="text.secondary" fontSize="sm">
              실행 가능: {nodeStatus.executable ? "예" : "아니오"}
            </Text>
            {missingFields.length > 0 ? (
              <Text color="text.secondary" fontSize="sm" mt={2}>
                누락 항목: {missingFields.join(", ")}
              </Text>
            ) : null}
          </Box>
        ) : null}

        <Box display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="medium">
            현재 결과 타입
          </Text>
          <Text color="text.secondary" fontSize="sm">
            {inputType ? sinkInputType : "결과 타입 확인 필요"}
          </Text>
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          <Text fontSize="sm" fontWeight="medium">
            결과 스키마 미리보기
          </Text>

          {isSchemaPreviewPending ? (
            <Box alignItems="center" display="flex" gap={2}>
              <Spinner color="gray.500" size="sm" />
              <Text color="text.secondary" fontSize="sm">
                현재 결과 스키마를 계산하는 중입니다.
              </Text>
            </Box>
          ) : schemaPreview ? (
            <Box display="flex" flexDirection="column" gap={2}>
              {schemaPreview.fields.map((field) => (
                <Box
                  key={field.key}
                  bg="gray.50"
                  borderRadius="xl"
                  px={4}
                  py={3}
                >
                  <Text fontSize="sm" fontWeight="semibold">
                    {field.label}
                  </Text>
                  <Text color="text.secondary" fontSize="xs">
                    {field.key} · {field.value_type}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : (
            <Text color="text.secondary" fontSize="sm">
              표시할 스키마가 없습니다.
            </Text>
          )}
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          <Text fontSize="sm" fontWeight="medium">
            sink 상세 설정
          </Text>

          {selectedSinkService && sinkSchema ? (
            <Box display="flex" flexDirection="column" gap={4}>
              {sinkSchema.fields.map((field) => {
                const rawValue = sinkConfig[field.key];
                const stringValue =
                  typeof rawValue === "string" || typeof rawValue === "number"
                    ? String(rawValue)
                    : "";
                const labelValue =
                  typeof sinkConfig[`${field.key}_label`] === "string"
                    ? String(sinkConfig[`${field.key}_label`])
                    : "";

                return (
                  <Box
                    key={field.key}
                    display="flex"
                    flexDirection="column"
                    gap={2}
                  >
                    {serviceKey === "google_drive" &&
                    field.type === "folder_picker" ? (
                      <GoogleDriveFolderPickerField
                        disabled={readOnly}
                        fieldKey={field.key}
                        label={field.label}
                        required={field.required}
                        selectedId={stringValue}
                        selectedLabel={labelValue}
                        onChange={(nextConfig) =>
                          updateNodeConfig(nodeId, nextConfig)
                        }
                      />
                    ) : field.type === "select" && field.options ? (
                      <>
                        <Text fontSize="sm" fontWeight="medium">
                          {field.label}
                          {field.required ? " *" : ""}
                        </Text>

                        <Box display="flex" flexWrap="wrap" gap={2}>
                          {field.options.map((option) => (
                            <Button
                              key={option}
                              disabled={readOnly}
                              size="sm"
                              variant={
                                stringValue === option ? "solid" : "outline"
                              }
                              onClick={() =>
                                handleFieldChange(field.key, field.type, option)
                              }
                            >
                              {option}
                            </Button>
                          ))}
                        </Box>
                      </>
                    ) : (
                      <>
                        <Text fontSize="sm" fontWeight="medium">
                          {field.label}
                          {field.required ? " *" : ""}
                        </Text>

                        <Input
                          disabled={readOnly}
                          placeholder={`${FIELD_LABELS[field.type] ?? field.type} 입력`}
                          type={getFieldInputType(field.type)}
                          value={stringValue}
                          onChange={(event) =>
                            handleFieldChange(
                              field.key,
                              field.type,
                              event.target.value,
                            )
                          }
                        />
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Text color="text.secondary" fontSize="sm">
              sink 서비스를 먼저 선택하면 상세 설정을 채울 수 있습니다.
            </Text>
          )}
        </Box>
      </Box>
    </NodePanelShell>
  );
};
