import { useMemo } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Button, Icon, Spinner, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import { isEndWorkflowNode } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type ChoiceOption,
  type ChoiceResponse,
  toBackendDataType,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
} from "@/entities/workflow";
import {
  getFileTypeBranchPathStates,
  isFileTypeBranchAction,
} from "@/features/choice-panel";
import { PanelRenderer, SourceNodePanel } from "@/features/configure-node";
import {
  isMiddleWizardCompleted,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { ServiceIcon, useDualPanelLayout } from "@/shared";
import {
  DataPreviewBlock,
  DataStateNotice,
  NodeExecutionStatusBlock,
  SchemaPreviewBlock,
  isEmptyPanelData,
  useNodeDataPanelModel,
} from "@/widgets/node-data-panel";

import {
  BranchSetupSummaryBlock,
  FallbackNodeSummaryBlock,
  ProcessingMethodSummaryBlock,
  SinkSetupSummaryBlock,
  SourceSetupSummaryBlock,
} from "./NodeSetupSummaryBlocks";
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
  initialFollowUpSelections: Record<string, string | string[]> | null;
  isExistingChoiceEditMode: boolean;
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
  backFromFollowUp: () => Promise<void>;
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
  const edges = useWorkflowStore((state) => state.edges);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const activePanelMode = useWorkflowStore((state) => state.activePanelMode);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeIds = useWorkflowStore((state) => state.endNodeIds);
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const canViewExecutionData = useWorkflowStore(
    (state) => state.editorCapabilities.canRunWorkflow,
  );
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const setActivePanelMode = useWorkflowStore(
    (state) => state.setActivePanelMode,
  );
  const layout = useDualPanelLayout();
  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activePanelNodeId) ?? null,
    [activePanelNodeId, nodes],
  );
  const isStartNode = Boolean(activeNode && activeNode.id === startNodeId);
  const isEndNode = isEndWorkflowNode(activeNode, startNodeId, endNodeIds);
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;

  const activeNodeStatus = activePanelNodeId
    ? (nodeStatuses[activePanelNodeId] ?? null)
    : null;
  const hasConfigIssue = Boolean(
    activeNodeStatus &&
    (!activeNodeStatus.configured ||
      !activeNodeStatus.executable ||
      (activeNodeStatus.missingFields?.length ?? 0) > 0),
  );
  const isEditMode = activePanelMode === "edit" && canEditNodes;
  const isMiddleNode = Boolean(activeNode && !isStartNode && !isEndNode);
  const activeNodeConfig = activeNode?.data.config as unknown as Record<
    string,
    unknown
  > | null;
  const choiceNodeType =
    typeof activeNodeConfig?.choiceNodeType === "string"
      ? activeNodeConfig.choiceNodeType
      : null;
  const choiceActionId =
    typeof activeNodeConfig?.choiceActionId === "string"
      ? activeNodeConfig.choiceActionId
      : null;
  const hasChoiceAction =
    choiceActionId !== null && choiceActionId.trim().length > 0;
  const isFileTypeBranchNode =
    isMiddleNode && isFileTypeBranchAction(choiceActionId);
  const branchPathStates = useMemo(
    () =>
      activeNode && isFileTypeBranchNode
        ? getFileTypeBranchPathStates({
            branchNode: activeNode,
            nodes,
            edges,
          })
        : [],
    [activeNode, edges, isFileTypeBranchNode, nodes],
  );
  const isProcessingMethodOnlyNode =
    isMiddleNode && Boolean(choiceNodeType) && !hasChoiceAction;
  const isStartEditMode = isEditMode && isStartNode;
  const isStartViewMode = !isEditMode && isStartNode;
  const isEndEditMode = isEditMode && isEndNode;
  const isEndViewMode = !isEditMode && isEndNode;
  const isMiddleEditMode =
    isEditMode && isMiddleNode && !isProcessingMethodOnlyNode;
  const isBranchViewMode =
    !isEditMode && isFileTypeBranchNode && isMiddleWizardCompleted(activeNode);
  const isDetailMode =
    !isEditMode &&
    isMiddleNode &&
    !isBranchViewMode &&
    isMiddleWizardCompleted(activeNode);
  const shouldLoadOutputData =
    isStartNode || isDetailMode || isProcessingMethodOnlyNode;
  const nodeDataPanel = useNodeDataPanelModel({
    panelKind: "output",
    workflowId: workflowId || undefined,
    nodeId: shouldLoadOutputData ? activePanelNodeId : null,
    canViewExecutionData,
    isWorkflowDirty: isDirty,
  });
  const activeMeta = activeNode ? NODE_REGISTRY[activeNode.data.type] : null;
  const outputDataLabel = nodeDataPanel.staticOutputLabel ?? "출력 데이터";
  const sourceOutputLabel =
    nodeDataPanel.schemaPreview?.output?.label ??
    nodeDataPanel.staticOutputLabel ??
    null;
  const serviceKey =
    typeof activeNodeConfig?.service === "string"
      ? activeNodeConfig.service
      : null;
  const sourceMode =
    typeof activeNodeConfig?.source_mode === "string"
      ? activeNodeConfig.source_mode
      : null;
  const renderActiveNodeIcon = () => {
    if (!activeMeta) {
      return null;
    }

    return (
      <ServiceIcon
        color={activeMeta.color}
        fallbackIcon={activeMeta.iconComponent}
        serviceKey={serviceKey}
        size={24}
        sourceMode={sourceMode}
      />
    );
  };
  const sinkInputType = activeNode?.data.inputTypes[0]
    ? toBackendDataType(activeNode.data.inputTypes[0])
    : null;
  const { data: sinkCatalog } = useSinkCatalogQuery();
  const selectedSinkService =
    sinkCatalog?.services.find((service) => service.key === serviceKey) ?? null;
  const { data: sinkSchema } = useSinkSchemaQuery(serviceKey, sinkInputType);
  const sinkInputLabel =
    nodeDataPanel.schemaPreview?.input?.label ??
    (sinkInputType ? outputDataLabel : null);
  const hasPreviewData = !isEmptyPanelData(nodeDataPanel.dataToDisplay);
  const shouldShowSchemaPreview =
    nodeDataPanel.state !== "data-ready" &&
    nodeDataPanel.schemaToDisplay !== null &&
    !nodeDataPanel.isSchemaPreviewLoading;

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
  const shouldShowChoiceFallbackNotice =
    wizardController.isUsingChoiceFallback && wizardController.isChoicesError;

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
      minH={0}
      overflow="hidden"
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

          <Box flex={1} minH={0} overflow="auto" p={3}>
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
                initialSelections={wizardController.initialFollowUpSelections}
                onComplete={(selections) =>
                  void wizardController.completeFollowUp(selections)
                }
                onBack={
                  wizardController.isExistingChoiceEditMode
                    ? undefined
                    : () => void wizardController.backFromFollowUp()
                }
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

          {shouldShowChoiceFallbackNotice ? (
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
      ) : isStartEditMode && activeNode ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
              가져올 곳 설정
            </Text>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <Box flex={1} minH={0} overflow="auto" p={3}>
            <SourceNodePanel
              data={activeNode.data}
              nodeId={activeNode.id}
              onCancel={() => setActivePanelMode("view")}
              onComplete={() => setActivePanelMode("view")}
            />
          </Box>
        </>
      ) : isStartViewMode && activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                가져올 곳
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <SourceSetupSummaryBlock
              canEdit={canEditNodes}
              config={activeNode.data.config}
              hasConfigIssue={hasConfigIssue}
              outputLabel={sourceOutputLabel}
              source={nodeDataPanel.schemaPreview?.source ?? null}
              onEdit={() => setActivePanelMode("edit")}
            />
          </VStack>
        </>
      ) : isMiddleEditMode && activeNode ? (
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

          <Box flex={1} minH={0} overflow="auto" p={3}>
            <PanelRenderer
              readOnly={!canEditNodes}
              onCancel={() => setActivePanelMode("view")}
              onComplete={() => setActivePanelMode("view")}
            />
          </Box>
        </>
      ) : isEndEditMode && activeNode ? (
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

          <Box flex={1} minH={0} overflow="auto" p={3}>
            <PanelRenderer
              readOnly={!canEditNodes}
              onCancel={() => setActivePanelMode("view")}
              onComplete={() => setActivePanelMode("view")}
            />
          </Box>
        </>
      ) : isEndViewMode && activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                보낼 곳
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <SinkSetupSummaryBlock
              canEdit={canEditNodes}
              config={activeNode.data.config}
              fields={
                sinkSchema?.fields ??
                selectedSinkService?.config_schema.fields ??
                []
              }
              hasConfigIssue={hasConfigIssue}
              inputLabel={sinkInputLabel}
              serviceLabel={selectedSinkService?.label ?? activeMeta.label}
              serviceKey={selectedSinkService?.key ?? serviceKey}
              onEdit={() => setActivePanelMode("edit")}
            />
          </VStack>
        </>
      ) : isProcessingMethodOnlyNode && activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                처리 방식
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <ProcessingMethodSummaryBlock
              choiceNodeType={choiceNodeType}
              outputType={activeNode.data.outputTypes[0] ?? null}
            />
          </VStack>
        </>
      ) : isBranchViewMode && activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                遺꾧린
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <BranchSetupSummaryBlock
              branchStates={branchPathStates}
              canEdit={canEditNodes}
              config={activeNode.data.config}
              hasConfigIssue={hasConfigIssue}
              onEdit={() => setActivePanelMode("edit")}
            />
          </VStack>
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
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                출력 데이터
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                {outputDataLabel}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                최근 실행 기준으로 이 노드가 다음 단계에 전달한 데이터를
                표시합니다.
              </Text>
            </Box>

            <DataStateNotice
              state={nodeDataPanel.state}
              panelKind="output"
              executionData={nodeDataPanel.executionData}
              isStaleAgainstCurrentEditor={
                nodeDataPanel.isStaleAgainstCurrentEditor
              }
            />
            {hasConfigIssue ? (
              <Box
                bg="orange.50"
                border="1px solid"
                borderColor="orange.100"
                borderRadius="2xl"
                px={4}
                py={4}
              >
                <Text color="orange.600" fontSize="sm" fontWeight="semibold">
                  설정 확인 필요
                </Text>
                <Text mt={1} color="text.secondary" fontSize="sm">
                  실행 전에 이 노드의 설정을 다시 확인해 주세요.
                </Text>
              </Box>
            ) : null}
            {canEditNodes ? (
              <Button
                alignSelf="flex-start"
                size="sm"
                variant="outline"
                onClick={() => setActivePanelMode("edit")}
              >
                설정 수정
              </Button>
            ) : null}
            {nodeDataPanel.isPreviewSupported ? (
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  alignSelf="flex-start"
                  size="sm"
                  variant="outline"
                  loading={nodeDataPanel.isPreviewLoading}
                  disabled={!nodeDataPanel.canRequestPreview}
                  onClick={nodeDataPanel.requestPreview}
                >
                  실행 전 미리보기
                </Button>
                {isDirty ? (
                  <Text fontSize="xs" color="orange.500">
                    저장 후 미리보기를 확인할 수 있습니다.
                  </Text>
                ) : null}
                {nodeDataPanel.previewErrorMessage ? (
                  <Text fontSize="xs" color="red.500">
                    {nodeDataPanel.previewErrorMessage}
                  </Text>
                ) : null}
              </Box>
            ) : null}
            {hasPreviewData ? (
              <DataPreviewBlock
                title={
                  nodeDataPanel.isPreviewDataDisplayed
                    ? "미리보기 데이터"
                    : "출력 데이터"
                }
                data={nodeDataPanel.dataToDisplay}
                previewMetadata={
                  nodeDataPanel.isPreviewDataDisplayed
                    ? nodeDataPanel.nodePreviewData?.metadata
                    : null
                }
              />
            ) : null}
            {shouldShowSchemaPreview ? (
              <SchemaPreviewBlock
                title="예상 출력 구조"
                schema={nodeDataPanel.schemaToDisplay}
              />
            ) : null}
            {nodeDataPanel.executionData ? (
              <NodeExecutionStatusBlock
                executionData={nodeDataPanel.executionData}
              />
            ) : null}
          </VStack>
        </>
      ) : activeNode && activeMeta ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={3}
          >
            <Box display="flex" gap={2} alignItems="center">
              {renderActiveNodeIcon()}
              <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
                설정
              </Text>
            </Box>
            <Box cursor="pointer" onClick={handleClose}>
              <Icon as={MdCancel} boxSize={6} color="gray.600" />
            </Box>
          </Box>

          <VStack
            align="stretch"
            flex={1}
            minH={0}
            overflow="auto"
            p={3}
            gap={6}
          >
            <FallbackNodeSummaryBlock
              canEdit={canEditNodes && !isProcessingMethodOnlyNode}
              hasConfigIssue={hasConfigIssue}
              label={activeNode.data.label ?? activeMeta.label}
              outputLabel={outputDataLabel}
              onEdit={() => setActivePanelMode("edit")}
            />
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

          <Box flex={1} minH={0} overflow="auto" p={3}>
            <Text color="text.secondary" fontSize="sm">
              노드를 선택하면 설정과 출력 정보를 확인할 수 있습니다.
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};
