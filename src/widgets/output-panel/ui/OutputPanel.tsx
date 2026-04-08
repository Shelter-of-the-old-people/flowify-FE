import { useCallback, useEffect, useMemo, useState } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Button, Icon, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { DataType, NodeMeta } from "@/entities/node";
import { useAddNode } from "@/features/add-node";
import {
  MAPPING_NODE_TYPE_MAP,
  MAPPING_RULES,
  toDataType,
  toMappingKey,
} from "@/features/choice-panel";
import type {
  MappingAction,
  MappingDataTypeKey,
  ProcessingMethodOption,
} from "@/features/choice-panel";
import {
  ActionStep,
  FollowUpStep,
  ProcessingMethodStep,
} from "@/features/choice-panel/ui";
import { PanelRenderer } from "@/features/configure-node";
import { useWorkflowStore } from "@/shared";

type WizardStep = "processing-method" | "action" | "follow-up";

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;

const OUTPUT_DATA_LABELS: Record<DataType, string> = {
  "file-list": "파일 목록",
  "single-file": "단일 파일",
  text: "텍스트",
  spreadsheet: "스프레드시트 데이터",
  "email-list": "이메일 목록",
  "single-email": "단일 이메일",
  "schedule-data": "일정 데이터",
  "api-response": "API 응답",
};

const findActionById = (
  actionId: string | null | undefined,
): MappingAction | null => {
  if (!actionId) return null;

  for (const dataType of Object.values(MAPPING_RULES.data_types)) {
    const action = dataType.actions.find(
      (candidate) => candidate.id === actionId,
    );
    if (action) {
      return action;
    }
  }

  return null;
};

const readSelectionSummary = (
  action: MappingAction | null,
  selections: Record<string, string | string[]> | null | undefined,
): string[] => {
  if (!action || !selections) return [];

  const optionLookup = new Map<string, string>();
  for (const option of action.follow_up?.options ?? []) {
    optionLookup.set(option.id, option.label);
  }
  for (const option of action.branch_config?.options ?? []) {
    optionLookup.set(option.id, option.label);
  }

  return Object.values(selections).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => optionLookup.get(entry) ?? entry);
    }

    return optionLookup.get(value) ?? value;
  });
};

const createTemporaryNodeLabel = (outputType: DataType | null) =>
  outputType ? `${OUTPUT_DATA_LABELS[outputType]} 설정` : "설정 중";

export const OutputPanel = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const { addNode } = useAddNode();

  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null);
  const [initialDataTypeKey, setInitialDataTypeKey] =
    useState<MappingDataTypeKey | null>(null);
  const [currentDataTypeKey, setCurrentDataTypeKey] =
    useState<MappingDataTypeKey | null>(null);
  const [selectedProcessingOption, setSelectedProcessingOption] =
    useState<ProcessingMethodOption | null>(null);
  const [selectedAction, setSelectedAction] = useState<MappingAction | null>(
    null,
  );
  const [processingNodeId, setProcessingNodeId] = useState<string | null>(null);
  const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
  const [rootParentNodeId, setRootParentNodeId] = useState<string | null>(null);
  const [rootPosition, setRootPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const resetWizardState = useCallback(() => {
    setWizardStep(null);
    setInitialDataTypeKey(null);
    setCurrentDataTypeKey(null);
    setSelectedProcessingOption(null);
    setSelectedAction(null);
    setProcessingNodeId(null);
    setPlacedNodeId(null);
    setRootParentNodeId(null);
    setRootPosition(null);
  }, []);

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activePanelNodeId) ?? null,
    [activePanelNodeId, nodes],
  );
  const incomingEdge = useMemo(
    () =>
      activePanelNodeId
        ? (edges.find((edge) => edge.target === activePanelNodeId) ?? null)
        : null,
    [activePanelNodeId, edges],
  );
  const parentNode = useMemo(
    () =>
      incomingEdge
        ? (nodes.find((node) => node.id === incomingEdge.source) ?? null)
        : null,
    [incomingEdge, nodes],
  );

  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
  const isStartNode = activeNode?.id === startNodeId;
  const isEndNode = activeNode?.id === endNodeId;
  const isMiddleNode = Boolean(activeNode) && !isStartNode && !isEndNode;
  const isWizardMode =
    Boolean(activeNode) &&
    isMiddleNode &&
    activeNode.data.config.isConfigured === false;
  const isDetailMode = activeNode?.data.config.isConfigured === true;

  const currentDataType =
    currentDataTypeKey !== null
      ? MAPPING_RULES.data_types[currentDataTypeKey]
      : null;
  const activeMeta = activeNode ? NODE_REGISTRY[activeNode.data.type] : null;
  const detailAction = useMemo(
    () => findActionById(activeNode?.data.config.choiceActionId),
    [activeNode?.data.config.choiceActionId],
  );
  const detailSelections = useMemo(
    () =>
      readSelectionSummary(
        detailAction,
        activeNode?.data.config.choiceSelections ?? null,
      ),
    [activeNode?.data.config.choiceSelections, detailAction],
  );
  const outputDataLabel =
    activeNode?.data.outputTypes[0] !== undefined
      ? OUTPUT_DATA_LABELS[activeNode.data.outputTypes[0]]
      : "출력 데이터";

  const createNode = useCallback(
    ({
      meta,
      sourceNodeId,
      position,
      outputDataType,
      label,
    }: {
      meta: NodeMeta;
      sourceNodeId: string;
      position: { x: number; y: number };
      outputDataType?: DataType;
      label?: string;
    }) => {
      const nodeId = addNode(meta.type, {
        position,
        outputTypes: outputDataType ? [outputDataType] : undefined,
        label,
      });

      onConnect({
        source: sourceNodeId,
        target: nodeId,
        sourceHandle: null,
        targetHandle: null,
      });

      return nodeId;
    },
    [addNode, onConnect],
  );

  const createTemporaryWizardNode = useCallback(
    ({
      sourceNodeId,
      position,
      outputType,
    }: {
      sourceNodeId: string;
      position: { x: number; y: number };
      outputType: DataType | null;
    }) =>
      createNode({
        meta: NODE_REGISTRY["data-process"],
        sourceNodeId,
        position,
        outputDataType: outputType ?? undefined,
        label: createTemporaryNodeLabel(outputType),
      }),
    [createNode],
  );

  useEffect(() => {
    if (!activePanelNodeId) {
      queueMicrotask(() => {
        resetWizardState();
      });
    }
  }, [activePanelNodeId, resetWizardState]);

  useEffect(() => {
    if (!isWizardMode || !activeNode || !parentNode || wizardStep) return;

    const parentOutputType = parentNode.data.outputTypes[0] ?? null;
    if (!parentOutputType) return;

    const mappingKey = toMappingKey(parentOutputType);
    const dataType = MAPPING_RULES.data_types[mappingKey];
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setRootParentNodeId(parentNode.id);
      setRootPosition(activeNode.position);
      setInitialDataTypeKey(mappingKey);
      setCurrentDataTypeKey(mappingKey);
      setWizardStep(
        dataType.requires_processing_method ? "processing-method" : "action",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [activeNode, isWizardMode, parentNode, wizardStep]);

  const handleClose = () => {
    resetWizardState();
    closePanel();
  };

  const finishWizard = () => {
    resetWizardState();
  };

  const handleProcessingMethodSelect = (option: ProcessingMethodOption) => {
    if (!activeNode || !rootParentNodeId) return;

    setSelectedProcessingOption(option);
    setCurrentDataTypeKey(option.output_data_type);

    const nextDataType = MAPPING_RULES.data_types[option.output_data_type];
    if (nextDataType.actions.length > 0) {
      setWizardStep("action");
      return;
    }

    const currentPosition = activeNode.position;
    removeNode(activeNode.id);

    if (option.node_type) {
      const processingType = MAPPING_NODE_TYPE_MAP[option.node_type];
      const processingNodeId = createNode({
        meta: NODE_REGISTRY[processingType],
        sourceNodeId: rootParentNodeId,
        position: currentPosition,
        outputDataType: toDataType(option.output_data_type),
      });
      updateNodeConfig(processingNodeId, {});
      openPanel(processingNodeId);
      finishWizard();
      return;
    }

    const passthroughNodeId = createNode({
      meta: NODE_REGISTRY["data-process"],
      sourceNodeId: rootParentNodeId,
      position: currentPosition,
      outputDataType: toDataType(option.output_data_type),
      label: option.label,
    });
    updateNodeConfig(passthroughNodeId, {});
    openPanel(passthroughNodeId);
    finishWizard();
  };

  const handleActionSelect = (action: MappingAction) => {
    if (!activeNode || !rootParentNodeId) return;

    setSelectedAction(action);

    const currentPosition = activeNode.position;
    const rootNodePosition = rootPosition ?? currentPosition;
    const currentDataType = toDataType(action.output_data_type);

    removeNode(activeNode.id);

    let sourceNodeId = rootParentNodeId;
    let actionPosition = currentPosition;
    let nextProcessingNodeId = processingNodeId;

    if (selectedProcessingOption?.node_type && !processingNodeId) {
      const processingType =
        MAPPING_NODE_TYPE_MAP[selectedProcessingOption.node_type];
      const createdProcessingNodeId = createNode({
        meta: NODE_REGISTRY[processingType],
        sourceNodeId: rootParentNodeId,
        position: rootNodePosition,
        outputDataType: toDataType(selectedProcessingOption.output_data_type),
      });
      updateNodeConfig(createdProcessingNodeId, {});
      nextProcessingNodeId = createdProcessingNodeId;
      setProcessingNodeId(createdProcessingNodeId);
      sourceNodeId = createdProcessingNodeId;
      actionPosition = {
        x: rootNodePosition.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
        y: rootNodePosition.y,
      };
    } else if (processingNodeId) {
      sourceNodeId = processingNodeId;
    }

    const actionType = MAPPING_NODE_TYPE_MAP[action.node_type];
    const actionNodeId = createNode({
      meta: NODE_REGISTRY[actionType],
      sourceNodeId,
      position: actionPosition,
      outputDataType: currentDataType,
    });

    openPanel(actionNodeId);
    setPlacedNodeId(actionNodeId);

    if (action.follow_up || action.branch_config) {
      setWizardStep("follow-up");
      return;
    }

    updateNodeConfig(actionNodeId, {
      choiceActionId: action.id,
      choiceSelections: null,
    });
    finishWizard();

    if (nextProcessingNodeId) {
      setProcessingNodeId(nextProcessingNodeId);
    }
  };

  const handleBackToProcessingMethod = () => {
    if (!initialDataTypeKey) return;

    if (!processingNodeId) {
      setSelectedProcessingOption(null);
      setSelectedAction(null);
      setCurrentDataTypeKey(initialDataTypeKey);
      setWizardStep("processing-method");
      return;
    }

    const processingNode =
      nodes.find((node) => node.id === processingNodeId) ?? null;
    const resetPosition =
      processingNode?.position ?? rootPosition ?? activeNode?.position;

    if (activeNode && activeNode.id !== processingNodeId) {
      removeNode(activeNode.id);
    }
    removeNode(processingNodeId);

    if (rootParentNodeId && resetPosition) {
      const resetNodeId = createTemporaryWizardNode({
        sourceNodeId: rootParentNodeId,
        position: resetPosition,
        outputType: parentNode?.data.outputTypes[0] ?? null,
      });
      openPanel(resetNodeId);
    }

    setProcessingNodeId(null);
    setPlacedNodeId(null);
    setSelectedAction(null);
    setSelectedProcessingOption(null);
    setCurrentDataTypeKey(initialDataTypeKey);
    setWizardStep("processing-method");
  };

  const handleBackToAction = () => {
    if (!activeNode) return;

    const restoreSourceNodeId = processingNodeId ?? rootParentNodeId;
    if (!restoreSourceNodeId) return;

    const restorePosition = activeNode.position;
    removeNode(activeNode.id);

    const tempNodeId = createTemporaryWizardNode({
      sourceNodeId: restoreSourceNodeId,
      position: restorePosition,
      outputType:
        currentDataTypeKey !== null ? toDataType(currentDataTypeKey) : null,
    });

    openPanel(tempNodeId);
    setPlacedNodeId(null);
    setSelectedAction(null);
    setWizardStep("action");
  };

  const handleFollowUpComplete = (
    selections: Record<string, string | string[]>,
  ) => {
    if (!placedNodeId || !selectedAction) return;

    updateNodeConfig(placedNodeId, {
      choiceActionId: selectedAction.id,
      choiceSelections: selections,
    });
    finishWizard();
  };

  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      width="690px"
      maxW="690px"
      minW="690px"
      height="100%"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="lg"
      overflowY="auto"
      px={3}
      py={6}
      zIndex={5}
      transform={isOpen ? "translateX(0)" : "translateX(100%)"}
      transition="transform 200ms ease"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      {isWizardMode && wizardStep ? (
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
            {wizardStep === "processing-method" &&
            currentDataType?.processing_method ? (
              <ProcessingMethodStep
                processingMethod={currentDataType.processing_method}
                onSelect={handleProcessingMethodSelect}
              />
            ) : null}

            {wizardStep === "action" && currentDataType ? (
              <ActionStep
                actions={currentDataType.actions}
                onSelect={handleActionSelect}
                onBack={
                  selectedProcessingOption
                    ? handleBackToProcessingMethod
                    : undefined
                }
              />
            ) : null}

            {wizardStep === "follow-up" && selectedAction ? (
              <FollowUpStep
                followUp={selectedAction.follow_up ?? null}
                branchConfig={selectedAction.branch_config ?? null}
                onComplete={handleFollowUpComplete}
                onBack={handleBackToAction}
              />
            ) : null}
          </Box>
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
                나가는 데이터
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
                처리된 데이터 미리보기는 백엔드 연동 후 제공될 예정입니다.
              </Text>
            </Box>

            {detailAction ? (
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  선택한 처리
                </Text>
                <Text fontSize="md">{detailAction.label}</Text>
              </Box>
            ) : null}

            {detailSelections.length > 0 ? (
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  선택 옵션
                </Text>
                <VStack align="stretch" gap={2}>
                  {detailSelections.map((selection, index) => (
                    <Box
                      key={`${selection}-${index}`}
                      px={4}
                      py={3}
                      borderRadius="xl"
                      bg="gray.50"
                    >
                      <Text fontSize="sm">{selection}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            ) : null}

            <Button
              alignSelf="flex-start"
              bg="black"
              color="white"
              borderRadius="10px"
              px={6}
              py={3}
              fontSize="14px"
              fontWeight="semibold"
              _hover={{ bg: "gray.800" }}
            >
              테스트 해보기
            </Button>
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
            <PanelRenderer />
          </Box>
        </>
      )}
    </Box>
  );
};
