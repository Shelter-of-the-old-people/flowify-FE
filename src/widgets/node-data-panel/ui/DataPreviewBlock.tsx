import { Box, Text } from "@chakra-ui/react";

type Props = {
  title?: string;
  data: unknown;
};

const formatPreviewData = (data: unknown) => {
  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

export const DataPreviewBlock = ({
  title = "데이터 미리보기",
  data,
}: Props) => {
  const previewText = formatPreviewData(data);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Text fontSize="md" fontWeight="bold">
        {title}
      </Text>
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
        fontSize="xs"
        lineHeight="1.6"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {previewText}
      </Box>
    </Box>
  );
};
