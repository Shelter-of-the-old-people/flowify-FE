import { MdCheckCircle, MdSave } from "react-icons/md";

import { Button, Icon, Spinner, Text } from "@chakra-ui/react";

type SaveStateButtonProps = {
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
};

export const SaveStateButton = ({
  isDirty,
  isSaving,
  canSave,
  onSave,
}: SaveStateButtonProps) => {
  const isActionable = isDirty && canSave && !isSaving;
  const label = isSaving ? "저장 중..." : isDirty ? "저장" : "저장됨";
  const title = isSaving
    ? "워크플로우를 저장하는 중입니다"
    : isDirty
      ? "변경사항 저장"
      : "모든 변경사항이 저장되었습니다";

  return (
    <Button
      type="button"
      aria-label={label}
      title={title}
      onClick={onSave}
      disabled={!isActionable}
      height="34px"
      minW="34px"
      px={{ base: 2, xl: 3 }}
      bg="bg.surface"
      color={isDirty ? "text.primary" : "text.secondary"}
      border="1px solid"
      borderColor={isDirty ? "border.strong" : "border.default"}
      borderRadius="lg"
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="medium"
      fontSize="sm"
      lineHeight="normal"
      gap={1.5}
      flexShrink={0}
      _hover={{ bg: isActionable ? "bg.overlay" : "bg.surface" }}
      _active={{ bg: isActionable ? "neutral.200" : "bg.surface" }}
      _disabled={{
        opacity: isDirty ? 0.55 : 1,
        cursor: isDirty ? "not-allowed" : "default",
        _hover: { bg: "bg.surface" },
      }}
    >
      {isSaving ? (
        <Spinner size="xs" color="currentColor" />
      ) : (
        <Icon
          as={isDirty ? MdSave : MdCheckCircle}
          boxSize={4}
          color={isDirty ? "text.primary" : "status.success"}
        />
      )}
      <Text as="span" display={{ base: "none", sm: "inline" }}>
        {label}
      </Text>
    </Button>
  );
};
