import { MdKeyboardArrowDown, MdSchedule } from "react-icons/md";

import { Button, Icon, Text } from "@chakra-ui/react";

type TriggerControlButtonProps = {
  summary: string;
  active: boolean;
  onClick: () => void;
};

const getTriggerButtonLabel = (summary: string, active: boolean) =>
  active ? summary : "자동 실행 꺼짐";

export const TriggerControlButton = ({
  summary,
  active,
  onClick,
}: TriggerControlButtonProps) => (
  <Button
    type="button"
    onClick={onClick}
    height="32px"
    minW="32px"
    maxW={{ base: "160px", lg: "200px", xl: "240px" }}
    px={{ base: 2, xl: 3 }}
    py={1}
    bg={active ? "primary.subtle" : "bg.surface"}
    color="text.primary"
    border="1px solid"
    borderColor={active ? "border.selected" : "border.default"}
    borderRadius="lg"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="medium"
    fontSize="xs"
    lineHeight="normal"
    whiteSpace="nowrap"
    gap={1.5}
    _hover={{
      bg: active ? "primary.subtle" : "bg.overlay",
      borderColor: active ? "border.selected" : "border.strong",
    }}
    _active={{ bg: active ? "primary.subtle" : "neutral.200" }}
  >
    <Icon as={MdSchedule} boxSize={4} flexShrink={0} />
    <Text as="span" minW={0} overflow="hidden" textOverflow="ellipsis">
      {getTriggerButtonLabel(summary, active)}
    </Text>
    <Icon as={MdKeyboardArrowDown} boxSize={4} flexShrink={0} />
  </Button>
);
