import { Box, Text } from "@chakra-ui/react";

import { type SchemaPreviewResponse } from "@/entities";

type Props = {
  title?: string;
  schema: SchemaPreviewResponse | null;
};

const getSchemaTitle = (schema: SchemaPreviewResponse | null) => {
  if (!schema || schema.schema_type === "UNKNOWN") {
    return "스키마 미정";
  }

  return schema.schema_type;
};

export const SchemaPreviewBlock = ({
  title = "예상 데이터 구조",
  schema,
}: Props) => {
  const fields = schema?.fields ?? [];

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="md" fontWeight="bold">
          {title}
        </Text>
        <Text mt={1} fontSize="sm" color="text.secondary">
          {getSchemaTitle(schema)}
          {schema?.is_list ? " · 목록" : ""}
        </Text>
      </Box>

      {fields.length > 0 ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {fields.map((field) => (
            <Box
              key={field.key}
              display="flex"
              justifyContent="space-between"
              gap={3}
              px={4}
              py={3}
              borderRadius="xl"
              bg="gray.50"
            >
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="semibold">
                  {field.label || field.key}
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  {field.key}
                </Text>
              </Box>
              <Text flexShrink={0} fontSize="xs" color="text.secondary">
                {field.value_type}
                {field.required ? " · 필수" : ""}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box px={4} py={3} borderRadius="xl" bg="gray.50">
          <Text fontSize="sm" color="text.secondary">
            표시할 필드 정보가 없습니다.
          </Text>
        </Box>
      )}
    </Box>
  );
};
