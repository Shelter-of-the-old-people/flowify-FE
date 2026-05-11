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
}: TriggerControlButtonProps) => {
  const label = getTriggerButtonLabel(summary, active);

  return (
    <Button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      height="34px"
      minW="34px"
      maxW={{ base: "150px", lg: "200px", xl: "240px" }}
      px={{ base: 2, xl: 3 }}
      bg="bg.surface"
      color="text.primary"
      border="1px solid"
      borderColor="border.default"
      borderRadius="lg"
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="medium"
      fontSize="xs"
      lineHeight="normal"
      whiteSpace="nowrap"
      gap={1.5}
      flexShrink={0}
      _hover={{
        bg: "bg.overlay",
        borderColor: "border.strong",
      }}
      _active={{ bg: "neutral.200" }}
    >
      {active ? <Icon as={MdSchedule} boxSize={4} flexShrink={0} /> : null}
      <Text as="span" minW={0} overflow="hidden" textOverflow="ellipsis">
        {label}
      </Text>
      <Icon as={MdKeyboardArrowDown} boxSize={4} flexShrink={0} />
    </Button>
  );
};
