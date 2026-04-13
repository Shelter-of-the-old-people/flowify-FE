import { Spinner, Text, VStack } from "@chakra-ui/react";

export const TemplateListLoadingState = () => (
  <VStack py={16} gap={4} color="text.secondary">
    <Spinner size="lg" />
    <Text>템플릿 목록을 불러오는 중입니다.</Text>
  </VStack>
);
