import { useCallback, useEffect, useMemo, useState } from "react";

import { type FlowNodeData } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
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
  isMiddleWizardPending,
  useWorkflowStore,
} from "@/features/workflow-editor";

import {
  deriveActionSelectionIntent,
  deriveProcessingMethodSelectionIntent,
} from "./choiceSelectionPipeline";
import {
  deriveChoiceQueryContext,
  deriveChoiceSelectContext,
} from "./choiceWizardContext";
import { logChoiceWizardEvent } from "./choiceWizardLogger";
import {
  type WizardNodeSnapshot,
  canSafelyDeleteChoiceWizardLeaf,
  createChoiceWizardNodePersistence,
  toSnapshotDataTypeKey,
} from "./choiceWizardNodePersistence";
import {
  type ChoiceWizardStatePatch,
  type ChoiceWizardStep,
  createActionTransitionPatch,
  createBackToActionPatch,
  createBackToProcessingMethodPatch,
  createProcessingMethodTransitionPatch,
  resolveBackToActionTargetNodeId,
} from "./choiceWizardStateTransitions";
import {
  buildChoiceWizardNodeConfig,
  createChoiceWizardWorkflowSync,
} from "./choiceWizardWorkflowGraph";

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

  const [wizardStep, setWizardStep] = useState<ChoiceWizardStep | null>(null);
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
  const [anchorNodeId, setAnchorNodeId] = useState<string | null>(null);
  const [rootParentNodeId, setRootParentNodeId] = useState<string | null>(null);
  const [baseStagingSnapshot, setBaseStagingSnapshot] =
    useState<WizardNodeSnapshot | null>(null);
  const [actionNodeId, setActionNodeId] = useState<string | null>(null);
  const [sessionOwnedLeafNodeIds, setSessionOwnedLeafNodeIds] = useState<
    string[]
  >([]);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const applyWizardStatePatch = useCallback((patch: ChoiceWizardStatePatch) => {
    if ("actionNodeId" in patch) {
      setActionNodeId(patch.actionNodeId ?? null);
    }
    if ("currentDataTypeKey" in patch) {
      setCurrentDataTypeKey(patch.currentDataTypeKey ?? null);
    }
    if ("selectedAction" in patch) {
      setSelectedAction(patch.selectedAction ?? null);
    }
    if ("selectedBranchConfig" in patch) {
      setSelectedBranchConfig(patch.selectedBranchConfig ?? null);
    }
    if ("selectedFollowUp" in patch) {
      setSelectedFollowUp(patch.selectedFollowUp ?? null);
    }
    if ("selectedProcessingOption" in patch) {
      setSelectedProcessingOption(patch.selectedProcessingOption ?? null);
    }
    if ("wizardStep" in patch) {
      setWizardStep(patch.wizardStep ?? null);
    }
  }, []);

  const reset = useCallback(() => {
    setWizardStep(null);
    setInitialDataTypeKey(null);
    setCurrentDataTypeKey(null);
    setSelectedProcessingOption(null);
    setSelectedAction(null);
    setSelectedFollowUp(null);
    setSelectedBranchConfig(null);
    setStagingNodeId(null);
    setAnchorNodeId(null);
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
  const activeChoiceAnchorNodeId = isWizardMode
    ? (anchorNodeId ?? parentNode?.id ?? null)
    : null;
  const choiceQueryContext = useMemo(
    () =>
      deriveChoiceQueryContext({
        anchorNodeId: activeChoiceAnchorNodeId,
        edges,
        nodes,
      }),
    [activeChoiceAnchorNodeId, edges, nodes],
  );
  const getChoiceSelectContext = useCallback(
    (anchorNodeId: string | null) =>
      deriveChoiceSelectContext({
        anchorNodeId,
        edges,
        nodes,
      }),
    [edges, nodes],
  );

  const {
    data: serverChoiceResponse,
    isLoading: isChoicesLoading,
    isError: isChoicesError,
  } = useWorkflowChoicesQuery(
    workflowId || undefined,
    activeChoiceAnchorNodeId,
    choiceQueryContext,
    isWizardMode,
  );
  const allowChoiceFallback = isChoicesError && !serverChoiceResponse;
  const isInitialChoiceStep =
    wizardStep === null || wizardStep === "processing-method";

  const { choice: initialChoiceResponse, source: initialChoiceSource } =
    useMemo(
      () =>
        resolveInitialChoiceResponse({
          allowFallback: isInitialChoiceStep ? allowChoiceFallback : false,
          mappingRules,
          dataTypeKey: initialDataTypeKey,
          serverChoice: isInitialChoiceStep ? serverChoiceResponse : null,
        }),
      [
        allowChoiceFallback,
        initialDataTypeKey,
        isInitialChoiceStep,
        mappingRules,
        serverChoiceResponse,
      ],
    );
  const {
    choice: activeActionChoiceResponse,
    source: activeActionChoiceSource,
  } = useMemo(
    () =>
      resolveActionChoiceResponse({
        allowFallback: wizardStep === "action" ? allowChoiceFallback : false,
        mappingRules,
        currentDataTypeKey,
        serverChoice: wizardStep === "action" ? serverChoiceResponse : null,
      }),
    [
      allowChoiceFallback,
      currentDataTypeKey,
      mappingRules,
      serverChoiceResponse,
      wizardStep,
    ],
  );
  const isChoiceStep =
    isWizardMode &&
    (wizardStep === null ||
      wizardStep === "processing-method" ||
      wizardStep === "action");
  const currentChoiceResponse =
    wizardStep === "action"
      ? activeActionChoiceResponse
      : initialChoiceResponse;
  const hasChoiceStepContent = Boolean(currentChoiceResponse);
  const isChoiceStepLoading =
    isChoiceStep && !hasChoiceStepContent && !isChoicesError;
  const isChoiceStepUnavailable =
    isChoiceStep && !hasChoiceStepContent && isChoicesError;
  const isUsingChoiceFallback =
    (wizardStep === "action"
      ? activeActionChoiceSource
      : initialChoiceSource) === "fallback";

  const isWorkflowBusy =
    isChoicesLoading ||
    isAddNodePending ||
    isDeleteNodePending ||
    isUpdateNodePending ||
    isSelectChoicePending;

  const syncWorkflowFromResponse = useMemo(
    () => createChoiceWizardWorkflowSync(syncWorkflowGraph),
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
    setAnchorNodeId(parentNode.id);
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
      anchorNodeId: activeChoiceAnchorNodeId,
      event: "wizard-open",
      nextStep,
      source: initialChoiceSource,
      step: wizardStep,
    });
    setWizardStep(nextStep);
  }, [
    initialChoiceResponse,
    initialChoiceSource,
    activeChoiceAnchorNodeId,
    isWizardMode,
    wizardStep,
  ]);

  const finishWizard = useCallback(() => {
    reset();
  }, [reset]);

  const selectProcessingMethod = useCallback(
    async (option: WizardChoiceOption) => {
      const currentAnchorNodeId = anchorNodeId ?? rootParentNodeId;
      if (
        !stagingNode ||
        !currentAnchorNodeId ||
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
          prevNodeId: currentAnchorNodeId,
          optionId: option.id,
          context: getChoiceSelectContext(currentAnchorNodeId),
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
          anchorNodeId: currentAnchorNodeId,
          details: {
            outputDataType: selectionIntent.nextDataTypeKey,
          },
          event: "processing-method-selected",
          nextStep: selectionIntent.nextStep,
          optionId: option.id,
          step: wizardStep,
          targetNodeId: stagingNode.id,
        });

        const updatedNodeId = await updatePersistedNode({
          node: stagingNode,
          type: selectionIntent.nextNodeType,
          config: buildChoiceWizardNodeConfig({
            type: selectionIntent.nextNodeType,
            isConfigured: selectionIntent.isConfigured,
          }),
          inputDataTypeKey: initialDataTypeKey,
          outputDataTypeKey: selectionIntent.nextDataTypeKey,
          role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
        });

        setAnchorNodeId(updatedNodeId);
        openPanel(stagingNode.id);

        applyWizardStatePatch(
          createProcessingMethodTransitionPatch({
            option,
            nextDataTypeKey: selectionIntent.nextDataTypeKey,
            nextStep: selectionIntent.nextStep,
          }),
        );

        if (selectionIntent.nextStep === "action") {
          return;
        }

        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: currentAnchorNodeId,
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
      anchorNodeId,
      baseStagingSnapshot?.role,
      currentDataTypeKey,
      finishWizard,
      getChoiceSelectContext,
      initialDataTypeKey,
      mappingRules,
      applyWizardStatePatch,
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
      const currentAnchorNodeId = anchorNodeId ?? rootParentNodeId;
      if (!stagingNode || !currentAnchorNodeId || !currentDataTypeKey) {
        return;
      }

      setWizardError(null);

      try {
        const selectionResult = await selectWorkflowChoice({
          workflowId,
          prevNodeId: currentAnchorNodeId,
          optionId: action.id,
          context: getChoiceSelectContext(currentAnchorNodeId),
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
          anchorNodeId: currentAnchorNodeId,
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
        const finalActionConfig = buildChoiceWizardNodeConfig({
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
            setAnchorNodeId(actionNode.id);
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
              previousNodes: nodes,
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
            setAnchorNodeId(createdActionNodeId);
          }
        } else {
          const updatedNodeId = await updatePersistedNode({
            node: stagingNode,
            type: selectionIntent.nextNodeType,
            config: finalActionConfig,
            inputDataTypeKey: currentDataTypeKey,
            outputDataTypeKey: selectionIntent.nextDataTypeKey,
            role: baseStagingSnapshot?.role ?? resolveNodeRole(stagingNode.id),
          });
          setActionNodeId(null);
          setAnchorNodeId(updatedNodeId);
        }

        applyWizardStatePatch(
          createActionTransitionPatch({
            action,
            branchConfig: selectionIntent.branchConfig,
            followUp: selectionIntent.followUp,
            nextDataTypeKey: selectionIntent.nextDataTypeKey,
            nextStep: selectionIntent.nextStep,
          }),
        );
        openPanel(targetNodeId);

        if (selectionIntent.nextStep === "follow-up") {
          return;
        }

        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: currentAnchorNodeId,
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
      anchorNodeId,
      baseStagingSnapshot?.role,
      currentDataTypeKey,
      finishWizard,
      getChoiceSelectContext,
      mappingRules,
      applyWizardStatePatch,
      nodes,
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

      setAnchorNodeId(rootParentNodeId);
      openPanel(stagingNode.id);
      applyWizardStatePatch(
        createBackToProcessingMethodPatch({
          initialDataTypeKey,
        }),
      );
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
    applyWizardStatePatch,
    resolveNodeRole,
    removeWorkflowNode,
    rootParentNodeId,
    sessionOwnedLeafNodeIds,
    stagingNode,
    stagingNodeId,
    updatePersistedNode,
  ]);

  const backToAction = useCallback(() => {
    const targetNodeId = resolveBackToActionTargetNodeId({
      actionNodeId,
      stagingNodeId,
    });
    if (!targetNodeId) {
      return;
    }

    setWizardError(null);
    setAnchorNodeId(targetNodeId);
    openPanel(targetNodeId);
    applyWizardStatePatch(createBackToActionPatch());
  }, [actionNodeId, applyWizardStatePatch, openPanel, stagingNodeId]);

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
          config: buildChoiceWizardNodeConfig({
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
          anchorNodeId: anchorNodeId ?? rootParentNodeId,
          details: {
            selectionKeys: Object.keys(selections),
          },
          event: "follow-up-complete",
          nextStep: "complete",
          optionId: selectedAction.id,
          step: wizardStep,
          targetNodeId: targetNode.id,
        });
        setAnchorNodeId(targetNode.id);
        openPanel(targetNode.id);
        finishWizard();
      } catch {
        logChoiceWizardEvent({
          anchorNodeId: anchorNodeId ?? rootParentNodeId,
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
      anchorNodeId,
      baseStagingSnapshot?.role,
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
    isChoiceStepLoading,
    isChoiceStepUnavailable,
    isUsingChoiceFallback,
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
