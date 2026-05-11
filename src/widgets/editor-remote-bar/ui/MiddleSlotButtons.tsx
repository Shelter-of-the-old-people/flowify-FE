import { type ElementType } from "react";
import {
  MdAutoFixHigh,
  MdDeleteOutline,
  MdHistory,
  MdUndo,
  MdZoomOutMap,
} from "react-icons/md";

import {
  Box,
  Button,
  type ButtonProps,
  Icon,
  Spinner,
  Text,
} from "@chakra-ui/react";

type MiddleSlotButtonsProps = {
  isDeletePending: boolean;
  isRollbackPending: boolean;
  canDelete: boolean;
  canRollback: boolean;
  onDelete: () => void;
  onRollback: () => void;
};

type SlotButtonProps = {
  label: string;
  disabled: boolean;
  icon: ElementType;
  loading?: boolean;
  tone?: "default" | "danger";
  display?: ButtonProps["display"];
  title?: string;
  onClick?: () => void;
};

const SlotButton = ({
  label,
  disabled,
  icon,
  loading = false,
  tone = "default",
  display,
  title,
  onClick,
}: SlotButtonProps) => {
  const isDanger = tone === "danger";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      display={display}
      title={title}
      height="32px"
      minW="32px"
      px={{ base: 2, xl: 3 }}
      py={1}
      bg="bg.surface"
      color={isDanger ? "status.error" : "text.primary"}
      border="1px solid"
      borderColor="border.default"
      borderRadius="lg"
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="medium"
      fontSize="sm"
      lineHeight="normal"
      gap={1.5}
      _hover={{ bg: isDanger ? "error.50" : "bg.overlay" }}
      _active={{ bg: isDanger ? "error.50" : "neutral.200" }}
      _disabled={{
        opacity: 0.45,
        cursor: "not-allowed",
        _hover: { bg: "bg.surface" },
      }}
    >
      {loading ? (
        <Spinner size="xs" color="currentColor" />
      ) : (
        <Icon as={icon} boxSize={4} />
      )}
      <Text as="span" display={{ base: "none", xl: "inline" }}>
        {label}
      </Text>
    </Button>
  );
};

export const MiddleSlotButtons = ({
  isDeletePending,
  isRollbackPending,
  canDelete,
  canRollback,
  onDelete,
  onRollback,
}: MiddleSlotButtonsProps) => (
  <Box
    display="flex"
    flex="1 1 auto"
    minW={0}
    gap={{ base: 1.5, xl: 2 }}
    alignItems="center"
    justifyContent="center"
    overflow="clip"
  >
    <SlotButton
      label="삭제"
      disabled={!canDelete}
      icon={MdDeleteOutline}
      loading={isDeletePending}
      tone="danger"
      title={canDelete ? "워크플로우 삭제" : "실행 중에는 삭제할 수 없습니다"}
      onClick={onDelete}
    />
    <SlotButton
      label="롤백"
      disabled={!canRollback}
      icon={MdUndo}
      loading={isRollbackPending}
      title={
        canRollback
          ? "마지막 실패 실행에서 롤백"
          : "롤백 가능한 실행이 없습니다"
      }
      onClick={onRollback}
    />
    <SlotButton
      label="자동정렬"
      disabled
      icon={MdAutoFixHigh}
      display={{ base: "none", "2xl": "inline-flex" }}
      title="추후 지원 예정"
    />
    <SlotButton
      label="줌리셋"
      disabled
      icon={MdZoomOutMap}
      display={{ base: "none", "2xl": "inline-flex" }}
      title="추후 지원 예정"
    />
    <SlotButton
      label="히스토리"
      disabled
      icon={MdHistory}
      display={{ base: "none", "2xl": "inline-flex" }}
      title="추후 지원 예정"
    />
  </Box>
);
