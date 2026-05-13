import {
  MdCheckCircle,
  MdErrorOutline,
  MdLock,
  MdSchedule,
} from "react-icons/md";

import { Box, Icon, Spinner, Text } from "@chakra-ui/react";

import { type WorkflowSaveStatus } from "@/features/workflow-editor";

export type SaveStateIndicatorProps = {
  status: WorkflowSaveStatus;
  errorMessage: string | null;
  canSave: boolean;
};

const getSaveStateText = (
  status: WorkflowSaveStatus,
  canSave: boolean,
): { label: string; title: string } => {
  if (!canSave) {
    return {
      label: "읽기 전용",
      title: "이 워크플로우는 저장 권한이 없습니다.",
    };
  }

  switch (status) {
    case "scheduled":
      return {
        label: "저장 대기",
        title: "변경사항을 곧 자동으로 저장합니다.",
      };
    case "saving":
      return {
        label: "저장 중",
        title: "워크플로우를 자동 저장하는 중입니다.",
      };
    case "error":
      return {
        label: "저장 실패",
        title: "자동 저장에 실패했습니다.",
      };
    case "idle":
    case "saved":
      return {
        label: "저장됨",
        title: "모든 변경사항이 저장되었습니다.",
      };
  }
};

export const SaveStateIndicator = ({
  status,
  errorMessage,
  canSave,
}: SaveStateIndicatorProps) => {
  const { label, title } = getSaveStateText(status, canSave);
  const isError = canSave && status === "error";
  const iconColor = isError
    ? "status.error"
    : canSave && status === "saved"
      ? "status.success"
      : "text.secondary";

  return (
    <Box
      role="status"
      aria-label={label}
      title={errorMessage ?? title}
      display="inline-flex"
      alignItems="center"
      gap={1}
      color={isError ? "status.error" : "text.secondary"}
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="medium"
      fontSize="xs"
      lineHeight="normal"
      pointerEvents="none"
    >
      {canSave && status === "saving" ? (
        <Spinner size="xs" color="currentColor" />
      ) : (
        <Icon
          as={
            !canSave
              ? MdLock
              : status === "error"
                ? MdErrorOutline
                : status === "scheduled"
                  ? MdSchedule
                  : MdCheckCircle
          }
          boxSize={3.5}
          color={iconColor}
        />
      )}
      <Text as="span">{label}</Text>
    </Box>
  );
};
