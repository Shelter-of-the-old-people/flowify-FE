import { useEffect, useMemo, useState } from "react";

import { Box, Button, Input, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type SinkSchemaFieldResponse,
  getNodeStatusMissingFieldLabel,
  toBackendDataType,
  toEdgeDefinition,
  toNodeDefinition,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
  useWorkflowSchemaPreviewMutation,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";

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

const getInitialDraftValues = (
  fields: SinkSchemaFieldResponse[],
  sinkConfig: Record<string, unknown>,
) =>
  Object.fromEntries(
    fields.map((field) => {
      const rawValue = sinkConfig[field.key];
      const stringValue =
        typeof rawValue === "string" || typeof rawValue === "number"
          ? String(rawValue)
          : "";

      return [field.key, stringValue];
    }),
  );

const normalizeDraftValue = (
  field: SinkSchemaFieldResponse,
  value: string,
): string | number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (field.type === "number") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return value;
};

const validateDraft = (
  draftValues: Record<string, string>,
  fields: SinkSchemaFieldResponse[],
) => {
  const nextValidationErrors: Record<string, string> = {};

  fields.forEach((field) => {
    const rawValue = draftValues[field.key] ?? "";
    const trimmedValue = rawValue.trim();

    if (field.required && trimmedValue.length === 0) {
      nextValidationErrors[field.key] = `${field.label} 항목을 입력해 주세요.`;
      return;
    }

    if (field.type === "number" && trimmedValue.length > 0) {
      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        nextValidationErrors[field.key] =
          `${field.label} 항목에는 올바른 숫자를 입력해 주세요.`;
      }
    }
  });

  return nextValidationErrors;
};

const buildCommittedConfigFromDraft = ({
  draftValues,
  fields,
  sinkConfig,
}: {
  draftValues: Record<string, string>;
  fields: SinkSchemaFieldResponse[];
  sinkConfig: Record<string, unknown>;
}) => {
  const schemaFieldKeys = new Set(fields.map((field) => field.key));
  const preservedConfigEntries = Object.entries(sinkConfig).filter(
    ([key]) => !schemaFieldKeys.has(key) && key !== "isConfigured",
  );
  const nextConfig = Object.fromEntries(preservedConfigEntries) as Record<
    string,
    unknown
  >;

  fields.forEach((field) => {
    const normalizedValue = normalizeDraftValue(
      field,
      draftValues[field.key] ?? "",
    );
    if (normalizedValue !== undefined) {
      nextConfig[field.key] = normalizedValue;
    }
  });

  const isConfigured = fields
    .filter((field) => field.required)
    .every((field) =>
      Object.prototype.hasOwnProperty.call(nextConfig, field.key),
    );

  return {
    ...nextConfig,
    isConfigured,
  } as FlowNodeData["config"];
};

type SinkSchemaEditorProps = {
  fields: SinkSchemaFieldResponse[];
  nodeId: string;
  onSaveConfig: (config: FlowNodeData["config"]) => void;
  readOnly: boolean;
  sinkConfig: Record<string, unknown>;
};

const SinkSchemaEditor = ({
  fields,
  nodeId,
  onSaveConfig,
  readOnly,
  sinkConfig,
}: SinkSchemaEditorProps) => {
  const initialDraftValues = useMemo(
    () => getInitialDraftValues(fields, sinkConfig),
    [fields, sinkConfig],
  );
  const [draftValues, setDraftValues] =
    useState<Record<string, string>>(initialDraftValues);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const hasChanges = useMemo(
    () =>
      fields.some(
        (field) =>
          (draftValues[field.key] ?? "") !==
          (initialDraftValues[field.key] ?? ""),
      ),
    [draftValues, fields, initialDraftValues],
  );

  const handleFieldChange = (fieldKey: string, value: string) => {
    setDraftValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
    setValidationErrors((current) => {
      if (!(fieldKey in current)) {
        return current;
      }

      const nextValidationErrors = { ...current };
      delete nextValidationErrors[fieldKey];
      return nextValidationErrors;
    });
  };

  const handleResetDraft = () => {
    setDraftValues(initialDraftValues);
    setValidationErrors({});
  };

  const handleSaveDraft = () => {
    const nextValidationErrors = validateDraft(draftValues, fields);
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    const nextConfig = buildCommittedConfigFromDraft({
      draftValues,
      fields,
      sinkConfig,
    });

    onSaveConfig(nextConfig);
    setValidationErrors({});
  };

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box
        display="flex"
        flexDirection="column"
        gap={4}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {fields.map((field) => {
          const stringValue = draftValues[field.key] ?? "";
          const validationError = validationErrors[field.key] ?? null;

          return (
            <Box
              key={`${nodeId}-${field.key}`}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              <Text fontSize="sm" fontWeight="medium">
                {field.label}
                {field.required ? " *" : ""}
              </Text>

              {field.type === "select" && field.options ? (
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {field.options.map((option) => (
                    <Button
                      key={option}
                      disabled={readOnly}
                      size="sm"
                      variant={stringValue === option ? "solid" : "outline"}
                      onClick={() => handleFieldChange(field.key, option)}
                    >
                      {option}
                    </Button>
                  ))}
                </Box>
              ) : (
                <Input
                  disabled={readOnly}
                  placeholder={`${FIELD_LABELS[field.type] ?? field.type} 입력`}
                  type={getFieldInputType(field.type)}
                  value={stringValue}
                  onChange={(event) =>
                    handleFieldChange(field.key, event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
              )}

              {validationError ? (
                <Text color="red.500" fontSize="xs">
                  {validationError}
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Box
        alignItems={{ base: "stretch", md: "center" }}
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={3}
        justifyContent="space-between"
      >
        <Text color="text.secondary" fontSize="xs">
          {hasChanges
            ? "저장되지 않은 변경 사항이 있습니다."
            : "현재 패널에 표시된 값이 editor store에 반영된 상태입니다."}
        </Text>

        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            disabled={readOnly || !hasChanges}
            size="sm"
            variant="outline"
            onClick={handleResetDraft}
          >
            되돌리기
          </Button>
          <Button
            disabled={readOnly || !hasChanges}
            size="sm"
            onClick={handleSaveDraft}
          >
            설정 저장
          </Button>
        </Box>
      </Box>
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
  const replaceNodeConfig = useWorkflowStore(
    (state) => state.replaceNodeConfig,
  );
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
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

  const sinkEditorKey = useMemo(() => {
    if (!sinkSchema || !serviceKey) {
      return null;
    }

    const snapshot = sinkSchema.fields.map((field) => [
      field.key,
      sinkConfig[field.key] ?? "",
    ]);

    return `${nodeId}:${serviceKey}:${JSON.stringify(snapshot)}`;
  }, [nodeId, serviceKey, sinkConfig, sinkSchema]);

  return (
    <NodePanelShell
      description="현재 결과를 어디로 보낼지 정한 뒤 마지막 단계에서 상세 설정을 채워넣습니다."
      eyebrow="도착 설정"
      title={selectedSinkService?.label ?? "Destination"}
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
            <SinkSchemaEditor
              key={sinkEditorKey ?? nodeId}
              fields={sinkSchema.fields}
              nodeId={nodeId}
              readOnly={readOnly}
              sinkConfig={sinkConfig}
              onSaveConfig={(config) => replaceNodeConfig(nodeId, config)}
            />
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
