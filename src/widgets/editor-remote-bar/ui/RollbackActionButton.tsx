import { MdUndo } from "react-icons/md";

import { Button, Icon, Spinner } from "@chakra-ui/react";

type RollbackActionButtonProps = {
  isPending: boolean;
  onClick: () => void;
};

export const RollbackActionButton = ({
  isPending,
  onClick,
}: RollbackActionButtonProps) => (
  <Button
    type="button"
    aria-label="마지막 실패 실행 롤백"
    title="마지막 실패 실행 롤백"
    onClick={onClick}
    disabled={isPending}
    height="34px"
    minW="34px"
    px={0}
    bg="bg.surface"
    color="text.primary"
    border="1px solid"
    borderColor="border.default"
    borderRadius="lg"
    flexShrink={0}
    _hover={{ bg: "bg.overlay", borderColor: "border.strong" }}
    _active={{ bg: "neutral.200" }}
    _disabled={{
      opacity: 0.5,
      cursor: "not-allowed",
      _hover: { bg: "bg.surface", borderColor: "border.default" },
    }}
  >
    {isPending ? (
      <Spinner size="xs" color="currentColor" />
    ) : (
      <Icon as={MdUndo} boxSize={4} />
    )}
  </Button>
);
