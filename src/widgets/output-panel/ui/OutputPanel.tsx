import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import { SERVICE_REQUIREMENTS } from "@/features/add-node";
import type { ServiceRequirement } from "@/features/add-node";
import { PanelRenderer } from "@/features/configure-node";
import { useWorkflowStore } from "@/shared";

const RequirementSelector = ({
  requirements,
  onSelect,
}: {
  requirements: ServiceRequirement[];
  onSelect: (requirement: ServiceRequirement) => void;
}) => (
  <Box p={6}>
    <Box display="flex" flexDirection="column" gap={4}>
      {requirements.map((requirement) => (
        <Box
          key={requirement.id}
          display="flex"
          gap={3}
          alignItems="center"
          cursor="pointer"
          px={6}
          py={4}
          borderRadius="3xl"
          _hover={{ bg: "gray.50" }}
          transition="background 150ms ease"
          onClick={() => onSelect(requirement)}
        >
          <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <Icon as={requirement.iconComponent} boxSize={6} />
          </Box>
          <Text fontSize="md" fontWeight="bold">
            {requirement.label}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
);

export const OutputPanel = () => {
  const activePanelNodeId = useWorkflowStore(
    (state) => state.activePanelNodeId,
  );
  const activeNode = useWorkflowStore(
    (state) =>
      state.nodes.find((node) => node.id === state.activePanelNodeId) ?? null,
  );
  const closePanel = useWorkflowStore((state) => state.closePanel);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const isOpen = Boolean(activePanelNodeId);
  const requirementGroup = activeNode
    ? SERVICE_REQUIREMENTS[activeNode.data.type]
    : undefined;
  const isConfigured = activeNode?.data.config.isConfigured ?? false;

  const getHeaderTitle = () => {
    if (!isConfigured && requirementGroup) {
      return requirementGroup.title;
    }

    return "설정";
  };

  const handleRequirementSelect = (requirement: ServiceRequirement) => {
    if (!activePanelNodeId) return;

    updateNodeConfig(activePanelNodeId, requirement.configPreset);
  };

  return (
    <Box
      position="absolute"
      top={0}
      right={0}
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
      transform={isOpen ? "translateX(0)" : "translateX(100%)"}
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
        <Text fontSize="xl" fontWeight="medium" letterSpacing="-0.4px">
          {getHeaderTitle()}
        </Text>
        <Box cursor="pointer" onClick={closePanel}>
          <Icon as={MdCancel} boxSize={6} color="gray.600" />
        </Box>
      </Box>

      <Box flex={1} overflow="auto">
        {!isConfigured && requirementGroup ? (
          <RequirementSelector
            requirements={requirementGroup.requirements}
            onSelect={handleRequirementSelect}
          />
        ) : (
          <PanelRenderer />
        )}
      </Box>
    </Box>
  );
};
