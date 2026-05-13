import {
  type ExecutionNodeData,
  type NodeStatusSummaryResponse,
  type SourceConfigSummaryResponse,
  getCanonicalInputTypeLabel,
  getExecutionErrorDisplayMessage,
  getExecutionStatusLabel,
  getNodeDataReasonLabel,
  getTriggerKindLabel,
  isSuccessfulExecutionStatus,
} from "@/entities";

type SourceSummaryInput = {
  config: Record<string, unknown> | null;
  source: SourceConfigSummaryResponse | null;
};

export type NodeDataSummaryRow = {
  label: string;
  value: string;
};

export type NodeDataNotice = {
  title: string;
  description?: string;
  tone: "error" | "warning";
};

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const getSourceSummaryRows = ({
  config,
  source,
}: SourceSummaryInput): NodeDataSummaryRow[] => {
  const serviceLabel =
    source?.serviceLabel ??
    source?.service ??
    getStringValue(config?.service) ??
    null;
  const modeLabel =
    source?.modeLabel ?? source?.mode ?? getStringValue(config?.source_mode);
  const targetLabel =
    source?.targetLabel ??
    getStringValue(config?.target_label) ??
    source?.target ??
    getStringValue(config?.target);
  const canonicalInputType =
    getCanonicalInputTypeLabel(source?.canonicalInputType) ??
    getCanonicalInputTypeLabel(getStringValue(config?.canonical_input_type));
  const triggerKind =
    getTriggerKindLabel(source?.triggerKind) ??
    getTriggerKindLabel(getStringValue(config?.trigger_kind));

  return [
    serviceLabel ? { label: "서비스", value: serviceLabel } : null,
    modeLabel ? { label: "가져오는 방식", value: modeLabel } : null,
    targetLabel ? { label: "선택한 대상", value: targetLabel } : null,
    canonicalInputType
      ? { label: "가져오는 데이터", value: canonicalInputType }
      : null,
    triggerKind ? { label: "실행 방식", value: triggerKind } : null,
  ].filter((row): row is NodeDataSummaryRow => row !== null);
};

export const getSourceSummaryDescription = ({
  config,
  source,
}: SourceSummaryInput) => {
  const serviceLabel =
    source?.serviceLabel ??
    source?.service ??
    getStringValue(config?.service) ??
    null;
  const targetLabel =
    source?.targetLabel ??
    getStringValue(config?.target_label) ??
    source?.target ??
    getStringValue(config?.target);
  const canonicalInputType =
    getCanonicalInputTypeLabel(source?.canonicalInputType) ??
    getCanonicalInputTypeLabel(getStringValue(config?.canonical_input_type));

  if (serviceLabel && targetLabel && canonicalInputType) {
    return `${serviceLabel}의 ${targetLabel}에서 ${canonicalInputType}을 가져옵니다.`;
  }

  if (serviceLabel && canonicalInputType) {
    return `${serviceLabel}에서 ${canonicalInputType}을 가져옵니다.`;
  }

  return "시작 노드 설정을 기준으로 워크플로우에 들어올 데이터를 요약합니다.";
};

export const getExecutionStatusNotice = (
  executionData: ExecutionNodeData | null,
): NodeDataNotice | null => {
  if (!executionData) {
    return null;
  }

  if (
    executionData.available &&
    isSuccessfulExecutionStatus(executionData.status)
  ) {
    return null;
  }

  const reasonLabel = getNodeDataReasonLabel(executionData.reason);
  const statusLabel = getExecutionStatusLabel(executionData.status);
  const errorMessage = executionData.error
    ? getExecutionErrorDisplayMessage(executionData.error)
    : null;

  if (executionData.error || executionData.reason === "NODE_FAILED") {
    return {
      title: "실행 실패",
      description:
        errorMessage ?? reasonLabel ?? "이 단계 실행 중 문제가 발생했습니다.",
      tone: "error",
    };
  }

  if (reasonLabel || statusLabel) {
    return {
      title: statusLabel ?? reasonLabel ?? "확인 필요",
      description: reasonLabel ?? undefined,
      tone: "warning",
    };
  }

  return null;
};

export const getNodeConfigStatusNotice = (
  status: NodeStatusSummaryResponse | null | undefined,
  missingFields: string[],
): NodeDataNotice | null => {
  if (!status) {
    return null;
  }

  if (status.configured && status.executable) {
    return null;
  }

  const description =
    missingFields.length > 0
      ? `확인할 항목: ${missingFields.join(", ")}`
      : "설정 값을 다시 확인해 주세요.";

  if (!status.configured) {
    return {
      title: "필수 설정이 필요합니다.",
      description,
      tone: "warning",
    };
  }

  return {
    title: "실행 전 확인이 필요합니다.",
    description,
    tone: "warning",
  };
};
