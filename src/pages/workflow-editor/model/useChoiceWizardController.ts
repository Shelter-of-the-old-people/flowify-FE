import { useCallback, useEffect, useMemo, useState } from "react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  type DataType,
  type FlowNodeData,
  type NodeType,
} from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
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
  type ResolvedChoiceOption,
  type ResolvedChoiceResponse,
  buildFallbackChoiceResponse,
  resolveChoiceResponse,
  toChoiceMappingRules,
  toDataType,
  toMappingKey,
} from "@/features/choice-panel";
import {
  type MappingDataTypeKey,
  type MappingRules,
} from "@/features/choice-panel";
import {
  hydrateStore,
  isMiddleWizardPending,
  useWorkflowStore,
} from "@/features/workflow-editor";

type WizardStep = "processing-method" | "action" | "follow-up";
type WizardChoiceOption = ResolvedChoiceOption;
type WizardChoiceResponse = ResolvedChoiceResponse;

type WizardNodeSnapshot = {
  authWarning?: boolean;
  config: FlowNodeData["config"];
  inputTypes: DataType[];
  outputTypes: DataType[];
  position: { x: number; y: number };
  role: "start" | "middle" | "end";
  type: NodeType;
};

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;

const isMappingDataTypeKey = (
  mappingRules: MappingRules,
  value: string | null | undefined,
): value is MappingDataTypeKey =>
  Boolean(value && value in mappingRules.data_types);

const mergeChoiceResponses = (
  primary: ChoiceResponse | null | undefined,
  fallback: WizardChoiceResponse | null,
): WizardChoiceResponse | null =>
  resolveChoiceResponse({
    serverChoice: primary,
    fallbackChoice: fallback,
  });

const buildLocalChoiceResponse = (
  mappingRules: MappingRules,
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse =>
  buildFallbackChoiceResponse(mappingRules, dataTypeKey, "initial");

const buildLocalActionResponse = (
  mappingRules: MappingRules,
  dataTypeKey: MappingDataTypeKey,
): WizardChoiceResponse =>
  buildFallbackChoiceResponse(mappingRules, dataTypeKey, "action");

const toChoiceNodeType = (value: string | null | undefined): NodeType =>
  value && value in MAPPING_NODE_TYPE_MAP
    ? MAPPING_NODE_TYPE_MAP[value as keyof typeof MAPPING_NODE_TYPE_MAP]
    : "data-process";
export const useChoiceWizardController = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const openPanel = useWorkflowStore((state) => state.openPanel);

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

  const mappingRules = useMemo(
    () => toChoiceMappingRules(mappingRulesResponse),
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

  const reset = useCallback(() => {
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

  const isWizardMode = isMiddleWizardPending(
    activeNode,
    startNodeId,
    endNodeId,
  );

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

  const isWorkflowBusy =
    isChoicesLoading ||
    isAddNodePending ||
    isDeleteNodePending ||
    isUpdateNodePending ||
    isSelectChoicePending;

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

  const finishWizard = useCallback(() => {
    reset();
  }, [reset]);

  const selectProcessingMethod = useCallback(
    async (option: WizardChoiceOption) => {
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
          optionId: option.id,
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
        setWizardError("泥섎━ 諛⑹떇??諛섏쁺?섏? 紐삵뻽?듬땲??");
      }
    },
    [
      baseStagingSnapshot?.role,
      buildNodeConfig,
      currentDataTypeKey,
      finishWizard,
      initialDataTypeKey,
      mappingRules,
      openPanel,
      resolveNodeRole,
      rootParentNodeId,
      selectWorkflowChoice,
      stagingNode,
      updatePersistedNode,
      workflowId,
    ],
  );

  const selectAction = useCallback(
    async (action: WizardChoiceOption) => {
      if (!stagingNode || !rootParentNodeId || !currentDataTypeKey) {
        return;
      }

      setWizardError(null);

      try {
        const selectionResult = await selectWorkflowChoice({
          workflowId,
          prevNodeId: rootParentNodeId,
          optionId: action.id,
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
                x:
                  stagingNode.position.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
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
    },
    [
      actionNode,
      baseStagingSnapshot?.role,
      buildNodeConfig,
      currentDataTypeKey,
      finishWizard,
      mappingRules,
      openPanel,
      placeWorkflowNode,
      resolveNodeRole,
      rootParentNodeId,
      selectWorkflowChoice,
      stagingNode,
      updatePersistedNode,
      workflowId,
    ],
  );

  const backToProcessingMethod = useCallback(async () => {
    if (!initialDataTypeKey || !stagingNode || !baseStagingSnapshot) {
      return;
    }

    setWizardError(null);

    try {
      if (actionNodeId && actionNode) {
        if (!canSafelyDeleteWizardLeaf(actionNode.id)) {
          setWizardError(
            "이미 후속 연결이 생겨 이전 단계로 되돌리지 못합니다.",
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
  }, [
    actionNode,
    actionNodeId,
    baseStagingSnapshot,
    canSafelyDeleteWizardLeaf,
    initialDataTypeKey,
    openPanel,
    removeWorkflowNode,
    stagingNode,
    updatePersistedNode,
  ]);

  const backToAction = useCallback(() => {
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
  }, [actionNodeId, openPanel, stagingNodeId]);

  const completeFollowUp = useCallback(
    async (selections: Record<string, string | string[]>) => {
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
    },
    [
      actionNode,
      baseStagingSnapshot?.role,
      buildNodeConfig,
      finishWizard,
      openPanel,
      resolveNodeRole,
      selectedAction,
      stagingNode,
      updatePersistedNode,
    ],
  );

  return {
    isWizardMode,
    wizardStep,
    initialChoiceResponse,
    activeActionChoiceResponse,
    selectedProcessingOption,
    selectedFollowUp,
    selectedBranchConfig,
    wizardError,
    isWorkflowBusy,
    isChoicesError,
    serverChoiceResponse,
    selectProcessingMethod,
    selectAction,
    backToProcessingMethod,
    backToAction,
    completeFollowUp,
    reset,
  };
};
