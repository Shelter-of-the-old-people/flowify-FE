import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { FlowNodeData } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

/**
 * 중간 노드 클릭 시 왼쪽에 표시되는 "들어오는 데이터" 패널.
 * 이전 노드(source)의 출력 데이터 타입을 보여준다.
 */
export const InputPanel = () => {
  const activePanelNodeId = useWorkflowStore((s) => s.activePanelNodeId);
  const wizardStep = useWorkflowStore((s) => s.wizardStep);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const closePanel = useWorkflowStore((s) => s.closePanel);

  const isOpen = Boolean(activePanelNodeId) && wizardStep === null;

  // 이전 노드(들) 찾기 — 현재 노드로 들어오는 엣지의 source
  const sourceNodes = activePanelNodeId
    ? edges
        .filter((e) => e.target === activePanelNodeId)
        .map((e) => nodes.find((n) => n.id === e.source))
        .filter((n): n is (typeof nodes)[number] => n != null)
    : [];

  const sourceNode = sourceNodes[0] ?? null;
  const sourceData: FlowNodeData | null = sourceNode?.data ?? null;
  const sourceMeta = sourceData ? NODE_REGISTRY[sourceData.type] : null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="690px"
      maxW="690px"
      minW="690px"
      height="100%"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="lg"
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
      {/* 헤더 */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
      >
        <Box display="flex" gap={2} alignItems="center">
          {sourceMeta && (
            <Icon
              as={sourceMeta.iconComponent}
              boxSize={6}
              color={sourceMeta.color}
            />
          )}
          <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
            들어오는 데이터
          </Text>
        </Box>
        <Box cursor="pointer" onClick={closePanel}>
          <Icon as={MdCancel} boxSize={6} color="gray.600" />
        </Box>
      </Box>

      {/* 컨텐츠 */}
      <Box flex={1} overflow="auto" p={3}>
        {sourceData ? (
          <Box>
            <Text fontSize="md" fontWeight="medium" mb={3}>
              {sourceMeta?.label ?? sourceData.label}
            </Text>
            <Text fontSize="sm" color="text.secondary">
              출력 타입: {sourceData.outputTypes.join(", ") || "없음"}
            </Text>
            {/* TODO: 실제 데이터 미리보기는 백엔드 연동 후 구현 */}
            <Box
              mt={4}
              p={6}
              borderRadius="2xl"
              display="grid"
              gridTemplateColumns="repeat(6, 1fr)"
              gap={6}
            >
              <Text fontSize="sm" color="text.secondary" gridColumn="1 / -1">
                데이터 미리보기는 백엔드 연동 후 사용 가능합니다.
              </Text>
            </Box>
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
