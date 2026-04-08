import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { FlowNodeData } from "@/entities/node";
import {
  OUTPUT_DATA_LABELS,
  findActionById,
  readCustomInputs,
  readSelectionSummary,
} from "@/features/choice-panel";
import { useDualPanelLayout, useWorkflowStore } from "@/shared";

const PANEL_TRANSITION_MS = 240;

export const InputPanel = () => {
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const layout = useDualPanelLayout();
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
  const activeNode = activePanelNodeId
    ? (nodes.find((node) => node.id === activePanelNodeId) ?? null)
    : null;

  const sourceNodes = activePanelNodeId
    ? edges
        .filter((edge) => edge.target === activePanelNodeId)
        .map((edge) => nodes.find((node) => node.id === edge.source))
        .filter((node): node is (typeof nodes)[number] => node != null)
    : [];

  const sourceNode = sourceNodes[0] ?? null;
  const sourceData: FlowNodeData | null = sourceNode?.data ?? null;
  const sourceMeta = sourceData ? NODE_REGISTRY[sourceData.type] : null;
  const isStartNode = activePanelNodeId === startNodeId;
  const isEndNode = activePanelNodeId === endNodeId;
  const isMiddleNode = Boolean(activeNode) && !isStartNode && !isEndNode;
  const isConfiguredMiddleNode =
    Boolean(activeNode?.data.config.isConfigured) && isMiddleNode;
  const selectedAction = findActionById(activeNode?.data.config.choiceActionId);
  const selectedOptions = readSelectionSummary(
    selectedAction,
    activeNode?.data.config.choiceSelections ?? null,
  );
  const customInputs = readCustomInputs(
    activeNode?.data.config.choiceSelections ?? null,
  );
  const closedTransform =
    layout.mode === "stacked"
      ? `translate3d(0, -${layout.inputPanelTop + layout.panelHeight + 24}px, 0)`
      : `translate3d(-${layout.inputPanelLeft + layout.panelWidth + 24}px, 0, 0)`;
  const transition = isOpen
    ? `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear 0ms`
    : `transform ${PANEL_TRANSITION_MS}ms ease, opacity ${PANEL_TRANSITION_MS}ms ease, visibility 0ms linear ${PANEL_TRANSITION_MS}ms`;

  return (
    <Box
      position="absolute"
      top={`${layout.inputPanelTop}px`}
      left={`${layout.inputPanelLeft}px`}
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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
      >
        <Box display="flex" gap={2} alignItems="center">
          {sourceMeta ? (
            <Icon
              as={sourceMeta.iconComponent}
              boxSize={6}
              color={sourceMeta.color}
            />
          ) : null}
          <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
            들어오는 데이터
          </Text>
        </Box>
        <Box cursor="pointer" onClick={closePanel}>
          <Icon as={MdCancel} boxSize={6} color="gray.600" />
        </Box>
      </Box>

      <Box flex={1} overflow="auto" p={3}>
        {sourceData ? (
          <Box>
            <Text fontSize="md" fontWeight="medium" mb={3}>
              {sourceMeta?.label ?? sourceData.label}
            </Text>
            <Text fontSize="sm" color="text.secondary">
              출력 타입:{" "}
              {sourceData.outputTypes[0]
                ? OUTPUT_DATA_LABELS[sourceData.outputTypes[0]]
                : "없음"}
            </Text>
            <Box
              mt={4}
              p={6}
              borderRadius="2xl"
              display="grid"
              gridTemplateColumns="repeat(6, 1fr)"
              gap={6}
            >
              <Text fontSize="sm" color="text.secondary" gridColumn="1 / -1">
                데이터 미리보기는 백엔드 연동 후 제공될 예정입니다.
              </Text>
            </Box>

            {isConfiguredMiddleNode && selectedAction ? (
              <Box mt={8}>
                <Text fontSize="md" fontWeight="bold" mb={3}>
                  데이터 처리 방식
                </Text>
                <Box px={4} py={4} borderRadius="2xl" bg="gray.50">
                  <Text fontSize="md" fontWeight="semibold">
                    {selectedAction.label}
                  </Text>
                  {selectedAction.description ? (
                    <Text mt={1} fontSize="sm" color="text.secondary">
                      {selectedAction.description}
                    </Text>
                  ) : null}
                </Box>
              </Box>
            ) : null}

            {isConfiguredMiddleNode && selectedOptions.length > 0 ? (
              <Box mt={8}>
                <Text fontSize="md" fontWeight="bold" mb={3}>
                  선택 옵션
                </Text>
                <Box display="flex" flexDirection="column" gap={3}>
                  {selectedOptions.map((option, index) => (
                    <Box
                      key={`${option}-${index}`}
                      px={4}
                      py={4}
                      borderRadius="2xl"
                      bg="gray.50"
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {option}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            {isConfiguredMiddleNode && customInputs.length > 0 ? (
              <Box mt={8}>
                <Text fontSize="md" fontWeight="bold" mb={3}>
                  직접 입력
                </Text>
                <Box display="flex" flexDirection="column" gap={3}>
                  {customInputs.map((input, index) => (
                    <Box
                      key={`${input}-${index}`}
                      px={4}
                      py={4}
                      borderRadius="2xl"
                      bg="gray.50"
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {input}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : isStartNode ? (
          <Box>
            <Text fontSize="md" fontWeight="medium">
              시작점
            </Text>
            <Text fontSize="sm" color="text.secondary" mt={2}>
              워크플로우의 입력 데이터가 이 지점에서 들어옵니다.
            </Text>
          </Box>
        ) : (
          <Text fontSize="sm" color="text.secondary">
            이전 노드가 연결되지 않았습니다.
          </Text>
        )}
      </Box>
    </Box>
  );
};
