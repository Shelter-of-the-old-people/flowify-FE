import { Button } from "@chakra-ui/react";

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
    minWidth="auto"
    px="12px"
    py="4px"
    bg="#fefefe"
    color="#272727"
    border="1px solid #d8d8d8"
    borderRadius="999px"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="medium"
    fontSize="13px"
    lineHeight="normal"
    whiteSpace="nowrap"
    _hover={{ bg: "#f7f7f7" }}
    _active={{ bg: "#efefef" }}
  >
    {summary}
  </Button>
);
