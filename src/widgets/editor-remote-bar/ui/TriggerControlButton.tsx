import { forwardRef } from "react";
import { MdSchedule } from "react-icons/md";

import { Button, Icon, Text } from "@chakra-ui/react";

type TriggerControlButtonProps = {
  summary: string;
  active: boolean;
  onClick: () => void;
};

export const TriggerControlButton = forwardRef<
  HTMLButtonElement,
  TriggerControlButtonProps
>(({ summary, active, onClick }, ref) => {
  const maxWidth = { base: "96px", xl: "180px", "2xl": "220px" };

  return (
    <Button
      ref={ref}
      type="button"
      aria-label={summary}
      title={summary}
      onClick={onClick}
      height="30px"
      minW="30px"
      maxW={maxWidth}
      px={{ base: 1.5, xl: 2.5 }}
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
      gap={1.25}
      flexShrink={0}
      _hover={{
        bg: "bg.overlay",
        borderColor: "border.strong",
      }}
      _active={{ bg: "neutral.200" }}
    >
      {active ? <Icon as={MdSchedule} boxSize={4} flexShrink={0} /> : null}
      <Text
        as="span"
        display="inline"
        minW={0}
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {summary}
      </Text>
    </Button>
  );
});

TriggerControlButton.displayName = "TriggerControlButton";
