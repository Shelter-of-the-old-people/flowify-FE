import { Button, Text, VStack } from "@chakra-ui/react";

type Props = {
  onReload: () => void;
};

export const TemplateListErrorState = ({ onReload }: Props) => (
  <VStack py={16} gap={4} color="text.secondary">
    <Text>템플릿 목록을 불러오지 못했습니다.</Text>
    <Button variant="outline" onClick={onReload}>
      다시 시도
    </Button>
  </VStack>
);
