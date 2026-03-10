import { Link } from "react-router";

import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";

import { ROUTE_PATHS } from "@/shared";

export const Header = () => {
  return (
    <Box as="header" h="60px">
      <Flex
        h="full"
        w="full"
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="neutral.100"
        px={4}
        position="relative"
      >
        <Link to={ROUTE_PATHS.ROOT}>
          <Text>로고</Text>
        </Link>
        <HStack
          gap={10}
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          display={{ base: "none", md: "flex" }}
        >
          <Text color="neutral.600">서비스 소개</Text>
          <Text color="neutral.600">이용 가이드</Text>
        </HStack>
        <HStack>
          <Button bg="neutral.500" fontWeight="bold" rounded="xl">
            버튼
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};
