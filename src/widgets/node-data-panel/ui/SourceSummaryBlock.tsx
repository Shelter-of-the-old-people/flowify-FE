import { Box, Text } from "@chakra-ui/react";

import { type SourceConfigSummaryResponse } from "@/entities";

type Props = {
  config: Record<string, unknown> | null;
  source: SourceConfigSummaryResponse | null;
};

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <Box bg="gray.50" borderRadius="xl" px={4} py={3}>
    <Text color="text.secondary" fontSize="xs">
      {label}
    </Text>
    <Text fontSize="sm" fontWeight="semibold" mt={1}>
      {value}
    </Text>
  </Box>
);

export const SourceSummaryBlock = ({ config, source }: Props) => {
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
    source?.canonicalInputType ?? getStringValue(config?.canonical_input_type);
  const triggerKind =
    source?.triggerKind ?? getStringValue(config?.trigger_kind);
  const rows = [
    serviceLabel ? { label: "서비스", value: serviceLabel } : null,
    modeLabel ? { label: "가져오는 방식", value: modeLabel } : null,
    targetLabel ? { label: "선택한 대상", value: targetLabel } : null,
    canonicalInputType
      ? { label: "입력 데이터 타입", value: canonicalInputType }
      : null,
    triggerKind ? { label: "트리거", value: triggerKind } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="md" fontWeight="bold">
          가져오는 데이터
        </Text>
        <Text color="text.secondary" fontSize="sm" mt={1}>
          시작 노드 설정을 기준으로 예상되는 입력 출처입니다.
        </Text>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {rows.map((row) => (
          <SummaryRow key={row.label} label={row.label} value={row.value} />
        ))}
      </Box>
    </Box>
  );
};
