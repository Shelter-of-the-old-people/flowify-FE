import { MdCancel } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";

import {
  CATEGORY_SERVICE_MAP,
  SERVICE_REQUIREMENTS,
  type ServiceRequirement,
} from "@/features/add-node";
import { PanelRenderer } from "@/features/configure-node";
import { useWorkflowStore } from "@/shared";

const WizardRequirementContent = ({
  requirements,
  onSelect,
  onBack,
}: {
  requirements: ServiceRequirement[];
  onSelect: (req: ServiceRequirement) => void;
  onBack: () => void;
}) => (
  <Box p={6}>
    <Box
      mb={4}
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      onClick={onBack}
    >
      <Text fontSize="sm" color="text.secondary">
        뒤로
      </Text>
    </Box>

    <Box display="flex" flexDirection="column" gap={4}>
      {requirements.map((req) => (
        <Box
          key={req.id}
          display="flex"
          gap={3}
          alignItems="center"
          cursor="pointer"
          px={6}
          py={4}
          borderRadius="3xl"
          _hover={{ bg: "gray.50" }}
          transition="background 150ms ease"
          onClick={() => onSelect(req)}
        >
          <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <Icon as={req.iconComponent} boxSize={6} />
          </Box>
          <Text fontSize="md" fontWeight="bold">
            {req.label}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
);

const WizardAuthContent = ({
  onAuth,
  onBack,
}: {
  onAuth: () => void;
  onBack: () => void;
}) => (
  <Box p={6}>
    <Box
      mb={4}
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      onClick={onBack}
    >
      <Text fontSize="sm" color="text.secondary">
        뒤로
      </Text>
    </Box>

    <Text fontSize="md" mb={6}>
      인증은 가장 처음 한 번만 진행됩니다.
    </Text>

    <Box
      border="1px solid"
      borderColor="gray.200"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={16}
      py={3}
      cursor="pointer"
      _hover={{ bg: "gray.50" }}
      transition="background 150ms ease"
      onClick={onAuth}
    >
      <Text fontSize="md" fontWeight="semibold">
        구글 계정으로 인증하기
      </Text>
    </Box>
  </Box>
);

/**
 * 중간 노드 클릭 시 오른쪽에 표시되는 "설정" 패널.
 * 위자드 진행 중에는 requirement/auth 콘텐츠를 렌더링하고,
 * 기본 상태에서는 PanelRenderer를 통해 노드별 설정 UI를 렌더링한다.
 */
export const OutputPanel = () => {
  const activePanelNodeId = useWorkflowStore((s) => s.activePanelNodeId);
  const activeNode = useWorkflowStore(
    (s) => s.nodes.find((node) => node.id === s.activePanelNodeId) ?? null,
  );
  const nodes = useWorkflowStore((s) => s.nodes);
  const closePanel = useWorkflowStore((s) => s.closePanel);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const wizardStep = useWorkflowStore((s) => s.wizardStep);
  const wizardConfigPreset = useWorkflowStore((s) => s.wizardConfigPreset);
  const wizardSourcePlaceholder = useWorkflowStore(
    (s) => s.wizardSourcePlaceholder,
  );
  const setActivePlaceholder = useWorkflowStore((s) => s.setActivePlaceholder);
  const setWizardStep = useWorkflowStore((s) => s.setWizardStep);
  const setWizardConfigPreset = useWorkflowStore(
    (s) => s.setWizardConfigPreset,
  );
  const setWizardSourcePlaceholder = useWorkflowStore(
    (s) => s.setWizardSourcePlaceholder,
  );
  const isOpen = Boolean(activePanelNodeId);
  const requirementGroup = activeNode
    ? SERVICE_REQUIREMENTS[activeNode.data.type]
    : undefined;

  const getHeaderTitle = () => {
    switch (wizardStep) {
      case "requirement":
        return requirementGroup?.title ?? "설정";
      case "auth":
        return "인증";
      default:
        return "설정";
    }
  };

  const finishWizard = () => {
    setWizardConfigPreset(null);
    setWizardStep(null);
    setWizardSourcePlaceholder(null);
  };

  const handleRequirementSelect = (req: ServiceRequirement) => {
    if (!activePanelNodeId || !activeNode) return;

    const serviceGroup = CATEGORY_SERVICE_MAP[activeNode.data.type];
    if (serviceGroup?.requiresAuth) {
      setWizardConfigPreset(req.configPreset);
      setWizardStep("auth");
      return;
    }

    updateNodeConfig(activePanelNodeId, {
      ...activeNode.data.config,
      ...req.configPreset,
    });
    finishWizard();
  };

  const handleAuth = () => {
    if (!activePanelNodeId || !wizardConfigPreset) return;

    const currentNode = nodes.find((node) => node.id === activePanelNodeId);
    if (currentNode) {
      updateNodeConfig(activePanelNodeId, {
        ...currentNode.data.config,
        ...wizardConfigPreset,
      });
    }

    finishWizard();
  };

  const handleBackToService = () => {
    const sourcePlaceholder = wizardSourcePlaceholder;

    if (activePanelNodeId) {
      removeNode(activePanelNodeId);
    }

    setWizardStep(null);
    setWizardConfigPreset(null);
    closePanel();
    setActivePlaceholder(sourcePlaceholder);
    setWizardSourcePlaceholder(null);
  };

  const handleBackToRequirement = () => {
    setWizardStep("requirement");
    setWizardConfigPreset(null);
  };

  const handleClose = () => {
    if (wizardStep !== null) {
      setWizardStep(null);
      setWizardConfigPreset(null);
      setWizardSourcePlaceholder(null);
    }

    closePanel();
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
        <Box cursor="pointer" onClick={handleClose}>
          <Icon as={MdCancel} boxSize={6} color="gray.600" />
        </Box>
      </Box>

      <Box flex={1} overflow="auto">
        {wizardStep === "requirement" && requirementGroup ? (
          <WizardRequirementContent
            requirements={requirementGroup.requirements}
            onSelect={handleRequirementSelect}
            onBack={handleBackToService}
          />
        ) : null}

        {wizardStep === "auth" ? (
          <WizardAuthContent
            onAuth={handleAuth}
            onBack={handleBackToRequirement}
          />
        ) : null}

        {wizardStep === null ? <PanelRenderer /> : null}
      </Box>
    </Box>
  );
};
