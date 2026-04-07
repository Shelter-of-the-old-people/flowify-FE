import { useCallback, useEffect, useState } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { DataType, NodeMeta } from "@/entities/node";
import { useAddNode } from "@/features/add-node";
import { useWorkflowStore } from "@/shared";

import {
  MAPPING_NODE_TYPE_MAP,
  MAPPING_RULES,
  toDataType,
  toMappingKey,
} from "../model";
import type {
  MappingAction,
  MappingDataTypeKey,
  ProcessingMethodOption,
} from "../model";

import { ActionStep } from "./ActionStep";
import { FollowUpStep } from "./FollowUpStep";
import { ProcessingMethodStep } from "./ProcessingMethodStep";

type ChoiceStep = "processing-method" | "action" | "follow-up";

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;

interface ChoicePanelContentProps {
  placeholderId: string;
  parentNodeId: string;
  position: { x: number; y: number };
  initialDataTypeKey: MappingDataTypeKey;
  onClose: () => void;
}

const ChoicePanelContent = ({
  placeholderId,
  parentNodeId,
  position,
  initialDataTypeKey,
  onClose,
}: ChoicePanelContentProps) => {
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { addNode } = useAddNode();

  const [step, setStep] = useState<ChoiceStep>(() =>
    MAPPING_RULES.data_types[initialDataTypeKey].requires_processing_method
      ? "processing-method"
      : "action",
  );
  const [currentDataTypeKey, setCurrentDataTypeKey] =
    useState<MappingDataTypeKey>(initialDataTypeKey);
  const [selectedProcessingOption, setSelectedProcessingOption] =
    useState<ProcessingMethodOption | null>(null);
  const [selectedAction, setSelectedAction] = useState<MappingAction | null>(
    null,
  );
  const [processingNodeId, setProcessingNodeId] = useState<string | null>(null);
  const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);

  const resetChoice = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOverlayClose = useCallback(() => {
    resetChoice();
  }, [resetChoice]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOverlayClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOverlayClose, placeholderId]);

  const dataType = MAPPING_RULES.data_types[currentDataTypeKey];

  const title = dataType?.label ?? "선택";

  const placeNode = useCallback(
    ({
      meta,
      sourceNodeId,
      nodePosition,
      outputDataType,
    }: {
      meta: NodeMeta;
      sourceNodeId: string;
      nodePosition: { x: number; y: number };
      outputDataType?: DataType;
    }) => {
      const nodeId = addNode(meta.type, {
        position: nodePosition,
        outputTypes: outputDataType ? [outputDataType] : undefined,
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

  const handleProcessingMethodSelect = (option: ProcessingMethodOption) => {
    setSelectedProcessingOption(option);
    setCurrentDataTypeKey(option.output_data_type);

    let nextSourceNodeId = parentNodeId;

    if (option.node_type) {
      const frontendNodeType = MAPPING_NODE_TYPE_MAP[option.node_type];
      const meta = NODE_REGISTRY[frontendNodeType];
      const nodeId = placeNode({
        meta,
        sourceNodeId: parentNodeId,
        nodePosition: position,
        outputDataType: toDataType(option.output_data_type),
      });

      updateNodeConfig(nodeId, {});
      setProcessingNodeId(nodeId);
      nextSourceNodeId = nodeId;
    } else {
      setProcessingNodeId(null);
    }

    const nextDataType = MAPPING_RULES.data_types[option.output_data_type];
    if (nextDataType.actions.length === 0) {
      if (option.node_type) {
        resetChoice();
        openPanel(nextSourceNodeId);
        return;
      }

      handleOverlayClose();
      return;
    }

    setStep("action");
  };

  const handleActionSelect = (action: MappingAction) => {
    setSelectedAction(action);

    const frontendNodeType = MAPPING_NODE_TYPE_MAP[action.node_type];
    const meta = NODE_REGISTRY[frontendNodeType];
    const nodeId = placeNode({
      meta,
      sourceNodeId: processingNodeId ?? parentNodeId,
      nodePosition: processingNodeId
        ? {
            x: position.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
            y: position.y,
          }
        : position,
      outputDataType: toDataType(action.output_data_type),
    });
    setPlacedNodeId(nodeId);

    if (action.follow_up || action.branch_config) {
      setStep("follow-up");
      return;
    }

    updateNodeConfig(nodeId, {
      choiceActionId: action.id,
      choiceSelections: null,
    });
    resetChoice();
    openPanel(nodeId);
  };

  const handleBackToProcessingMethod = () => {
    if (processingNodeId) {
      removeNode(processingNodeId);
      setProcessingNodeId(null);
    }

    setCurrentDataTypeKey(initialDataTypeKey);
    setSelectedProcessingOption(null);
    setSelectedAction(null);
    setPlacedNodeId(null);
    setStep("processing-method");
  };

  const handleBackToAction = () => {
    if (placedNodeId) {
      removeNode(placedNodeId);
      setPlacedNodeId(null);
    }

    setSelectedAction(null);
    setStep("action");
  };

  const handleFollowUpComplete = (
    selections: Record<string, string | string[]>,
  ) => {
    if (!placedNodeId || !selectedAction) return;

    updateNodeConfig(placedNodeId, {
      choiceActionId: selectedAction.id,
      choiceSelections: selections,
    });
    resetChoice();
    openPanel(placedNodeId);
  };

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={20}
      display="flex"
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
      <Box
        pointerEvents="auto"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="2xl"
        boxShadow="lg"
        p={10}
        w="full"
        maxW="820px"
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={8}
        >
          <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
            {title}
          </Text>
          <Box cursor="pointer" onClick={handleOverlayClose}>
            <Icon as={MdCancel} boxSize={6} color="gray.600" />
          </Box>
        </Box>

        {step === "processing-method" && dataType.processing_method ? (
          <ProcessingMethodStep
            processingMethod={dataType.processing_method}
            onSelect={handleProcessingMethodSelect}
          />
        ) : null}

        {step === "action" ? (
          <ActionStep
            actions={dataType.actions}
            onSelect={handleActionSelect}
            onBack={
              selectedProcessingOption
                ? handleBackToProcessingMethod
                : undefined
            }
          />
        ) : null}

        {step === "follow-up" && selectedAction ? (
          <FollowUpStep
            followUp={selectedAction.follow_up ?? null}
            branchConfig={selectedAction.branch_config ?? null}
            onComplete={handleFollowUpComplete}
            onBack={handleBackToAction}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export const ChoicePanel = () => {
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const nodes = useWorkflowStore((state) => state.nodes);
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );

  const isMiddlePlaceholder =
    activePlaceholder !== null &&
    activePlaceholder.id !== "placeholder-start" &&
    activePlaceholder.id !== "placeholder-end";

  const parentNodeId = isMiddlePlaceholder
    ? activePlaceholder.id.replace("placeholder-", "")
    : null;
  const parentNode = parentNodeId
    ? (nodes.find((node) => node.id === parentNodeId) ?? null)
    : null;
  const parentOutputType = parentNode?.data.outputTypes[0] ?? null;

  if (
    !isMiddlePlaceholder ||
    !activePlaceholder ||
    !parentNodeId ||
    !parentOutputType
  ) {
    return null;
  }

  return (
    <ChoicePanelContent
      key={activePlaceholder.id}
      placeholderId={activePlaceholder.id}
      parentNodeId={parentNodeId}
      position={activePlaceholder.position}
      initialDataTypeKey={toMappingKey(parentOutputType)}
      onClose={() => setActivePlaceholder(null)}
    />
  );
};
