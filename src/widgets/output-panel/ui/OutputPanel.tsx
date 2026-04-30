import { useMemo } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, Spinner, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type ChoiceOption,
  type ChoiceResponse,
} from "@/entities/workflow";
import { OUTPUT_DATA_LABELS } from "@/features/choice-panel";
import { PanelRenderer } from "@/features/configure-node";
import {
  isMiddleWizardCompleted,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { useDualPanelLayout } from "@/shared";

import {
  ActionStep,
  FollowUpStep,
  ProcessingMethodStep,
} from "./WizardStepContent";

type WizardStep = "processing-method" | "action" | "follow-up";

type WizardChoiceOption = ChoiceOption & {
  description?: string;
  followUp?: ChoiceFollowUp | null;
  branchConfig?: ChoiceBranchConfig | null;
};

type WizardChoiceResponse = {
  question: string;
  options: WizardChoiceOption[];
  requiresProcessingMethod: boolean;
  multiSelect?: boolean | null;
};

type OutputPanelWizardController = {
  isWizardMode: boolean;
  wizardStep: WizardStep | null;
  initialChoiceResponse: WizardChoiceResponse | null;
  activeActionChoiceResponse: WizardChoiceResponse | null;
  selectedProcessingOption: WizardChoiceOption | null;
  selectedFollowUp: ChoiceFollowUp | null;
  selectedBranchConfig: ChoiceBranchConfig | null;
  wizardError: string | null;
  isWorkflowBusy: boolean;
  isChoiceStepLoading: boolean;
  isChoiceStepUnavailable: boolean;
  isUsingChoiceFallback: boolean;
  isChoicesError: boolean;
  serverChoiceResponse: ChoiceResponse | null | undefined;
  selectProcessingMethod: (option: WizardChoiceOption) => Promise<void>;
  selectAction: (action: WizardChoiceOption) => Promise<void>;
  backToProcessingMethod: () => Promise<void>;
  backToAction: () => void;
  completeFollowUp: (
    selections: Record<string, string | string[]>,
  ) => Promise<void>;
  reset: () => void;
};

type Props = {
  wizardController: OutputPanelWizardController;
};

const PANEL_TRANSITION_MS = 240;

const ChoiceStepStatus = ({
  message,
  showSpinner = false,
  tone = "muted",
}: {
  message: string;
  showSpinner?: boolean;
  tone?: "muted" | "error";
}) => (
  <Box
    display="flex"
    alignItems="center"
    gap={2}
    p={4}
    borderRadius="xl"
    bg={tone === "error" ? "red.50" : "gray.50"}
    border="1px solid"
    borderColor={tone === "error" ? "red.100" : "gray.200"}
  >
    {showSpinner ? <Spinner size="sm" color="gray.500" /> : null}
    <Text fontSize="sm" color={tone === "error" ? "red.500" : "gray.500"}>
      {message}
    </Text>
  </Box>
);

export const OutputPanel = ({ wizardController }: Props) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const layout = useDualPanelLayout();
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activePanelNodeId) ?? null,
    [activePanelNodeId, nodes],
  );

  const isDetailMode = isMiddleWizardCompleted(activeNode);
  const activeMeta = activeNode ? NODE_REGISTRY[activeNode.data.type] : null;
  const outputDataLabel =
    activeNode?.data.outputTypes[0] !== undefined
      ? OUTPUT_DATA_LABELS[activeNode.data.outputTypes[0]]
      : "출력 데이터";

  const closedTransform =
    layout.mode === "stacked"
      ? `translate3d(0, ${layout.canvasHeight - layout.outputPanelTop + 24}px, 0)`
      : `translate3d(${layout.canvasWidth - layout.outputPanelLeft + 24}px, 0, 0)`;
  const transition = isOpen
    ? `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear 0ms`
    : `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear ${PANEL_TRANSITION_MS}ms`;

  const handleClose = () => {
    wizardController.reset();
    closePanel();
  };
  const shouldShowChoiceStepLoading =
    canEditNodes && wizardController.isChoiceStepLoading;
  const shouldShowChoiceStepUnavailable =
    canEditNodes && wizardController.isChoiceStepUnavailable;
  const canShowWizardStepContent =
    canEditNodes &&
    !shouldShowChoiceStepLoading &&
    !shouldShowChoiceStepUnavailable;

  return (
    <Box
      position="absolute"
      top={`${layout.outputPanelTop}px`}
      left={`${layout.outputPanelLeft}px`}
      width={`${layout.panelWidth}px`}
      height={`${layout.panelHeight}px`}
      bg="white"
      border="1px solid"
      borderColor="#f2f2f2"
      borderRadius="20px"
      boxShadow="0 4px 4px rgba(0,0,0,0.25)"
      overflowY="auto"
      px={3}
      py={6}
      zIndex={5}
      transform={isOpen ? "translate3d(0, 0, 0)" : closedTransform}
      transition={transition}
      opacity={isOpen ? 1 : 0}
      visibility={isOpen ? "visible" : "hidden"}
      pointerEvents={isOpen ? "auto" : "none"}
      willChange="transform, opacity"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      {wizardController.isWizardMode ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
              설정
            </Text>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <Box flex={1} overflow="auto" p={3}>
            {!canEditNodes ? (
              <Box
                p={4}
                borderRadius="xl"
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="text.secondary">
                  공유된 워크플로우는 읽기 전용입니다. 노드 설정은 소유자만
                  변경할 수 있습니다.
                </Text>
              </Box>
            ) : null}

            {shouldShowChoiceStepLoading ? (
              <ChoiceStepStatus
                message="선택지를 불러오는 중입니다."
                showSpinner
              />
            ) : null}

            {shouldShowChoiceStepUnavailable ? (
              <ChoiceStepStatus
                message="선택지를 불러오지 못했습니다."
                tone="error"
              />
            ) : null}

            {canShowWizardStepContent &&
            wizardController.wizardStep === "processing-method" &&
            wizardController.initialChoiceResponse ? (
              <ProcessingMethodStep
                question={wizardController.initialChoiceResponse.question}
                options={wizardController.initialChoiceResponse.options}
                onSelect={(option) =>
                  void wizardController.selectProcessingMethod(option)
                }
              />
            ) : null}

            {canShowWizardStepContent &&
            wizardController.wizardStep === "action" &&
            wizardController.activeActionChoiceResponse ? (
              <ActionStep
                question={wizardController.activeActionChoiceResponse.question}
                actions={wizardController.activeActionChoiceResponse.options}
                onSelect={(action) =>
                  void wizardController.selectAction(action)
                }
                onBack={
                  wizardController.selectedProcessingOption
                    ? () => void wizardController.backToProcessingMethod()
                    : undefined
                }
              />
            ) : null}

            {canShowWizardStepContent &&
            wizardController.wizardStep === "follow-up" ? (
              <FollowUpStep
                followUp={wizardController.selectedFollowUp}
                branchConfig={wizardController.selectedBranchConfig}
                onComplete={(selections) =>
                  void wizardController.completeFollowUp(selections)
                }
                onBack={() => void wizardController.backToAction()}
              />
            ) : null}
          </Box>

          {wizardController.isWorkflowBusy &&
          !wizardController.isChoiceStepLoading ? (
            <Box display="flex" alignItems="center" gap={2} px={6}>
              <Spinner size="sm" color="gray.500" />
              <Text fontSize="sm" color="gray.500">
                선택 내용을 반영하는 중입니다.
              </Text>
            </Box>
          ) : null}

          {wizardController.isUsingChoiceFallback ? (
            <Text px={6} fontSize="sm" color="orange.500">
              서버 선택지를 가져오지 못해 로컬 규칙으로 이어갑니다.
            </Text>
          ) : null}

          {wizardController.wizardError ? (
            <Text px={6} fontSize="sm" color="red.500">
              {wizardController.wizardError}
            </Text>
          ) : null}
        </>
      ) : isDetailMode && activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              <Icon
                as={activeMeta.iconComponent}
                boxSize={6}
                color={activeMeta.color}
              />
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                출력 데이터
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack align="stretch" flex={1} overflow="auto" p={3} gap={6}>
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                {outputDataLabel}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                처리된 데이터 미리보기는 백엔드 실행 연동 뒤에 자연스럽게 보여줄
                예정입니다.
              </Text>
            </Box>
          </VStack>
        </>
      ) : (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
              설정
            </Text>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <Box flex={1} overflow="auto">
            <PanelRenderer readOnly={!canEditNodes} />
          </Box>
        </>
      )}
    </Box>
  );
};
