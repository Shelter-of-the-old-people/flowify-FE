import { useEffect, useMemo } from "react";

import { Box, Button, Input, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
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

                return (
                  <Box
                    key={field.key}
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
                    ) : (
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
