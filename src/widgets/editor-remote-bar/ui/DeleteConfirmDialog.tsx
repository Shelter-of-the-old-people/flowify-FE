import { Button, Dialog, Portal, Text } from "@chakra-ui/react";

type DeleteConfirmDialogProps = {
  open: boolean;
  workflowName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * 워크플로우 삭제 확인 모달.
 *
 * 스펙 §4.5 / REQ-6:
 * - 삭제 버튼 클릭 시 확인 모달 노출
 * - 저장되지 않은 변경사항 유무와 상관없이 동일한 모달
 * - 확정 시 deleteWorkflow 호출 → 성공 시 목록 페이지 이동
 * - 실패 시 모달 닫고 에디터 유지 (에러 toast는 부모에서 처리)
 */
export const DeleteConfirmDialog = ({
  open,
  workflowName,
  isPending,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) => (
  <Dialog.Root
    open={open}
    onOpenChange={(details) => {
      if (!details.open && !isPending) {
        onCancel();
      }
    }}
    role="alertdialog"
    placement="center"
    motionPreset="scale"
  >
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          maxWidth="420px"
          bg="white"
          borderRadius="16px"
          fontFamily="'Pretendard Variable', sans-serif"
        >
          <Dialog.Header pb={2}>
            <Dialog.Title fontSize="16px" fontWeight="semibold">
              워크플로우를 삭제하시겠어요?
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={4}>
            <Text fontSize="14px" color="gray.600">
              <Text as="span" fontWeight="semibold" color="black">
                {workflowName || "새 워크플로우"}
              </Text>
              {
                " 워크플로우가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
              }
            </Text>
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              bg="#d94141"
              color="#efefef"
              _hover={{ bg: "#c13535" }}
              _active={{ bg: "#a62c2c" }}
              onClick={onConfirm}
              loading={isPending}
              loadingText="삭제 중…"
            >
              삭제
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);
