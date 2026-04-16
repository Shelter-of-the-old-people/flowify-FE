import { useCallback, useEffect, useMemo, useState } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, Spinner, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import { type DataType, type NodeMeta, type NodeType } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type ChoiceOption,
  type ChoiceResponse,
  findAddedNodeId,
  toFlowNode,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
  useSelectWorkflowChoiceMutation,
  useWorkflowChoicesQuery,
} from "@/entities/workflow";
import { useAddNode } from "@/features/add-node";
import {
  MAPPING_NODE_TYPE_MAP,
  MAPPING_RULES,
  OUTPUT_DATA_LABELS,
  toDataType,
  toMappingKey,
} from "@/features/choice-panel";
import {
  type BranchConfig,
  type FollowUp,
  type MappingAction,
  type MappingDataTypeKey,
} from "@/features/choice-panel";
import { PanelRenderer } from "@/features/configure-node";
import { useWorkflowStore } from "@/features/workflow-editor";
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

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;
const PANEL_TRANSITION_MS = 240;

const createTemporaryNodeLabel = (outputType: DataType | null) =>
  outputType ? `${OUTPUT_DATA_LABELS[outputType]} 설정` : "설정 중";

const isMappingDataTypeKey = (
  value: string | null | undefined,
): value is MappingDataTypeKey =>
  Boolean(value && value in MAPPING_RULES.data_types);

const toChoiceFollowUp = (followUp: FollowUp | null | undefined) =>
  followUp
    ? {
        question: followUp.question,
        options: (followUp.options ?? []).map((option) => ({
          id: option.id,
          label: option.label,
          type: option.type ?? null,
        })),
        options_source: followUp.options_source ?? null,
        multi_select: followUp.multi_select ?? null,
        description: followUp.description ?? null,
      }
    : null;

const toChoiceBranchConfig = (branchConfig: BranchConfig | null | undefined) =>
  branchConfig
    ? {
        question: branchConfig.question,
        options: (branchConfig.options ?? []).map((option) => ({
          id: option.id,
          label: option.label,
          type: option.type ?? null,
        })),
        options_source: branchConfig.options_source ?? null,
        multi_select: branchConfig.multi_select ?? null,
        description: branchConfig.description ?? null,
      }
    : null;

const toWizardChoiceOption = (
  option: ChoiceOption | MappingAction,
): WizardChoiceOption => ({
  id: option.id,
  label: option.label,
  type: "type" in option ? (option.type ?? null) : null,
  node_type: "node_type" in option ? (option.node_type ?? null) : null,
  output_data_type:
    "output_data_type" in option ? (option.output_data_type ?? null) : null,
  priority: "priority" in option ? (option.priority ?? null) : null,
  description: "description" in option ? option.description : undefined,
  followUp:
    "follow_up" in option ? toChoiceFollowUp(option.follow_up ?? null) : null,
  branchConfig:
    "branch_config" in option
      ? toChoiceBranchConfig(option.branch_config ?? null)
      : null,
});

const mergeChoiceResponses = (
  primary: ChoiceResponse | null | undefined,
  fallback: WizardChoiceResponse | null,
): WizardChoiceResponse | null => {
  if (!primary && !fallback) {
    return null;
  }

  if (!primary) {
    return fallback;
  }

  const normalizedPrimary: WizardChoiceResponse = {
    question: primary.question,
    options: primary.options.map(toWizardChoiceOption),
    requiresProcessingMethod: primary.requiresProcessingMethod,
    multiSelect: primary.multiSelect ?? null,
  };

  if (!fallback) {
    return normalizedPrimary;
  }

  const fallbackOptionMap = new Map(
    fallback.options.map((option) => [option.id, option]),
  );

  return {
    question: normalizedPrimary.question || fallback.question,
    requiresProcessingMethod: normalizedPrimary.requiresProcessingMethod,
    multiSelect: normalizedPrimary.multiSelect ?? fallback.multiSelect ?? null,
    options:
      normalizedPrimary.options.length > 0
        ? normalizedPrimary.options.map((option) => ({
            ...fallbackOptionMap.get(option.id),
            ...option,
          }))
        : fallback.options,
  };
};

const buildLocalChoiceResponse = (
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse => {
  const config = MAPPING_RULES.data_types[dataTypeKey];

  if (config.requires_processing_method && config.processing_method) {
    return {
      question: config.processing_method.question,
      options: config.processing_method.options.map(toWizardChoiceOption),
      requiresProcessingMethod: true,
      multiSelect: null,
    };
  }

  return {
    question: `${config.label}을 어떻게 처리할까요?`,
    options: config.actions.map(toWizardChoiceOption),
    requiresProcessingMethod: false,
    multiSelect: null,
  };
};

const buildLocalActionResponse = (
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse => {
  const config = MAPPING_RULES.data_types[dataTypeKey];

  return {
    question: `${config.label}을 어떻게 처리할까요?`,
    options: config.actions.map(toWizardChoiceOption),
    requiresProcessingMethod: false,
    multiSelect: null,
  };
};

const toChoiceNodeType = (value: string | null | undefined): NodeType =>
  value && value in MAPPING_NODE_TYPE_MAP
    ? MAPPING_NODE_TYPE_MAP[value as keyof typeof MAPPING_NODE_TYPE_MAP]
    : "data-process";

export const OutputPanel = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const batchServerSync = useWorkflowStore((state) => state.batchServerSync);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const { addNode: addLocalNode } = useAddNode();
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: deleteWorkflowNode, isPending: isDeleteNodePending } =
    useDeleteWorkflowNodeMutation();
  const {
    mutateAsync: selectWorkflowChoice,
    isPending: isSelectChoicePending,
  } = useSelectWorkflowChoiceMutation();
  const layout = useDualPanelLayout();
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;

  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null);
  const [initialDataTypeKey, setInitialDataTypeKey] =
    useState<MappingDataTypeKey | null>(null);
  const [currentDataTypeKey, setCurrentDataTypeKey] =
    useState<MappingDataTypeKey | null>(null);
  const [selectedProcessingOption, setSelectedProcessingOption] =
    useState<WizardChoiceOption | null>(null);
  const [selectedAction, setSelectedAction] =
    useState<WizardChoiceOption | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<ChoiceFollowUp | null>(null);
  const [selectedBranchConfig, setSelectedBranchConfig] =
    useState<ChoiceBranchConfig | null>(null);
  const [processingNodeId, setProcessingNodeId] = useState<string | null>(null);
  const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
  const [rootParentNodeId, setRootParentNodeId] = useState<string | null>(null);
  const [rootPosition, setRootPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const resetWizardState = useCallback(() => {
    setWizardStep(null);
    setInitialDataTypeKey(null);
    setCurrentDataTypeKey(null);
    setSelectedProcessingOption(null);
    setSelectedAction(null);
    setSelectedFollowUp(null);
    setSelectedBranchConfig(null);
    setProcessingNodeId(null);
    setPlacedNodeId(null);
    setRootParentNodeId(null);
    setRootPosition(null);
    setWizardError(null);
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

  const isStartNode = activeNode?.id === startNodeId;
  const isEndNode = activeNode?.id === endNodeId;
  const isMiddleNode = Boolean(activeNode) && !isStartNode && !isEndNode;
  const isWizardMode =
    isMiddleNode && activeNode?.data.config.isConfigured === false;
  const isDetailMode = activeNode?.data.config.isConfigured === true;

  const {
    data: serverChoiceResponse,
    isLoading: isChoicesLoading,
    isError: isChoicesError,
  } = useWorkflowChoicesQuery(
    workflowId || undefined,
    isWizardMode ? (parentNode?.id ?? null) : null,
    isWizardMode,
  );

  const initialLocalChoiceResponse = useMemo(
    () =>
      initialDataTypeKey ? buildLocalChoiceResponse(initialDataTypeKey) : null,
    [initialDataTypeKey],
  );
  const initialChoiceResponse = useMemo(
    () =>
      mergeChoiceResponses(serverChoiceResponse, initialLocalChoiceResponse),
    [initialLocalChoiceResponse, serverChoiceResponse],
  );
  const currentActionChoiceResponse = useMemo(
    () =>
      currentDataTypeKey ? buildLocalActionResponse(currentDataTypeKey) : null,
    [currentDataTypeKey],
  );
  const activeActionChoiceResponse = useMemo(() => {
    if (!currentActionChoiceResponse) {
      return null;
    }

    if (
      initialChoiceResponse &&
      initialChoiceResponse.requiresProcessingMethod === false &&
      currentDataTypeKey === initialDataTypeKey
    ) {
      return mergeChoiceResponses(
        initialChoiceResponse,
        currentActionChoiceResponse,
      );
    }

    return currentActionChoiceResponse;
  }, [
    currentActionChoiceResponse,
    currentDataTypeKey,
    initialChoiceResponse,
    initialDataTypeKey,
  ]);

  const outputDataLabel =
    activeNode?.data.outputTypes[0] !== undefined
      ? OUTPUT_DATA_LABELS[activeNode.data.outputTypes[0]]
      : "출력 데이터";
  const activeMeta = activeNode ? NODE_REGISTRY[activeNode.data.type] : null;
  const isWorkflowBusy =
    isChoicesLoading ||
    isAddNodePending ||
    isDeleteNodePending ||
    isSelectChoicePending;
  const closedTransform =
    layout.mode === "stacked"
      ? `translate3d(0, ${layout.canvasHeight - layout.outputPanelTop + 24}px, 0)`
      : `translate3d(${layout.canvasWidth - layout.outputPanelLeft + 24}px, 0, 0)`;
  const transition = isOpen
    ? `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear 0ms`
    : `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear ${PANEL_TRANSITION_MS}ms`;

  const createLocalNode = useCallback(
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
      const nodeId = addLocalNode(meta.type, {
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
    [addLocalNode, onConnect],
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
      createLocalNode({
        meta: NODE_REGISTRY["data-process"],
        sourceNodeId,
        position,
        outputDataType: outputType ?? undefined,
        label: createTemporaryNodeLabel(outputType),
      }),
    [createLocalNode],
  );

  const placeWorkflowNode = useCallback(
    async ({
      type,
      sourceNodeId,
      position,
      outputDataTypeKey,
      label,
    }: {
      type: NodeType;
      sourceNodeId: string;
      position: { x: number; y: number };
      outputDataTypeKey: MappingDataTypeKey | null;
      label?: string;
    }) => {
      if (!workflowId) {
        return createLocalNode({
          meta: NODE_REGISTRY[type],
          sourceNodeId,
          position,
          outputDataType: outputDataTypeKey
            ? toDataType(outputDataTypeKey)
            : undefined,
          label,
        });
      }

      const previousNodes = useWorkflowStore.getState().nodes;
      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type,
          position,
          prevNodeId: sourceNodeId,
          outputTypes: outputDataTypeKey
            ? [toDataType(outputDataTypeKey)]
            : undefined,
        }),
      });

      const addedNodeId =
        findAddedNodeId(previousNodes, nextWorkflow.nodes) ??
        nextWorkflow.nodes.at(-1)?.id ??
        null;
      const addedNode = nextWorkflow.nodes.find(
        (node) => node.id === addedNodeId,
      );

      if (!addedNodeId || !addedNode) {
        return null;
      }

      batchServerSync(() => {
        addNode(toFlowNode(addedNode));
        onConnect({
          source: sourceNodeId,
          target: addedNodeId,
          sourceHandle: null,
          targetHandle: null,
        });

        if (label) {
          updateNodeConfig(addedNodeId, {});
        }
      });

      return addedNodeId;
    },
    [
      addNode,
      addWorkflowNode,
      batchServerSync,
      createLocalNode,
      onConnect,
      updateNodeConfig,
      workflowId,
    ],
  );

  const removeWorkflowNode = useCallback(
    async (nodeId: string) => {
      if (workflowId) {
        await deleteWorkflowNode({
          workflowId,
          nodeId,
        });
        batchServerSync(() => {
          removeNode(nodeId);
        });
        return;
      }

      removeNode(nodeId);
    },
    [batchServerSync, deleteWorkflowNode, removeNode, workflowId],
  );

  useEffect(() => {
    if (!isWizardMode || !activeNode || !parentNode || initialDataTypeKey) {
      return;
    }

    const parentOutputType = parentNode.data.outputTypes[0] ?? null;
    if (!parentOutputType) {
      return;
    }

    const mappingKey = toMappingKey(parentOutputType);
    setRootParentNodeId(parentNode.id);
    setRootPosition(activeNode.position);
    setInitialDataTypeKey(mappingKey);
    setCurrentDataTypeKey(mappingKey);
  }, [activeNode, initialDataTypeKey, isWizardMode, parentNode]);

  useEffect(() => {
    if (!isWizardMode || wizardStep || !initialChoiceResponse) {
      return;
    }

    setWizardStep(
      initialChoiceResponse.requiresProcessingMethod
        ? "processing-method"
        : "action",
    );
  }, [initialChoiceResponse, isWizardMode, wizardStep]);

  const handleClose = () => {
    resetWizardState();
    closePanel();
  };

  const finishWizard = () => {
    resetWizardState();
  };

  const handleProcessingMethodSelect = async (option: WizardChoiceOption) => {
    if (!activeNode || !rootParentNodeId || !currentDataTypeKey) {
      return;
    }

    setWizardError(null);
    setSelectedProcessingOption(option);

    try {
      const selectionResult = workflowId
        ? await selectWorkflowChoice({
            workflowId,
            prevNodeId: rootParentNodeId,
            selectedOptionId: option.id,
            dataType: currentDataTypeKey,
          })
        : {
            nodeType: option.node_type ?? null,
            outputDataType: option.output_data_type ?? currentDataTypeKey,
            followUp: null,
            branchConfig: null,
          };

      const nextDataTypeKey = isMappingDataTypeKey(
        selectionResult.outputDataType,
      )
        ? selectionResult.outputDataType
        : isMappingDataTypeKey(option.output_data_type)
          ? option.output_data_type
          : currentDataTypeKey;

      setCurrentDataTypeKey(nextDataTypeKey);

      const nextActions = buildLocalActionResponse(nextDataTypeKey);
      if (nextActions.options.length > 0) {
        setWizardStep("action");
        return;
      }

      removeNode(activeNode.id);

      const nextNodeType = selectionResult.nodeType
        ? toChoiceNodeType(selectionResult.nodeType)
        : "data-process";
      const nextNodeId = await placeWorkflowNode({
        type: nextNodeType,
        sourceNodeId: rootParentNodeId,
        position: activeNode.position,
        outputDataTypeKey: nextDataTypeKey,
        label: selectionResult.nodeType ? undefined : option.label,
      });

      if (!nextNodeId) {
        throw new Error("node was not created");
      }

      updateNodeConfig(nextNodeId, {});
      openPanel(nextNodeId);
      finishWizard();
    } catch {
      setWizardError("처리 방식을 반영하지 못했습니다.");
    }
  };

  const handleActionSelect = async (action: WizardChoiceOption) => {
    if (!activeNode || !rootParentNodeId || !currentDataTypeKey) {
      return;
    }

    setWizardError(null);

    try {
      const selectionResult = workflowId
        ? await selectWorkflowChoice({
            workflowId,
            prevNodeId: rootParentNodeId,
            selectedOptionId: action.id,
            dataType: currentDataTypeKey,
          })
        : {
            nodeType: action.node_type ?? null,
            outputDataType: action.output_data_type ?? currentDataTypeKey,
            followUp: action.followUp ?? null,
            branchConfig: action.branchConfig ?? null,
          };

      const nextDataTypeKey = isMappingDataTypeKey(
        selectionResult.outputDataType,
      )
        ? selectionResult.outputDataType
        : isMappingDataTypeKey(action.output_data_type)
          ? action.output_data_type
          : currentDataTypeKey;

      const followUp = selectionResult.followUp ?? action.followUp ?? null;
      const branchConfig =
        selectionResult.branchConfig ?? action.branchConfig ?? null;

      removeNode(activeNode.id);

      let sourceNodeId = rootParentNodeId;
      let actionPosition = activeNode.position;

      if (selectedProcessingOption?.node_type && !processingNodeId) {
        const createdProcessingNodeId = await placeWorkflowNode({
          type: toChoiceNodeType(selectedProcessingOption.node_type),
          sourceNodeId: rootParentNodeId,
          position: rootPosition ?? activeNode.position,
          outputDataTypeKey: currentDataTypeKey,
        });

        if (!createdProcessingNodeId) {
          throw new Error("processing node was not created");
        }

        updateNodeConfig(createdProcessingNodeId, {});
        setProcessingNodeId(createdProcessingNodeId);
        sourceNodeId = createdProcessingNodeId;
        actionPosition = {
          x:
            (rootPosition ?? activeNode.position).x +
            DEFAULT_FLOW_NODE_WIDTH +
            NODE_GAP_X,
          y: (rootPosition ?? activeNode.position).y,
        };
      } else if (processingNodeId) {
        sourceNodeId = processingNodeId;
      }

      const actionNodeType = selectionResult.nodeType
        ? toChoiceNodeType(selectionResult.nodeType)
        : toChoiceNodeType(action.node_type);
      const actionNodeId = await placeWorkflowNode({
        type: actionNodeType,
        sourceNodeId,
        position: actionPosition,
        outputDataTypeKey: nextDataTypeKey,
      });

      if (!actionNodeId) {
        throw new Error("action node was not created");
      }

      setSelectedAction(action);
      setSelectedFollowUp(followUp);
      setSelectedBranchConfig(branchConfig);
      setPlacedNodeId(actionNodeId);
      openPanel(actionNodeId);

      if (followUp || branchConfig) {
        setWizardStep("follow-up");
        return;
      }

      updateNodeConfig(actionNodeId, {
        choiceActionId: action.id,
        choiceSelections: null,
      });
      finishWizard();
    } catch {
      setWizardError("작업 노드를 추가하지 못했습니다.");
    }
  };

  const handleBackToProcessingMethod = async () => {
    if (!initialDataTypeKey || !rootParentNodeId) {
      return;
    }

    setWizardError(null);

    try {
      if (!processingNodeId && !placedNodeId) {
        setSelectedAction(null);
        setSelectedFollowUp(null);
        setSelectedBranchConfig(null);
        setSelectedProcessingOption(null);
        setCurrentDataTypeKey(initialDataTypeKey);
        setWizardStep("processing-method");
        return;
      }

      if (processingNodeId) {
        await removeWorkflowNode(processingNodeId);
      } else if (placedNodeId) {
        await removeWorkflowNode(placedNodeId);
      }

      const resetPosition = rootPosition ?? activeNode?.position;
      if (resetPosition) {
        const tempNodeId = createTemporaryWizardNode({
          sourceNodeId: rootParentNodeId,
          position: resetPosition,
          outputType: parentNode?.data.outputTypes[0] ?? null,
        });
        openPanel(tempNodeId);
      }

      setProcessingNodeId(null);
      setPlacedNodeId(null);
      setSelectedAction(null);
      setSelectedFollowUp(null);
      setSelectedBranchConfig(null);
      setSelectedProcessingOption(null);
      setCurrentDataTypeKey(initialDataTypeKey);
      setWizardStep("processing-method");
    } catch {
      setWizardError("이전 단계로 돌아가지 못했습니다.");
    }
  };

  const handleBackToAction = async () => {
    const restoreSourceNodeId = processingNodeId ?? rootParentNodeId;
    if (!restoreSourceNodeId) {
      return;
    }

    setWizardError(null);

    try {
      if (placedNodeId) {
        await removeWorkflowNode(placedNodeId);
      }

      const restorePosition = activeNode?.position ?? rootPosition;
      if (restorePosition) {
        const tempNodeId = createTemporaryWizardNode({
          sourceNodeId: restoreSourceNodeId,
          position: restorePosition,
          outputType:
            currentDataTypeKey !== null ? toDataType(currentDataTypeKey) : null,
        });
        openPanel(tempNodeId);
      }

      setPlacedNodeId(null);
      setSelectedAction(null);
      setSelectedFollowUp(null);
      setSelectedBranchConfig(null);
      setWizardStep("action");
    } catch {
      setWizardError("작업 선택 단계로 돌아가지 못했습니다.");
    }
  };

  const handleFollowUpComplete = (
    selections: Record<string, string | string[]>,
  ) => {
    if (!placedNodeId || !selectedAction) {
      return;
    }

    updateNodeConfig(placedNodeId, {
      choiceActionId: selectedAction.id,
      choiceSelections: selections,
    });
    finishWizard();
  };

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
            {wizardStep === "processing-method" && initialChoiceResponse ? (
              <ProcessingMethodStep
                question={initialChoiceResponse.question}
                options={initialChoiceResponse.options}
                onSelect={(option) => void handleProcessingMethodSelect(option)}
              />
            ) : null}

            {wizardStep === "action" && activeActionChoiceResponse ? (
              <ActionStep
                question={activeActionChoiceResponse.question}
                actions={activeActionChoiceResponse.options}
                onSelect={(action) => void handleActionSelect(action)}
                onBack={
                  selectedProcessingOption
                    ? () => void handleBackToProcessingMethod()
                    : undefined
                }
              />
            ) : null}

            {wizardStep === "follow-up" ? (
              <FollowUpStep
                followUp={selectedFollowUp}
                branchConfig={selectedBranchConfig}
                onComplete={handleFollowUpComplete}
                onBack={() => void handleBackToAction()}
              />
            ) : null}
          </Box>

          {isWorkflowBusy ? (
            <Box display="flex" alignItems="center" gap={2} px={6}>
              <Spinner size="sm" color="gray.500" />
              <Text fontSize="sm" color="gray.500">
                선택 내용을 반영하는 중입니다.
              </Text>
            </Box>
          ) : null}

          {isChoicesError && !serverChoiceResponse ? (
            <Text px={6} fontSize="sm" color="orange.500">
              서버 선택지를 가져오지 못해 로컬 규칙으로 이어갑니다.
            </Text>
          ) : null}

          {wizardError ? (
            <Text px={6} fontSize="sm" color="red.500">
              {wizardError}
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
                처리된 데이터 미리보기는 백엔드 실행 연동 뒤 더 풍부하게 보여줄
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
            <PanelRenderer />
          </Box>
        </>
      )}
    </Box>
  );
};
