import { useCallback, useEffect, useMemo, useState } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, Spinner, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  type DataType,
  type FlowNodeData,
  type NodeType,
} from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type ChoiceOption,
  type ChoiceResponse,
  type WorkflowResponse,
  findAddedNodeId,
  toBackendDataType,
  toBackendNodeType,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
  useMappingRulesQuery,
  useSelectWorkflowChoiceMutation,
  useUpdateWorkflowNodeMutation,
  useWorkflowChoicesQuery,
} from "@/entities/workflow";
import {
  MAPPING_NODE_TYPE_MAP,
  MAPPING_RULES,
  OUTPUT_DATA_LABELS,
  toChoiceMappingRules,
  toDataType,
  toMappingKey,
} from "@/features/choice-panel";
import {
  type BranchConfig,
  type FollowUp,
  type MappingAction,
  type MappingDataTypeKey,
  type MappingRules,
} from "@/features/choice-panel";
import { PanelRenderer } from "@/features/configure-node";
import { hydrateStore, useWorkflowStore } from "@/features/workflow-editor";
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

const isMappingDataTypeKey = (
  mappingRules: MappingRules,
  value: string | null | undefined,
): value is MappingDataTypeKey =>
  Boolean(value && value in mappingRules.data_types);

type WizardNodeSnapshot = {
  authWarning?: boolean;
  config: FlowNodeData["config"];
  inputTypes: DataType[];
  outputTypes: DataType[];
  position: { x: number; y: number };
  role: "start" | "middle" | "end";
  type: NodeType;
};

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
  mappingRules: MappingRules,
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse => {
  const config = mappingRules.data_types[dataTypeKey];

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
  mappingRules: MappingRules,
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse => {
  const config = mappingRules.data_types[dataTypeKey];

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
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: deleteWorkflowNode, isPending: isDeleteNodePending } =
    useDeleteWorkflowNodeMutation();
  const { mutateAsync: updateWorkflowNode, isPending: isUpdateNodePending } =
    useUpdateWorkflowNodeMutation();
  const {
    mutateAsync: selectWorkflowChoice,
    isPending: isSelectChoicePending,
  } = useSelectWorkflowChoiceMutation();
  const { data: mappingRulesResponse } = useMappingRulesQuery();
  const layout = useDualPanelLayout();
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
  const mappingRules = useMemo(
    () =>
      mappingRulesResponse
        ? toChoiceMappingRules(mappingRulesResponse)
        : MAPPING_RULES,
    [mappingRulesResponse],
  );

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
  const [stagingNodeId, setStagingNodeId] = useState<string | null>(null);
  const [rootParentNodeId, setRootParentNodeId] = useState<string | null>(null);
  const [baseStagingSnapshot, setBaseStagingSnapshot] =
    useState<WizardNodeSnapshot | null>(null);
  const [actionNodeId, setActionNodeId] = useState<string | null>(null);
  const [sessionOwnedLeafNodeIds, setSessionOwnedLeafNodeIds] = useState<
    string[]
  >([]);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const resetWizardState = useCallback(() => {
    setWizardStep(null);
    setInitialDataTypeKey(null);
    setCurrentDataTypeKey(null);
    setSelectedProcessingOption(null);
    setSelectedAction(null);
    setSelectedFollowUp(null);
    setSelectedBranchConfig(null);
    setStagingNodeId(null);
    setRootParentNodeId(null);
    setBaseStagingSnapshot(null);
    setActionNodeId(null);
    setSessionOwnedLeafNodeIds([]);
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
  const stagingNode = useMemo(
    () => nodes.find((node) => node.id === stagingNodeId) ?? null,
    [nodes, stagingNodeId],
  );
  const actionNode = useMemo(
    () => nodes.find((node) => node.id === actionNodeId) ?? null,
    [actionNodeId, nodes],
  );

  const resolveNodeRole = useCallback(
    (nodeId: string): "start" | "middle" | "end" => {
      if (nodeId === startNodeId) {
        return "start";
      }
      if (nodeId === endNodeId) {
        return "end";
      }
      return "middle";
    },
    [endNodeId, startNodeId],
  );

  const createSnapshot = useCallback(
    (node: (typeof nodes)[number]): WizardNodeSnapshot => ({
      authWarning: node.data.authWarning,
      config: {
        ...node.data.config,
      } as FlowNodeData["config"],
      inputTypes: [...node.data.inputTypes],
      outputTypes: [...node.data.outputTypes],
      position: { ...node.position },
      role: resolveNodeRole(node.id),
      type: node.data.type,
    }),
    [resolveNodeRole],
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
      initialDataTypeKey
        ? buildLocalChoiceResponse(mappingRules, initialDataTypeKey)
        : null,
    [initialDataTypeKey, mappingRules],
  );
  const initialChoiceResponse = useMemo(
    () =>
      mergeChoiceResponses(serverChoiceResponse, initialLocalChoiceResponse),
    [initialLocalChoiceResponse, serverChoiceResponse],
  );
  const currentActionChoiceResponse = useMemo(
    () =>
      currentDataTypeKey
        ? buildLocalActionResponse(mappingRules, currentDataTypeKey)
        : null,
    [currentDataTypeKey, mappingRules],
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
    isUpdateNodePending ||
    isSelectChoicePending;
  const closedTransform =
    layout.mode === "stacked"
      ? `translate3d(0, ${layout.canvasHeight - layout.outputPanelTop + 24}px, 0)`
      : `translate3d(${layout.canvasWidth - layout.outputPanelLeft + 24}px, 0, 0)`;
  const transition = isOpen
    ? `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear 0ms`
    : `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear ${PANEL_TRANSITION_MS}ms`;

  const buildNodeConfig = useCallback(
    ({
      type,
      baseConfig,
      isConfigured,
      overrides,
      preserveExistingConfig = false,
    }: {
      type: NodeType;
      baseConfig?: FlowNodeData["config"];
      isConfigured: boolean;
      overrides?: Partial<FlowNodeData["config"]>;
      preserveExistingConfig?: boolean;
    }) =>
      ({
        ...(preserveExistingConfig
          ? (baseConfig ?? NODE_REGISTRY[type].defaultConfig)
          : NODE_REGISTRY[type].defaultConfig),
        ...overrides,
        isConfigured,
      }) as FlowNodeData["config"],
    [],
  );

  const syncWorkflowFromResponse = useCallback(
    (workflow: WorkflowResponse) => {
      syncWorkflowGraph(hydrateStore(workflow), {
        preserveActivePanelNodeId: true,
        preserveActivePlaceholder: true,
        preserveDirty: true,
      });
    },
    [syncWorkflowGraph],
  );

  const syncUpdatedNode = useCallback(
    (workflow: WorkflowResponse, nodeId: string) => {
      const nextNode = workflow.nodes.find((node) => node.id === nodeId);
      if (!nextNode) {
        throw new Error("node was not updated");
      }

      syncWorkflowFromResponse(workflow);
      return nextNode.id;
    },
    [syncWorkflowFromResponse],
  );

  const canSafelyDeleteWizardLeaf = useCallback(
    (nodeId: string) => {
      if (!sessionOwnedLeafNodeIds.includes(nodeId)) {
        return false;
      }

      if (nodeId === stagingNodeId) {
        return false;
      }

      if (resolveNodeRole(nodeId) !== "middle") {
        return false;
      }

      return !edges.some((edge) => edge.source === nodeId);
    },
    [edges, resolveNodeRole, sessionOwnedLeafNodeIds, stagingNodeId],
  );

  const updatePersistedNode = useCallback(
    async ({
      node,
      type,
      config,
      inputDataTypeKey,
      outputDataTypeKey,
      position,
      role,
    }: {
      node: (typeof nodes)[number];
      type: NodeType;
      config: FlowNodeData["config"];
      inputDataTypeKey?: MappingDataTypeKey | null;
      outputDataTypeKey?: MappingDataTypeKey | null;
      position?: { x: number; y: number };
      role?: "start" | "middle" | "end";
    }) => {
      if (!workflowId) {
        throw new Error("workflowId is required");
      }

      const nextWorkflow = await updateWorkflowNode({
        workflowId,
        nodeId: node.id,
        body: {
          category: toBackendNodeType(type).category,
          type: toBackendNodeType(type).type,
          config: config as unknown as Record<string, unknown>,
          position: position ?? node.position,
          dataType:
            inputDataTypeKey !== undefined
              ? inputDataTypeKey
                ? toBackendDataType(toDataType(inputDataTypeKey))
                : null
              : node.data.inputTypes[0]
                ? toBackendDataType(node.data.inputTypes[0])
                : null,
          outputDataType:
            outputDataTypeKey !== undefined
              ? outputDataTypeKey
                ? toBackendDataType(toDataType(outputDataTypeKey))
                : null
              : node.data.outputTypes[0]
                ? toBackendDataType(node.data.outputTypes[0])
                : null,
          role: role ?? resolveNodeRole(node.id),
          authWarning: node.data.authWarning ?? false,
        },
      });

      return syncUpdatedNode(nextWorkflow, node.id);
    },
    [resolveNodeRole, syncUpdatedNode, updateWorkflowNode, workflowId],
  );

  const placeWorkflowNode = useCallback(
    async ({
      type,
      sourceNodeId,
      position,
      inputDataTypeKey,
      outputDataTypeKey,
      config,
    }: {
      type: NodeType;
      sourceNodeId: string;
      position: { x: number; y: number };
      inputDataTypeKey?: MappingDataTypeKey | null;
      outputDataTypeKey: MappingDataTypeKey | null;
      config?: Partial<FlowNodeData["config"]>;
    }) => {
      if (!workflowId) {
        throw new Error("workflowId is required");
      }

      const previousNodes = useWorkflowStore.getState().nodes;
      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type,
          position,
          prevNodeId: sourceNodeId,
          config,
          inputTypes: inputDataTypeKey
            ? [toDataType(inputDataTypeKey)]
            : undefined,
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

      syncWorkflowFromResponse(nextWorkflow);
      return addedNodeId;
    },
    [addWorkflowNode, syncWorkflowFromResponse, workflowId],
  );

  const removeWorkflowNode = useCallback(
    async (nodeId: string) => {
      if (!workflowId) {
        throw new Error("workflowId is required");
      }

      const nextWorkflow = await deleteWorkflowNode({
        workflowId,
        nodeId,
      });
      syncWorkflowFromResponse(nextWorkflow);
    },
    [deleteWorkflowNode, syncWorkflowFromResponse, workflowId],
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
    setStagingNodeId(activeNode.id);
    setRootParentNodeId(parentNode.id);
    setBaseStagingSnapshot(createSnapshot(activeNode));
    setInitialDataTypeKey(mappingKey);
    setCurrentDataTypeKey(mappingKey);
  }, [
    activeNode,
    createSnapshot,
    initialDataTypeKey,
    isWizardMode,
    parentNode,
  ]);

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
    if (
      !stagingNode ||
      !rootParentNodeId ||
      !currentDataTypeKey ||
      !initialDataTypeKey
    ) {
      return;
    }

    setWizardError(null);
    setSelectedProcessingOption(option);

    try {
      const selectionResult = await selectWorkflowChoice({
        workflowId,
        prevNodeId: rootParentNodeId,
        selectedOptionId: option.id,
        dataType: currentDataTypeKey,
      });

      const nextDataTypeKey = isMappingDataTypeKey(
        mappingRules,
        selectionResult.outputDataType,
      )
        ? selectionResult.outputDataType
        : isMappingDataTypeKey(mappingRules, option.output_data_type)
          ? option.output_data_type
          : currentDataTypeKey;

      const nextActions = buildLocalActionResponse(
        mappingRules,
        nextDataTypeKey,
      );

      const nextNodeType = selectionResult.nodeType
        ? toChoiceNodeType(selectionResult.nodeType)
        : toChoiceNodeType(option.node_type);
      const isConfigured = nextActions.options.length === 0;

      await updatePersistedNode({
        node: stagingNode,
        type: nextNodeType,
        config: buildNodeConfig({
          type: nextNodeType,
          isConfigured,
        }),
        inputDataTypeKey: initialDataTypeKey,
        outputDataTypeKey: nextDataTypeKey,
        role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
      });

      openPanel(stagingNode.id);

      if (nextActions.options.length > 0) {
        setCurrentDataTypeKey(nextDataTypeKey);
        setWizardStep("action");
        return;
      }

      finishWizard();
    } catch {
      setWizardError("처리 방식을 반영하지 못했습니다.");
    }
  };

  const handleActionSelect = async (action: WizardChoiceOption) => {
    if (!stagingNode || !rootParentNodeId || !currentDataTypeKey) {
      return;
    }

    setWizardError(null);

    try {
      const selectionResult = await selectWorkflowChoice({
        workflowId,
        prevNodeId: rootParentNodeId,
        selectedOptionId: action.id,
        dataType: currentDataTypeKey,
      });

      const nextDataTypeKey = isMappingDataTypeKey(
        mappingRules,
        selectionResult.outputDataType,
      )
        ? selectionResult.outputDataType
        : isMappingDataTypeKey(mappingRules, action.output_data_type)
          ? action.output_data_type
          : currentDataTypeKey;

      const followUp = selectionResult.followUp ?? action.followUp ?? null;
      const branchConfig =
        selectionResult.branchConfig ?? action.branchConfig ?? null;

      const actionNodeType = selectionResult.nodeType
        ? toChoiceNodeType(selectionResult.nodeType)
        : toChoiceNodeType(action.node_type);
      const hasFollowUp = Boolean(followUp || branchConfig);
      const finalActionConfig = buildNodeConfig({
        type: actionNodeType,
        isConfigured: !hasFollowUp,
        overrides: hasFollowUp
          ? undefined
          : {
              choiceActionId: action.id,
              choiceSelections: null,
            },
      });
      const shouldUseActionLeaf = stagingNode.data.type === "loop";
      let targetNodeId = stagingNode.id;

      if (shouldUseActionLeaf) {
        if (actionNode) {
          await updatePersistedNode({
            node: actionNode,
            type: actionNodeType,
            config: finalActionConfig,
            inputDataTypeKey: currentDataTypeKey,
            outputDataTypeKey: nextDataTypeKey,
          });
          targetNodeId = actionNode.id;
        } else {
          const createdActionNodeId = await placeWorkflowNode({
            type: actionNodeType,
            sourceNodeId: stagingNode.id,
            position: {
              x: stagingNode.position.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
              y: stagingNode.position.y,
            },
            inputDataTypeKey: currentDataTypeKey,
            outputDataTypeKey: nextDataTypeKey,
            config: finalActionConfig,
          });

          if (!createdActionNodeId) {
            throw new Error("action node was not created");
          }

          setActionNodeId(createdActionNodeId);
          setSessionOwnedLeafNodeIds((current) =>
            current.includes(createdActionNodeId)
              ? current
              : [...current, createdActionNodeId],
          );
          targetNodeId = createdActionNodeId;
        }
      } else {
        await updatePersistedNode({
          node: stagingNode,
          type: actionNodeType,
          config: finalActionConfig,
          inputDataTypeKey: currentDataTypeKey,
          outputDataTypeKey: nextDataTypeKey,
          role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
        });
        setActionNodeId(null);
      }

      setSelectedAction(action);
      setSelectedFollowUp(followUp);
      setSelectedBranchConfig(branchConfig);
      setCurrentDataTypeKey(nextDataTypeKey);
      openPanel(targetNodeId);

      if (followUp || branchConfig) {
        setWizardStep("follow-up");
        return;
      }

      finishWizard();
    } catch {
      setWizardError("작업 노드를 반영하지 못했습니다.");
    }
  };

  const handleBackToProcessingMethod = async () => {
    if (!initialDataTypeKey || !stagingNode || !baseStagingSnapshot) {
      return;
    }

    setWizardError(null);

    try {
      if (actionNodeId && actionNode) {
        if (!canSafelyDeleteWizardLeaf(actionNode.id)) {
          setWizardError(
            "이미 후속 연결이 생겨 이전 단계로 되돌릴 수 없습니다.",
          );
          return;
        }

        await removeWorkflowNode(actionNode.id);
        setSessionOwnedLeafNodeIds((current) =>
          current.filter((nodeId) => nodeId !== actionNode.id),
        );
      }

      await updatePersistedNode({
        node: stagingNode,
        type: baseStagingSnapshot.type,
        config: baseStagingSnapshot.config,
        inputDataTypeKey: baseStagingSnapshot.inputTypes[0]
          ? toMappingKey(baseStagingSnapshot.inputTypes[0])
          : null,
        outputDataTypeKey: baseStagingSnapshot.outputTypes[0]
          ? toMappingKey(baseStagingSnapshot.outputTypes[0])
          : null,
        position: baseStagingSnapshot.position,
        role: baseStagingSnapshot.role,
      });

      openPanel(stagingNode.id);
      setActionNodeId(null);
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

  const handleBackToAction = () => {
    const targetNodeId = actionNodeId ?? stagingNodeId;
    if (!targetNodeId) {
      return;
    }

    setWizardError(null);
    openPanel(targetNodeId);
    setSelectedAction(null);
    setSelectedFollowUp(null);
    setSelectedBranchConfig(null);
    setWizardStep("action");
  };
  const handleFollowUpComplete = async (
    selections: Record<string, string | string[]>,
  ) => {
    const targetNode = actionNode ?? stagingNode;
    if (!targetNode || !selectedAction) {
      return;
    }

    setWizardError(null);

    try {
      await updatePersistedNode({
        node: targetNode,
        type: targetNode.data.type,
        config: buildNodeConfig({
          type: targetNode.data.type,
          baseConfig: targetNode.data.config,
          isConfigured: true,
          overrides: {
            choiceActionId: selectedAction.id,
            choiceSelections: selections,
          },
          preserveExistingConfig: true,
        }),
        role:
          targetNode.id === stagingNode?.id
            ? (baseStagingSnapshot?.role ?? resolveNodeRole(targetNode.id))
            : resolveNodeRole(targetNode.id),
      });

      openPanel(targetNode.id);
      finishWizard();
    } catch {
      setWizardError("후속 설정을 반영하지 못했습니다.");
    }
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
            {!canEditNodes ? (
              <Box
                p={4}
                borderRadius="xl"
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="text.secondary">
                  공유된 워크플로우는 읽기 전용입니다. 이 노드 설정은 소유자만
                  변경할 수 있습니다.
                </Text>
              </Box>
            ) : null}

            {canEditNodes &&
            wizardStep === "processing-method" &&
            initialChoiceResponse ? (
              <ProcessingMethodStep
                question={initialChoiceResponse.question}
                options={initialChoiceResponse.options}
                onSelect={(option) => void handleProcessingMethodSelect(option)}
              />
            ) : null}

            {canEditNodes &&
            wizardStep === "action" &&
            activeActionChoiceResponse ? (
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

            {canEditNodes && wizardStep === "follow-up" ? (
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
            <PanelRenderer readOnly={!canEditNodes} />
          </Box>
        </>
      )}
    </Box>
  );
};
