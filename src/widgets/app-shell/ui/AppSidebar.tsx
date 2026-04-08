import { Button, Flex, Text } from "@chakra-ui/react";

type AppSidebarProps = {
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

export const AppSidebar = ({
  isExpanded,
  onToggleExpanded,
}: AppSidebarProps) => {
  return (
    <Flex
      as="aside"
      direction="column"
      justify="space-between"
      h="100%"
      w={isExpanded ? "176px" : "40px"}
      px="6px"
      py="24px"
      borderRight="1px solid"
      borderColor="gray.300"
      bg="white"
      transition="width 220ms ease"
      overflow="hidden"
      flexShrink={0}
    >
      <Flex direction="column" gap="12px">
        <Button
          variant="ghost"
          size="sm"
          minW="28px"
          h="28px"
          px="0"
          onClick={onToggleExpanded}
        >
          {isExpanded ? "접기" : "펼침"}
        </Button>
      </Flex>

      <Flex direction="column" gap="4px">
        <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
          사용자 영역
        </Text>
      </Flex>
    </Flex>
  );
};
