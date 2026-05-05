import { useMemo } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  getNodeStatusMissingFieldLabel,
  useMappingRulesQuery,
} from "@/entities/workflow";
import {
  findActionById,
  readCustomInputs,
  readSelectionSummary,
  toChoiceMappingRules,
} from "@/features/choice-panel";
import {
  isMiddleWizardCompleted,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { useDualPanelLayout } from "@/shared";
import {
  DataPreviewBlock,
  DataStateNotice,
  NodeExecutionStatusBlock,
  SchemaPreviewBlock,
  SourceSummaryBlock,
  isEmptyPanelData,
  useNodeDataPanelModel,
} from "@/widgets/node-data-panel";

const PANEL_TRANSITION_MS = 240;

export const InputPanel = () => {
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const canViewExecutionData = useWorkflowStore(
    (state) => state.editorCapabilities.canRunWorkflow,
  );
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const layout = useDualPanelLayout();
  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
  const { data: mappingRulesResponse } = useMappingRulesQuery();
  const mappingRules = useMemo(
    () => toChoiceMappingRules(mappingRulesResponse),
    [mappingRulesResponse],
  );
  const nodeDataPanel = useNodeDataPanelModel({
    panelKind: "input",
    workflowId: workflowId || undefined,
    nodeId: activePanelNodeId,
    canViewExecutionData,
    isWorkflowDirty: isDirty,
  });
  const { activeNode, sourceNode, isStartNode, isEndNode } = nodeDataPanel;
  const sourceData = sourceNode?.data ?? null;
  const sourceMeta = sourceData ? NODE_REGISTRY[sourceData.type] : null;
  const isMiddleNode = Boolean(activeNode) && !isStartNode && !isEndNode;
  const storeNodeStatus = activePanelNodeId
    ? (nodeStatuses[activePanelNodeId] ?? null)
    : null;
  const activeNodeStatus =
    nodeDataPanel.schemaPreview?.nodeStatus ?? storeNodeStatus;
  const isConfiguredMiddleNode =
    isMiddleNode && isMiddleWizardCompleted(activeNode);
  const activeNodeMissingFields = (activeNodeStatus?.missingFields ?? []).map(
    getNodeStatusMissingFieldLabel,
  );
  const activeNodeConfig =
    (activeNode?.data.config as unknown as Record<string, unknown>) ?? null;
  const selectedAction = findActionById(
    mappingRules,
    activeNode?.data.config.choiceActionId,
  );
  const selectedOptions = readSelectionSummary(
    selectedAction,
    activeNode?.data.config.choiceSelections ?? null,
  );
  const customInputs = readCustomInputs(
    activeNode?.data.config.choiceSelections ?? null,
  );
  const hasPreviewData = !isEmptyPanelData(nodeDataPanel.dataToDisplay);
  const shouldShowSchemaPreview =
    nodeDataPanel.state !== "data-ready" &&
    nodeDataPanel.schemaToDisplay !== null &&
    !nodeDataPanel.isSchemaPreviewLoading;
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
        {activeNode ? (
          <Box display="flex" flexDirection="column" gap={6}>
            <Box>
              <Text fontSize="md" fontWeight="medium" mb={3}>
                {sourceMeta?.label ?? (isStartNode ? "시작점" : "이전 노드")}
              </Text>
              {sourceData ? (
                <Text fontSize="sm" color="text.secondary">
                  출력 타입: {nodeDataPanel.staticInputLabel ?? "없음"}
                </Text>
              ) : isStartNode ? (
                <Text fontSize="sm" color="text.secondary">
                  워크플로우의 입력 데이터가 이 지점에서 들어옵니다.
                </Text>
              ) : (
                <Text fontSize="sm" color="text.secondary">
                  이전 노드가 연결되지 않았습니다.
                </Text>
              )}
            </Box>

            <Box display="flex" flexDirection="column" gap={4}>
              {isStartNode ? (
                <SourceSummaryBlock
                  config={activeNodeConfig}
                  source={nodeDataPanel.schemaPreview?.source ?? null}
                />
              ) : null}
              <DataStateNotice
                state={nodeDataPanel.state}
                panelKind="input"
                executionData={nodeDataPanel.executionData}
                isStaleAgainstCurrentEditor={
                  nodeDataPanel.isStaleAgainstCurrentEditor
                }
              />
              {hasPreviewData ? (
                <DataPreviewBlock
                  title="입력 데이터"
                  data={nodeDataPanel.dataToDisplay}
                />
              ) : null}
              {shouldShowSchemaPreview ? (
                <SchemaPreviewBlock
                  title="예상 입력 구조"
                  schema={nodeDataPanel.schemaToDisplay}
                />
              ) : null}
            </Box>

            {isConfiguredMiddleNode && selectedAction ? (
              <Box>
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
              <Box>
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
              <Box>
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

            {nodeDataPanel.executionData ? (
              <NodeExecutionStatusBlock
                executionData={nodeDataPanel.executionData}
              />
            ) : null}

            {activeNodeStatus ? (
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={3}>
                  설정 상태
                </Text>
                <Box bg="gray.50" borderRadius="2xl" px={4} py={4}>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>
                    {activeNodeStatus.configured ? "설정 완료" : "설정 필요"}
                  </Text>
                  <Text color="text.secondary" fontSize="sm">
                    실행 가능: {activeNodeStatus.executable ? "예" : "아니오"}
                  </Text>
                  {activeNodeMissingFields.length > 0 ? (
                    <Text color="text.secondary" fontSize="sm" mt={2}>
                      확인 항목: {activeNodeMissingFields.join(", ")}
                    </Text>
                  ) : null}
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : (
          <Text fontSize="sm" color="text.secondary">
            노드를 선택하면 들어오는 데이터를 확인할 수 있습니다.
          </Text>
        )}
      </Box>
    </Box>
  );
};
