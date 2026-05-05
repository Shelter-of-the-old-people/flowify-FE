import { Box, Text } from "@chakra-ui/react";

type Props = {
  title?: string;
  data: unknown;
};

const getRecordEntries = (data: unknown) =>
  data && typeof data === "object" && !Array.isArray(data)
    ? Object.entries(data as Record<string, unknown>)
    : [];

const formatPreviewData = (data: unknown) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const getPreviewSummary = (data: unknown) => {
  if (typeof data === "string") {
    return {
      title: "텍스트 데이터",
      description: data,
    };
  }

  if (Array.isArray(data)) {
    return {
      title: `${data.length}개 항목`,
      description: "목록 형태의 데이터입니다.",
    };
  }

  const entries = getRecordEntries(data);
  if (entries.length > 0) {
    return {
      title: "데이터 묶음",
      description: `${entries.length}개 항목으로 구성된 데이터입니다.`,
    };
  }

  return {
    title: "데이터",
    description: "표시할 수 있는 데이터가 있습니다.",
  };
};

export const DataPreviewBlock = ({
  title = "데이터 미리보기",
  data,
}: Props) => {
  const previewSummary = getPreviewSummary(data);
  const previewText = formatPreviewData(data);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Text fontSize="md" fontWeight="bold">
        {title}
      </Text>

      <Box
        px={4}
        py={3}
        borderRadius="xl"
        bg="gray.50"
        border="1px solid"
        borderColor="gray.100"
      >
        <Text fontSize="sm" fontWeight="semibold">
          {previewSummary.title}
        </Text>
        <Text color="text.secondary" fontSize="sm" mt={1} whiteSpace="pre-wrap">
          {previewSummary.description}
        </Text>
      </Box>

      <Box as="details" color="text.secondary" fontSize="xs">
        <Box as="summary" cursor="pointer" px={1} py={1}>
          상세 데이터 보기
        </Box>
        <Box
          as="pre"
          maxH="260px"
          overflow="auto"
          px={4}
          py={3}
          borderRadius="xl"
          bg="gray.50"
          border="1px solid"
          borderColor="gray.100"
          color="gray.700"
          lineHeight="1.6"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          {previewText}
        </Box>
      </Box>
    </Box>
  );
};
