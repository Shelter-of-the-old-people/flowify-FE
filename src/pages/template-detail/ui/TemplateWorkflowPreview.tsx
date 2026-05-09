import { useMemo } from "react";

import { Box, Text, VStack } from "@chakra-ui/react";
import {
  Background,
  BackgroundVariant,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { FlowArrowEdge } from "@/entities/connection";
import {
  CalendarNode,
  CommunicationNode,
  ConditionNode,
  CreationMethodNode,
  DataProcessNode,
  EarlyExitNode,
  FilterNode,
  LLMNode,
  LoopNode,
  MultiOutputNode,
  NodeEditorProvider,
  NotificationNode,
  OutputFormatNode,
  PlaceholderNode,
  SpreadsheetNode,
  StorageNode,
  TriggerNode,
  WebScrapingNode,
} from "@/entities/node";

import { type TemplatePreviewGraph } from "../model";

type Props = {
  graph: TemplatePreviewGraph | null;
};

const nodeTypes = {
  communication: CommunicationNode,
  storage: StorageNode,
  spreadsheet: SpreadsheetNode,
  "web-scraping": WebScrapingNode,
  calendar: CalendarNode,
  trigger: TriggerNode,
  filter: FilterNode,
  loop: LoopNode,
  condition: ConditionNode,
  "multi-output": MultiOutputNode,
  "data-process": DataProcessNode,
  "output-format": OutputFormatNode,
  "early-exit": EarlyExitNode,
  notification: NotificationNode,
  llm: LLMNode,
  placeholder: PlaceholderNode,
  "creation-method": CreationMethodNode,
} satisfies NodeTypes;

const edgeTypes = {
  "flow-arrow": FlowArrowEdge,
} satisfies EdgeTypes;

export const TemplateWorkflowPreview = ({ graph }: Props) => {
  const contextValue = useMemo(
    () => ({
      canEditNodes: false,
      startNodeId: graph?.startNodeId ?? null,
      endNodeIds: graph?.endNodeIds ?? [],
      getBranchHeadInfo: () => null,
      getNodeStatus: () => null,
      onOpenPanel: () => {},
      onRemoveNode: () => {},
    }),
    [graph?.endNodeIds, graph?.startNodeId],
  );

  if (!graph || graph.nodes.length === 0) {
    return (
      <Box
        h="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={8}
      >
        <VStack
          gap={3}
          px={10}
          py={8}
          borderRadius="32px"
          bg="rgba(255,255,255,0.72)"
          border="1px solid"
          borderColor="whiteAlpha.700"
          backdropFilter="blur(10px)"
          boxShadow="0 18px 40px rgba(15, 23, 42, 0.08)"
          textAlign="center"
        >
          <Text fontSize="lg" fontWeight="semibold" color="text.primary">
            프리뷰를 표시할 수 없습니다
          </Text>
          <Text maxW="360px" fontSize="sm" color="text.secondary">
            템플릿에 표시 가능한 노드 정보가 아직 없습니다.
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="full" w="full" px={{ base: 4, lg: 8 }} py={{ base: 6, lg: 10 }}>
      <NodeEditorProvider value={contextValue}>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </NodeEditorProvider>
    </Box>
  );
};
