import { Box, Text } from "@chakra-ui/react";

import {
  type SchemaPreviewResponse,
  getSchemaTypeLabel,
  getSchemaValueTypeLabel,
} from "@/entities";

type Props = {
  title?: string;
  schema: SchemaPreviewResponse | null;
};

const getSchemaTitle = (schema: SchemaPreviewResponse | null) => {
  if (!schema) {
    return "데이터 구조 미정";
  }

  const schemaTitle = getSchemaTypeLabel(schema.schema_type) ?? "데이터 구조";
  const listLabel = schema.is_list ? "목록" : null;

  return [schemaTitle, listLabel].filter(Boolean).join(" · ");
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
        </Text>
      </Box>

      {fields.length > 0 ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {fields.map((field) => {
            const valueTypeLabel = getSchemaValueTypeLabel(field.value_type);

            return (
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
                    {field.label || "항목"}
                  </Text>
                  {valueTypeLabel ? (
                    <Text fontSize="xs" color="text.secondary" mt={1}>
                      {valueTypeLabel}
                    </Text>
                  ) : null}
                </Box>
                {field.required ? (
                  <Text flexShrink={0} fontSize="xs" color="text.secondary">
                    필수
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box px={4} py={3} borderRadius="xl" bg="gray.50">
          <Text fontSize="sm" color="text.secondary">
            표시할 수 있는 항목 정보가 없습니다.
          </Text>
        </Box>
      )}
    </Box>
  );
};
