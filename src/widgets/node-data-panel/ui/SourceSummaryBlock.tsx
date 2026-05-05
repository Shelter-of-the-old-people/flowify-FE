import { Box, Text } from "@chakra-ui/react";

import { type SourceConfigSummaryResponse } from "@/entities";

import { getSourceSummaryDescription, getSourceSummaryRows } from "../model";

type Props = {
  config: Record<string, unknown> | null;
  source: SourceConfigSummaryResponse | null;
};

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
  const rows = getSourceSummaryRows({ config, source });
  const description = getSourceSummaryDescription({ config, source });

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
          {description}
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
