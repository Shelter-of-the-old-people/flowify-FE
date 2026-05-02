import { useRef, useState } from "react";

import { Input, Text } from "@chakra-ui/react";

import {
  useSaveWorkflowMutation,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { toaster } from "@/shared/utils/toaster/toaster";

type WorkflowNameFieldProps = {
  disabled?: boolean;
  disabledReason?: string;
};

export const WorkflowNameField = ({
  disabled = false,
  disabledReason = "���� �߿��� ���� ������ �� �����ϴ�",
}: WorkflowNameFieldProps) => {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isConfirmingRef = useRef(false);
  const { mutateAsync: saveWorkflow, isPending: isSavePending } =
    useSaveWorkflowMutation();
  const displayName = workflowName || "�� ��ũ�÷ο�";
  const isInteractionDisabled = disabled || isSavePending;

  const handleStartEdit = () => {
    if (isInteractionDisabled) {
      return;
    }

    setInputValue(workflowName);
    setIsEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = async () => {
    if (isConfirmingRef.current) {
      return;
    }

    isConfirmingRef.current = true;

    const trimmed = inputValue.trim();

    try {
      setIsEditing(false);

      if (!trimmed || trimmed === workflowName) {
        return;
      }

      const currentState = useWorkflowStore.getState();
      setWorkflowName(trimmed);

      if (!workflowId) {
        return;
      }

      await saveWorkflow({
        workflowId,
        store: {
          workflowName: trimmed,
          nodes: currentState.nodes,
          edges: currentState.edges,
          startNodeId: currentState.startNodeId,
          endNodeId: currentState.endNodeId,
        },
      });
    } catch {
      toaster.create({
        title: "���� ����",
        description: "��ũ�÷ο� �̸��� �ٷ� �������� ���߽��ϴ�. �ٽ� �õ����ּ���.",
        type: "error",
      });
    } finally {
      isConfirmingRef.current = false;
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleConfirm();
    }

    if (event.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={() => void handleConfirm()}
        onKeyDown={handleKeyDown}
        disabled={isSavePending}
        size="sm"
        width="200px"
        height="24px"
        px={2}
        py={0}
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="normal"
        fontSize="14px"
        color="black"
        bg="white"
        border="1px solid"
        borderColor="#d4d4d4"
        borderRadius="6px"
        _focus={{ borderColor: "#272727", boxShadow: "none" }}
      />
    );
  }

  return (
    <Text
      as="p"
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="normal"
      fontSize="14px"
      color="black"
      whiteSpace="nowrap"
      cursor={isInteractionDisabled ? "default" : "pointer"}
      opacity={isInteractionDisabled ? 0.6 : 1}
      onClick={handleStartEdit}
      title={isInteractionDisabled ? disabledReason : "Ŭ���Ͽ� �̸� ����"}
    >
      {displayName}
    </Text>
  );
};
