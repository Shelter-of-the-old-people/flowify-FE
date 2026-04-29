import { useCallback, useEffect, useMemo, useState } from "react";

import { NODE_REGISTRY } from "@/entities/node";
import { type FlowNodeData, type NodeType } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type WorkflowResponse,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
  useMappingRulesQuery,
  useSelectWorkflowChoiceMutation,
  useUpdateWorkflowNodeMutation,
  useWorkflowChoicesQuery,
} from "@/entities/workflow";
import {
  type ResolvedChoiceOption,
  resolveActionChoiceResponse,
  resolveInitialChoiceResponse,
  toChoiceMappingRules,
  toMappingKey,
} from "@/features/choice-panel";
import { type MappingDataTypeKey } from "@/features/choice-panel";
import {
  hydrateStore,
  isMiddleWizardPending,
  useWorkflowStore,
} from "@/features/workflow-editor";

import {
  deriveActionSelectionIntent,
  deriveProcessingMethodSelectionIntent,
} from "./choiceSelectionPipeline";
import { logChoiceWizardEvent } from "./choiceWizardLogger";
import {
  type WizardNodeSnapshot,
  canSafelyDeleteChoiceWizardLeaf,
  createChoiceWizardNodePersistence,
  toSnapshotDataTypeKey,
} from "./choiceWizardNodePersistence";

type WizardStep = "processing-method" | "action" | "follow-up";
type WizardChoiceOption = ResolvedChoiceOption;

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;
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

  const { choice: initialChoiceResponse, source: initialChoiceSource } =
    useMemo(
      () =>
        resolveInitialChoiceResponse({
          mappingRules,
          dataTypeKey: initialDataTypeKey,
          serverChoice: serverChoiceResponse,
        }),
      [initialDataTypeKey, mappingRules, serverChoiceResponse],
    );
  const activeActionChoiceResponse = useMemo(
    () =>
      resolveActionChoiceResponse({
        mappingRules,
        currentDataTypeKey,
        initialChoiceResponse,
        initialDataTypeKey,
      }),
    [
      currentDataTypeKey,
      initialChoiceResponse,
      initialDataTypeKey,
      mappingRules,
    ],
  );

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
  const { placeWorkflowNode, removeWorkflowNode, updatePersistedNode } =
    useMemo(
      () =>
        createChoiceWizardNodePersistence({
          addWorkflowNode,
          deleteWorkflowNode,
          resolveNodeRole,
          syncWorkflowFromResponse,
          updateWorkflowNode,
          workflowId,
        }),
      [
        addWorkflowNode,
        deleteWorkflowNode,
        resolveNodeRole,
        syncWorkflowFromResponse,
        updateWorkflowNode,
        workflowId,
      ],
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

    const nextStep = initialChoiceResponse.requiresProcessingMethod
      ? "processing-method"
      : "action";

    logChoiceWizardEvent({
      anchorNodeId: parentNode?.id ?? null,
      event: "wizard-open",
      nextStep,
      source: initialChoiceSource,
      step: wizardStep,
    });
    setWizardStep(nextStep);
  }, [
    initialChoiceResponse,
    initialChoiceSource,
    isWizardMode,
    parentNode?.id,
    wizardStep,
  ]);

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
          transport: {
            dataType: currentDataTypeKey,
          },
        });

        const selectionIntent = deriveProcessingMethodSelectionIntent({
          currentDataTypeKey,
          mappingRules,
          option,
          selectionResult,
        });

        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            outputDataType: selectionIntent.nextDataTypeKey,
          },
          event: "processing-method-selected",
          nextStep: selectionIntent.nextStep,
          optionId: option.id,
          step: wizardStep,
          targetNodeId: stagingNode.id,
        });

        await updatePersistedNode({
          node: stagingNode,
          type: selectionIntent.nextNodeType,
          config: buildNodeConfig({
            type: selectionIntent.nextNodeType,
            isConfigured: selectionIntent.isConfigured,
          }),
          inputDataTypeKey: initialDataTypeKey,
          outputDataTypeKey: selectionIntent.nextDataTypeKey,
          role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
        });

        openPanel(stagingNode.id);

        if (selectionIntent.nextStep === "action") {
          setCurrentDataTypeKey(selectionIntent.nextDataTypeKey);
          setWizardStep("action");
          return;
        }

        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            message: "processing-method-persist-failed",
          },
          event: "wizard-error",
          optionId: option.id,
          step: wizardStep,
          targetNodeId: stagingNode.id,
        });
        setWizardError("처리 방식을 반영하지 못했습니다.");
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
      wizardStep,
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
          transport: {
            dataType: currentDataTypeKey,
          },
        });

        const selectionIntent = deriveActionSelectionIntent({
          currentDataTypeKey,
          mappingRules,
          option: action,
          selectionResult,
          stagingNodeType: stagingNode.data.type,
        });

        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            hasFollowUp: selectionIntent.hasFollowUp,
            outputDataType: selectionIntent.nextDataTypeKey,
            shouldUseActionLeaf: selectionIntent.shouldUseActionLeaf,
          },
          event: "action-selected",
          nextStep: selectionIntent.nextStep,
          optionId: action.id,
          step: wizardStep,
        });
        const finalActionConfig = buildNodeConfig({
          type: selectionIntent.nextNodeType,
          isConfigured: !selectionIntent.hasFollowUp,
          overrides: selectionIntent.hasFollowUp
            ? undefined
            : {
                choiceActionId: action.id,
                choiceSelections: null,
              },
        });
        let targetNodeId = stagingNode.id;

        if (selectionIntent.shouldUseActionLeaf) {
          if (actionNode) {
            await updatePersistedNode({
              node: actionNode,
              type: selectionIntent.nextNodeType,
              config: finalActionConfig,
              inputDataTypeKey: currentDataTypeKey,
              outputDataTypeKey: selectionIntent.nextDataTypeKey,
            });
            targetNodeId = actionNode.id;
          } else {
            const createdActionNodeId = await placeWorkflowNode({
              type: selectionIntent.nextNodeType,
              sourceNodeId: stagingNode.id,
              position: {
                x:
                  stagingNode.position.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
                y: stagingNode.position.y,
              },
              inputDataTypeKey: currentDataTypeKey,
              outputDataTypeKey: selectionIntent.nextDataTypeKey,
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
            type: selectionIntent.nextNodeType,
            config: finalActionConfig,
            inputDataTypeKey: currentDataTypeKey,
            outputDataTypeKey: selectionIntent.nextDataTypeKey,
            role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
          });
          setActionNodeId(null);
        }

        setSelectedAction(action);
        setSelectedFollowUp(selectionIntent.followUp);
        setSelectedBranchConfig(selectionIntent.branchConfig);
        setCurrentDataTypeKey(selectionIntent.nextDataTypeKey);
        openPanel(targetNodeId);

        if (selectionIntent.nextStep === "follow-up") {
          setWizardStep("follow-up");
          return;
        }

        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            message: "action-persist-failed",
          },
          event: "wizard-error",
          optionId: action.id,
          step: wizardStep,
        });
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
      wizardStep,
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
        if (
          !canSafelyDeleteChoiceWizardLeaf({
            edges,
            nodeId: actionNode.id,
            resolveNodeRole,
            sessionOwnedLeafNodeIds,
            stagingNodeId,
          })
        ) {
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
        inputDataTypeKey: toSnapshotDataTypeKey(
          baseStagingSnapshot.inputTypes[0],
        ),
        outputDataTypeKey: toSnapshotDataTypeKey(
          baseStagingSnapshot.outputTypes[0],
        ),
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
    edges,
    initialDataTypeKey,
    openPanel,
    resolveNodeRole,
    removeWorkflowNode,
    sessionOwnedLeafNodeIds,
    stagingNode,
    stagingNodeId,
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

        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            selectionKeys: Object.keys(selections),
          },
          event: "follow-up-complete",
          nextStep: "complete",
          optionId: selectedAction.id,
          step: wizardStep,
          targetNodeId: targetNode.id,
        });
        openPanel(targetNode.id);
        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: rootParentNodeId,
          details: {
            message: "follow-up-persist-failed",
          },
          event: "wizard-error",
          optionId: selectedAction.id,
          step: wizardStep,
          targetNodeId: targetNode.id,
        });
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
      rootParentNodeId,
      selectedAction,
      stagingNode,
      updatePersistedNode,
      wizardStep,
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
