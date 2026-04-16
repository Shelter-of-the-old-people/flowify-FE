import { Box, Button } from "@chakra-ui/react";

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
  loading?: boolean;
  title?: string;
  onClick?: () => void;
};

/**
 * Figma 1882:3344 기준 가운데 슬롯 공통 버튼 스타일.
 * 임시 텍스트 라벨. 디자이너 아이콘 확정 후 교체 예정.
 */
const SlotButton = ({
  label,
  disabled,
  loading = false,
  title,
  onClick,
}: SlotButtonProps) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    height="32px"
    minWidth="auto"
    px="8px"
    py="4px"
    bg="#272727"
    color="#efefef"
    borderRadius="10px"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="normal"
    fontSize="14px"
    lineHeight="normal"
    _hover={{ bg: "#3a3a3a" }}
    _active={{ bg: "#1f1f1f" }}
    _disabled={{
      opacity: 0.5,
      cursor: "not-allowed",
      _hover: { bg: "#272727" },
    }}
  >
    {loading ? "…" : label}
  </Button>
);

/**
 * 가운데 슬롯에 렌더되는 5개 임시 버튼.
 *
 * 순서(스펙 §3.5): 삭제 / 롤백 / 자동정렬 / 줌리셋 / 히스토리
 * - 삭제, 롤백: 실제 동작 연결됨. 부모에서 조건 전달.
 * - 자동정렬, 줌리셋, 히스토리: 현 단계에서 기능 미구현 → disabled 고정.
 */
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
    flex="1 0 0"
    minW={0}
    gap="10px"
    alignItems="center"
    justifyContent="center"
    overflow="clip"
  >
    <SlotButton
      label="삭제"
      disabled={!canDelete}
      loading={isDeletePending}
      title={canDelete ? "워크플로우 삭제" : "실행 중에는 삭제할 수 없습니다"}
      onClick={onDelete}
    />
    <SlotButton
      label="롤백"
      disabled={!canRollback}
      loading={isRollbackPending}
      title={
        canRollback
          ? "마지막 실패 실행에서 롤백"
          : "롤백 가능한 실행이 없습니다"
      }
      onClick={onRollback}
    />
    <SlotButton label="자동정렬" disabled title="추후 지원 예정" />
    <SlotButton label="줌리셋" disabled title="추후 지원 예정" />
    <SlotButton label="히스토리" disabled title="추후 지원 예정" />
  </Box>
);
