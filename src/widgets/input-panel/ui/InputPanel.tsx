import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { FlowNodeData } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

export const InputPanel = () => {
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const closePanel = useWorkflowStore((state) => state.closePanel);

  const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;

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

  return (
    <Box
      position="absolute"
      top="140px"
      left="calc(50% - 838px)"
      width="690px"
      maxW="690px"
      minW="690px"
      height="800px"
      bg="white"
      border="1px solid"
      borderColor="#f2f2f2"
      borderRadius="20px"
      boxShadow="0 4px 4px rgba(0,0,0,0.25)"
      overflowY="auto"
      px={3}
      py={6}
      zIndex={5}
      transform={isOpen ? "translateX(0)" : "translateX(-100%)"}
      transition="transform 200ms ease"
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
              출력 타입: {sourceData.outputTypes.join(", ") || "없음"}
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
