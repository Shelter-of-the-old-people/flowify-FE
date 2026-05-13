import { Box } from "@chakra-ui/react";

import {
  SaveStateIndicator,
  type SaveStateIndicatorProps,
} from "./SaveStateIndicator";
import { WorkflowNameField } from "./WorkflowNameField";
import { WorkflowToolMenuButton } from "./WorkflowToolMenuButton";

type Props = {
  isRunning: boolean;
  canSaveWorkflow: boolean;
  saveStatus: SaveStateIndicatorProps["status"];
  saveErrorMessage: SaveStateIndicatorProps["errorMessage"];
  canDelete: boolean;
  isDeletePending: boolean;
  onOpenMenu?: () => void;
  onDelete: () => void;
};

export const WorkflowHeaderControls = ({
  isRunning,
  canSaveWorkflow,
  saveStatus,
  saveErrorMessage,
  canDelete,
  isDeletePending,
  onOpenMenu,
  onDelete,
}: Props) => {
  const shouldShowMenu = canDelete || isDeletePending;

  return (
    <Box
      position="absolute"
      top={{ base: "16px", xl: "20px" }}
      left={{ base: "16px", xl: "20px" }}
      right={{ base: "16px", xl: "20px" }}
      pointerEvents="none"
      zIndex={4}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap={0.5}
        width="fit-content"
        maxW="full"
        px={{ base: 0.5, xl: 1 }}
        py={0}
        pointerEvents="auto"
        onWheel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={{ base: 1, xl: 1.5 }}
          maxW="full"
        >
          <WorkflowNameField
            disabled={isRunning || !canSaveWorkflow}
            disabledReason={
              canSaveWorkflow
                ? "실행 중에는 편집할 수 없습니다"
                : "공유된 워크플로우는 이름을 수정할 수 없습니다"
            }
          />

          {shouldShowMenu ? (
            <WorkflowToolMenuButton
              isDeletePending={isDeletePending}
              canDelete={canDelete}
              onOpenMenu={onOpenMenu}
              onDelete={onDelete}
            />
          ) : null}
        </Box>

        <Box pl={{ base: 0.5, xl: 1 }}>
          <SaveStateIndicator
            status={saveStatus}
            errorMessage={saveErrorMessage}
            canSave={canSaveWorkflow}
          />
        </Box>
      </Box>
    </Box>
  );
};
