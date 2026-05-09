import { Box, Button, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type SinkSchemaFieldResponse,
  type SourceConfigSummaryResponse,
  getDataTypeDisplayLabel,
} from "@/entities/workflow";
import {
  type FileTypeBranchPathState,
  getFileTypeBranchLabel,
  toFileTypeBranchKeys,
} from "@/features/choice-panel";
import {
  getSinkAuxiliaryLabelKey,
  getSinkFieldSummaryLabel,
  getSinkFieldSummaryValue,
} from "@/features/configure-node";
import { SourceSummaryBlock } from "@/widgets/node-data-panel";

type SummaryRow = {
  label: string;
  value: string;
};

type ActionProps = {
  canEdit: boolean;
  onEdit: () => void;
};

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getConfigRecord = (config: FlowNodeData["config"]) =>
  config as unknown as Record<string, unknown>;

const getChoiceSelectionsRecord = (config: Record<string, unknown>) =>
  config.choiceSelections &&
  typeof config.choiceSelections === "object" &&
  !Array.isArray(config.choiceSelections)
    ? (config.choiceSelections as Record<string, string | string[]>)
    : null;

const getFieldDisplayRow = (
  serviceKey: string | null,
  field: SinkSchemaFieldResponse,
  config: Record<string, unknown>,
) => {
  const labelValue = getStringValue(
    config[getSinkAuxiliaryLabelKey(field.key)],
  );
  const value = getSinkFieldSummaryValue({
    field,
    labelValue,
    rawValue: config[field.key],
    serviceKey,
  });

  return value
    ? { label: getSinkFieldSummaryLabel(serviceKey, field), value }
    : null;
};

const SummaryRows = ({ rows }: { rows: SummaryRow[] }) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {rows.map((row) => (
        <Box
          key={`${row.label}:${row.value}`}
          px={4}
          py={4}
          bg="gray.50"
          borderRadius="2xl"
        >
          <Text color="text.secondary" fontSize="xs" mb={1}>
            {row.label}
          </Text>
          <Text fontSize="sm" fontWeight="semibold">
            {row.value}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

const SetupActionButton = ({ canEdit, onEdit }: ActionProps) =>
  canEdit ? (
    <Button alignSelf="flex-start" size="sm" variant="outline" onClick={onEdit}>
      설정 수정
    </Button>
  ) : null;

export const ConfigIssueNotice = () => (
  <Box
    bg="orange.50"
    border="1px solid"
    borderColor="orange.100"
    borderRadius="2xl"
    px={4}
    py={4}
  >
    <Text color="orange.600" fontSize="sm" fontWeight="semibold">
      설정 확인 필요
    </Text>
    <Text mt={1} color="text.secondary" fontSize="sm">
      실행 전에 이 노드의 설정을 다시 확인해 주세요.
    </Text>
  </Box>
);

export const SourceSetupSummaryBlock = ({
  canEdit,
  config,
  hasConfigIssue,
  onEdit,
  outputLabel,
  source,
}: ActionProps & {
  config: FlowNodeData["config"];
  hasConfigIssue: boolean;
  outputLabel: string | null;
  source: SourceConfigSummaryResponse | null;
}) => {
  const configRecord = getConfigRecord(config);
  const outputRows: SummaryRow[] = outputLabel
    ? [{ label: "예상 출력", value: outputLabel }]
    : [];

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          가져올 곳 설정
        </Text>
        <Text color="text.secondary" fontSize="sm">
          현재 시작 노드가 가져올 데이터 기준을 확인합니다.
        </Text>
      </Box>

      <SourceSummaryBlock config={configRecord} source={source} />
      <SummaryRows rows={outputRows} />

      {hasConfigIssue ? <ConfigIssueNotice /> : null}
      <SetupActionButton canEdit={canEdit} onEdit={onEdit} />
    </Box>
  );
};

export const SinkSetupSummaryBlock = ({
  canEdit,
  config,
  fields,
  hasConfigIssue,
  inputLabel,
  onEdit,
  serviceLabel,
  serviceKey,
}: ActionProps & {
  config: FlowNodeData["config"];
  fields: SinkSchemaFieldResponse[];
  hasConfigIssue: boolean;
  inputLabel: string | null;
  serviceLabel: string | null;
  serviceKey: string | null;
}) => {
  const configRecord = getConfigRecord(config);
  const fieldRows = fields
    .map((field) => getFieldDisplayRow(serviceKey, field, configRecord))
    .filter((row): row is SummaryRow => row !== null);
  const rows: SummaryRow[] = [
    serviceLabel ? { label: "서비스", value: serviceLabel } : null,
    inputLabel ? { label: "보낼 데이터", value: inputLabel } : null,
    ...fieldRows,
  ].filter((row): row is SummaryRow => row !== null);

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          보낼 곳
        </Text>
        <Text color="text.secondary" fontSize="sm">
          처리 결과가 저장되거나 전송될 목적지를 확인합니다.
        </Text>
      </Box>

      <SummaryRows rows={rows} />

      {hasConfigIssue ? <ConfigIssueNotice /> : null}
      <SetupActionButton canEdit={canEdit} onEdit={onEdit} />
    </Box>
  );
};

export const ProcessingMethodSummaryBlock = ({
  choiceNodeType,
  outputType,
}: {
  choiceNodeType: string | null | undefined;
  outputType: string | null | undefined;
}) => {
  const methodLabel =
    choiceNodeType === "LOOP"
      ? "하나씩 처리"
      : choiceNodeType === "PASSTHROUGH"
        ? "그대로 전달"
        : "처리 방식 선택 완료";
  const outputLabel =
    getDataTypeDisplayLabel(outputType) ?? outputType ?? "출력 데이터";

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          처리 방식
        </Text>
        <Text color="text.secondary" fontSize="sm">
          이 단계는 다음 설정을 선택하기 위한 처리 방식 노드입니다.
        </Text>
      </Box>

      <SummaryRows
        rows={[
          { label: "선택된 방식", value: methodLabel },
          { label: "예상 출력", value: outputLabel },
        ]}
      />
    </Box>
  );
};

export const BranchSetupSummaryBlock = ({
  branchStates,
  canEdit,
  config,
  hasConfigIssue,
  onEdit,
}: ActionProps & {
  branchStates: FileTypeBranchPathState[];
  config: FlowNodeData["config"];
  hasConfigIssue: boolean;
}) => {
  const configRecord = getConfigRecord(config);
  const choiceSelections = getChoiceSelectionsRecord(configRecord);
  const branchTypes = Array.isArray(configRecord.branchTypes)
    ? configRecord.branchTypes.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : null;
  const branchKeys = toFileTypeBranchKeys(
    choiceSelections ?? (branchTypes ? { branch_config: branchTypes } : null),
  );
  const branchLabel =
    branchKeys.length > 0
      ? branchKeys.map(getFileTypeBranchLabel).join(", ")
      : "\uBBF8\uC124\uC815";
  const branchRows: SummaryRow[] = branchStates.map((branchState) => ({
    label: branchState.branchLabel,
    value: !branchState.hasPath
      ? "경로 비어 있음"
      : branchState.isConfigured
        ? (branchState.targetLabel ?? "설정 완료")
        : "설정 필요",
  }));

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          {"\uD30C\uC77C \uC885\uB958 \uBD84\uAE30"}
        </Text>
        <Text color="text.secondary" fontSize="sm">
          {
            "\uC120\uD0DD\uD55C \uD30C\uC77C \uC885\uB958\uBCC4 \uB2E4\uC74C \uCC98\uB9AC \uACBD\uB85C\uB97C \uD655\uC778\uD569\uB2C8\uB2E4."
          }
        </Text>
      </Box>

      <SummaryRows
        rows={[
          {
            label: "\uBD84\uAE30 \uAE30\uC900",
            value: "\uD30C\uC77C \uC885\uB958",
          },
          { label: "\uC120\uD0DD\uD55C \uBD84\uAE30", value: branchLabel },
          ...branchRows,
        ]}
      />
      {hasConfigIssue ? <ConfigIssueNotice /> : null}
      <SetupActionButton canEdit={canEdit} onEdit={onEdit} />
    </Box>
  );
};

export const FallbackNodeSummaryBlock = ({
  canEdit,
  hasConfigIssue,
  label,
  onEdit,
  outputLabel,
}: ActionProps & {
  hasConfigIssue: boolean;
  label: string;
  outputLabel: string | null;
}) => (
  <Box display="flex" flexDirection="column" gap={4}>
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={2}>
        {label}
      </Text>
      <Text color="text.secondary" fontSize="sm">
        이 노드의 설정 요약을 확인합니다.
      </Text>
    </Box>

    <SummaryRows
      rows={outputLabel ? [{ label: "예상 출력", value: outputLabel }] : []}
    />
    {hasConfigIssue ? <ConfigIssueNotice /> : null}
    <SetupActionButton canEdit={canEdit} onEdit={onEdit} />
  </Box>
);
