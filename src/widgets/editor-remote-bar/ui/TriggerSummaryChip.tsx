import { MdKeyboardArrowDown, MdSchedule } from "react-icons/md";

import { Button, Icon, Text } from "@chakra-ui/react";

type TriggerSummaryChipProps = {
  summary: string;
  onClick: () => void;
};

export const TriggerSummaryChip = ({
  summary,
  onClick,
}: TriggerSummaryChipProps) => (
  <Button
    type="button"
    onClick={onClick}
    height="32px"
    minW="32px"
    maxW={{ base: "140px", lg: "180px", xl: "220px" }}
    px={{ base: 2, xl: 3 }}
    py={1}
    bg="bg.surface"
    color="text.primary"
    border="1px solid"
    borderColor="border.default"
    borderRadius="full"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="medium"
    fontSize="xs"
    lineHeight="normal"
    whiteSpace="nowrap"
    gap={1.5}
    _hover={{ bg: "bg.overlay" }}
    _active={{ bg: "neutral.200" }}
  >
    <Icon as={MdSchedule} boxSize={4} flexShrink={0} />
    <Text as="span" minW={0} overflow="hidden" textOverflow="ellipsis">
      {summary}
    </Text>
    <Icon as={MdKeyboardArrowDown} boxSize={4} flexShrink={0} />
  </Button>
);
