import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type ReactNode } from "react";
import { MdArrowBack, MdCancel, MdSearch } from "react-icons/md";

import { Box, Grid, Icon, Input, Text, VStack } from "@chakra-ui/react";
import { useReactFlow, useViewport } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  findAddedNodeId,
  toFlowNode,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
} from "@/entities/workflow";
import { type FlowNodeData, type NodeMeta } from "@/entities/node";
import { useWorkflowStore } from "@/features/workflow-editor";

import { CATEGORY_SERVICE_MAP } from "../model/serviceMap";
import { type ServiceOption } from "../model/serviceMap";
import {
  SERVICE_REQUIREMENTS,
  type ServiceRequirement,
} from "../model/serviceRequirements";

type WizardStep = "category" | "service" | "requirement" | "auth";

const allNodeEntries = Object.values(NODE_REGISTRY);
const WIZARD_CARD_BORDER = "#f2f2f2";
const START_END_PANEL_GAP = 48;
const PLACEHOLDER_NODE_WIDTH = 100;
const START_END_NODE_WIDTH = 172;
const START_END_NODE_HEIGHT = 176;

const parseSourceNodeId = (placeholderId: string): string | undefined => {
  if (
    placeholderId === "placeholder-start" ||
    placeholderId === "placeholder-end"
  ) {
    return undefined;
  }

  return placeholderId.replace("placeholder-", "");
};

const WizardCard = ({
  children,
  minWidth = "520px",
  maxWidth,
}: {
  children: ReactNode;
  minWidth?: string;
  maxWidth?: string;
}) => (
  <Box
    bg="white"
    border="1px solid"
    borderColor={WIZARD_CARD_BORDER}
    borderRadius="20px"
    boxShadow="0 4px 4px rgba(0,0,0,0.25)"
    p={12}
    minW={minWidth}
    maxW={maxWidth}
    overflow="hidden"
  >
    {children}
  </Box>
);

const CategoryGrid = ({
  searchQuery,
  setSearchQuery,
  onSelect,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelect: (meta: NodeMeta) => void;
}) => {
  const filtered = searchQuery
    ? allNodeEntries.filter((meta) => meta.label.includes(searchQuery))
    : allNodeEntries;

  return (
    <WizardCard minWidth="820px" maxWidth="820px">
      <Box position="relative" mb={6}>
        <Input
          placeholder="검색"
          bg="white"
          border="1px solid"
          borderColor="gray.500"
          borderRadius="full"
          pl={12}
          pr={12}
          py={2}
          fontSize="md"
          fontWeight="bold"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <Box
          position="absolute"
          top="50%"
          right={6}
          transform="translateY(-50%)"
          pointerEvents="none"
        >
          <Icon as={MdSearch} boxSize={8} color="gray.600" />
        </Box>
      </Box>

      <Grid templateColumns="repeat(7, 1fr)" gap={12} p={6}>
        {filtered.map((meta) => (
          <VStack
            key={meta.type}
            gap={1}
            cursor="pointer"
            minH="80px"
            _hover={{ opacity: 0.7 }}
            transition="opacity 150ms ease"
            onClick={() => onSelect(meta)}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              h="64px"
            >
              <Icon as={meta.iconComponent} boxSize={16} color={meta.color} />
            </Box>
            <Text fontSize="xs" fontWeight="medium" textAlign="center">
              {meta.label}
            </Text>
          </VStack>
        ))}
      </Grid>
    </WizardCard>
  );
};

const ServiceGrid = ({
  selectedMeta,
  services,
  onSelect,
  onBack,
}: {
  selectedMeta: NodeMeta;
  services: ServiceOption[];
  onSelect: (service: ServiceOption) => void;
  onBack: () => void;
}) => (
  <WizardCard minWidth="520px" maxWidth="720px">
    <Text fontSize="md" fontWeight="medium" color="text.secondary" mb={6}>
      {selectedMeta.label} 카테고리의 서비스를 선택해주세요.
    </Text>

    <Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={8} p={4}>
      {services.map((service) => (
        <VStack
          key={service.value}
          gap={1}
          cursor="pointer"
          minH="80px"
          _hover={{ opacity: 0.7 }}
          transition="opacity 150ms ease"
          onClick={() => onSelect(service)}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            h="64px"
          >
            <Icon as={service.iconComponent} boxSize={16} />
          </Box>
          <Text fontSize="xs" fontWeight="medium" textAlign="center">
            {service.label}
          </Text>
        </VStack>
      ))}
    </Grid>

    <Box
      mt={4}
      cursor="pointer"
      onClick={onBack}
      display="inline-flex"
      alignItems="center"
      gap={1}
      color="gray.500"
      _hover={{ color: "black" }}
      transition="color 150ms ease"
    >
      <Icon as={MdArrowBack} boxSize={5} />
      <Text fontSize="sm">뒤로</Text>
    </Box>
  </WizardCard>
);

const RequirementList = ({
  title,
  requirements,
  onSelect,
  onBack,
}: {
  title: string;
  requirements: ServiceRequirement[];
  onSelect: (requirement: ServiceRequirement) => void;
  onBack: () => void;
}) => (
  <WizardCard>
    <Box
      mb={4}
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      onClick={onBack}
      color="gray.500"
      _hover={{ color: "black" }}
      transition="color 150ms ease"
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={6}>
      {title}
    </Text>

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
  </WizardCard>
);

const AuthPrompt = ({
  onAuth,
  onBack,
}: {
  onAuth: () => void;
  onBack: () => void;
}) => (
  <WizardCard>
    <Box
      mb={4}
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      onClick={onBack}
      color="gray.500"
      _hover={{ color: "black" }}
      transition="color 150ms ease"
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={3}>
      인증이 필요합니다.
    </Text>
    <Text fontSize="md" mb={6} color="text.secondary">
      인증은 처음 한 번만 진행하면 됩니다.
    </Text>

    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
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
        계정 인증하기
      </Text>
    </Box>
  </WizardCard>
);

export const ServiceSelectionPanel = () => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const addNode = useWorkflowStore((state) => state.addNode);
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );
  const setStartNodeId = useWorkflowStore((state) => state.setStartNodeId);
  const setEndNodeId = useWorkflowStore((state) => state.setEndNodeId);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: deleteWorkflowNode, isPending: isDeleteNodePending } =
    useDeleteWorkflowNodeMutation();
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useViewport();

  const [step, setStep] = useState<WizardStep>("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<NodeMeta | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(
    null,
  );
  const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
  const [selectedRequirementPreset, setSelectedRequirementPreset] =
    useState<Record<string, unknown> | null>(null);

  const resetWizard = useCallback(() => {
    setStep("category");
    setSearchQuery("");
    setSelectedMeta(null);
    setSelectedService(null);
    setPlacedNodeId(null);
    setSelectedRequirementPreset(null);
    setActivePlaceholder(null);
  }, [setActivePlaceholder]);

  const handleOverlayClose = useCallback(() => {
    resetWizard();
  }, [resetWizard]);

  useEffect(() => {
    if (!activePlaceholder) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activePlaceholder) {
        handleOverlayClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlaceholder, handleOverlayClose]);

  useLayoutEffect(() => {
    const wrapperElement = wrapperRef.current;

    if (!activePlaceholder) {
      if (wrapperElement) {
        wrapperElement.style.visibility = "hidden";
      }
      return;
    }

    const overlayElement = overlayRef.current;
    if (!overlayElement || !wrapperElement) return;

    const overlayRect = overlayElement.getBoundingClientRect();
    const wrapperRect = wrapperElement.getBoundingClientRect();
    const anchorWidth = placedNodeId
      ? START_END_NODE_WIDTH
      : PLACEHOLDER_NODE_WIDTH;
    const anchorCenterY =
      activePlaceholder.position.y + START_END_NODE_HEIGHT / 2;
    const anchorScreenPosition = flowToScreenPosition({
      x: activePlaceholder.position.x + anchorWidth,
      y: anchorCenterY,
    });

    const centeredLeft =
      anchorScreenPosition.x - overlayRect.left + START_END_PANEL_GAP;
    const maxLeft = Math.max(24, overlayRect.width - wrapperRect.width - 24);
    const left = Math.min(Math.max(24, centeredLeft), maxLeft);
    const centeredTop =
      anchorScreenPosition.y - overlayRect.top - wrapperRect.height / 2;
    const maxTop = Math.max(24, overlayRect.height - wrapperRect.height - 24);
    const top = Math.min(Math.max(24, centeredTop), maxTop);

    wrapperElement.style.left = `${left}px`;
    wrapperElement.style.top = `${top}px`;
    wrapperElement.style.visibility = "visible";
  }, [
    activePlaceholder,
    flowToScreenPosition,
    placedNodeId,
    viewport.x,
    viewport.y,
    viewport.zoom,
  ]);

  const placeNode = useCallback(
    async (meta: NodeMeta, service?: ServiceOption) => {
      if (!activePlaceholder || !workflowId) return null;
      const sourceNodeId = parseSourceNodeId(activePlaceholder.id);

      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type: meta.type,
          position: activePlaceholder.position,
          role:
            activePlaceholder.id === "placeholder-start"
              ? "start"
              : activePlaceholder.id === "placeholder-end"
                ? "end"
                : "middle",
          prevNodeId: sourceNodeId,
          config: service
            ? ({ service: service.value } as Partial<FlowNodeData["config"]>)
            : undefined,
        }),
      });

      const addedNodeId = findAddedNodeId(nodes, nextWorkflow.nodes);
      const addedNode = nextWorkflow.nodes.find(
        (node) => node.id === addedNodeId,
      );

      if (!addedNodeId || !addedNode) {
        return null;
      }

      addNode(toFlowNode(addedNode));

      if (activePlaceholder.id === "placeholder-start") {
        setStartNodeId(addedNodeId);
      } else if (activePlaceholder.id === "placeholder-end") {
        setEndNodeId(addedNodeId);
      }

      if (sourceNodeId) {
        onConnect({
          source: sourceNodeId,
          target: addedNodeId,
          sourceHandle: null,
          targetHandle: null,
        });
      }

      return addedNodeId;
    },
    [
      activePlaceholder,
      addNode,
      addWorkflowNode,
      nodes,
      onConnect,
      setEndNodeId,
      setStartNodeId,
      workflowId,
    ],
  );

  if (!activePlaceholder) return null;

  const isStartOrEndPlaceholder =
    activePlaceholder.id === "placeholder-start" ||
    activePlaceholder.id === "placeholder-end";

  if (!isStartOrEndPlaceholder) return null;

  const requirementGroup = selectedMeta
    ? SERVICE_REQUIREMENTS[selectedMeta.type]
    : undefined;

  const handleCategorySelect = (meta: NodeMeta) => {
    const serviceGroup = CATEGORY_SERVICE_MAP[meta.type];
    if (serviceGroup && serviceGroup.services.length > 0) {
      setSelectedMeta(meta);
      setStep("service");
      return;
    }

    void (async () => {
      const nodeId = await placeNode(meta);
      if (!nodeId) return;

      const nextRequirementGroup = SERVICE_REQUIREMENTS[meta.type];
      if (nextRequirementGroup) {
        setSelectedMeta(meta);
        setPlacedNodeId(nodeId);
        setStep("requirement");
        return;
      }

      updateNodeConfig(nodeId, {});
      resetWizard();
    })();
  };

  const handleServiceSelect = (service: ServiceOption) => {
    if (!selectedMeta) return;

    void (async () => {
      const nodeId = await placeNode(selectedMeta, service);
      if (!nodeId) return;

      setSelectedService(service);
      setPlacedNodeId(nodeId);

      if (SERVICE_REQUIREMENTS[selectedMeta.type]) {
        setStep("requirement");
        return;
      }

      updateNodeConfig(nodeId, {});
      resetWizard();
    })();
  };

  const handleRequirementSelect = (requirement: ServiceRequirement) => {
    if (!placedNodeId || !selectedMeta) return;

    const serviceGroup = CATEGORY_SERVICE_MAP[selectedMeta.type];
    if (serviceGroup?.requiresAuth) {
      setSelectedRequirementPreset(requirement.configPreset);
      setStep("auth");
      return;
    }

    updateNodeConfig(placedNodeId, requirement.configPreset);
    resetWizard();
  };

  const handleAuth = () => {
    if (!placedNodeId || !selectedRequirementPreset) return;

    updateNodeConfig(placedNodeId, selectedRequirementPreset);
    resetWizard();
  };

  const handleBackToCategory = () => {
    setSelectedMeta(null);
    setSelectedService(null);
    setStep("category");
  };

  const handleBackFromRequirement = () => {
    void (async () => {
      if (placedNodeId && workflowId) {
        await deleteWorkflowNode({
          workflowId,
          nodeId: placedNodeId,
        });
        setPlacedNodeId(null);
        removeNode(placedNodeId);
      } else if (placedNodeId) {
        removeNode(placedNodeId);
        setPlacedNodeId(null);
      }

      if (selectedService) {
        setSelectedService(null);
        setStep("service");
        return;
      }

      setSelectedMeta(null);
      setStep("category");
    })();
  };

  const handleBackToRequirement = () => {
    setSelectedRequirementPreset(null);
    setStep("requirement");
  };

  const getGuidelineTitle = (): string => {
    switch (step) {
      case "category":
        return "어디에서 어디로 갈까요?";
      case "service":
        return "서비스를 선택해주세요.";
      case "requirement":
        return "어떻게 사용하시겠어요?";
      case "auth":
        return "인증은 가장 처음 한 번만 진행됩니다.";
    }
  };

  return (
    <Box
      ref={overlayRef}
      position="absolute"
      inset={0}
      zIndex={20}
      onClick={handleOverlayClose}
    >
      <Box
        position="absolute"
        ref={wrapperRef}
        left={0}
        top={0}
        onClick={(event) => event.stopPropagation()}
        visibility="hidden"
      >
        <Text
          fontSize="24px"
          fontWeight="bold"
          textAlign="center"
          pb="24px"
          lineHeight="shorter"
        >
          {getGuidelineTitle()}
        </Text>

        <Box position="relative">
          <Box
            position="absolute"
            top={5}
            right={5}
            cursor="pointer"
            zIndex={1}
            onClick={handleOverlayClose}
          >
            <Icon as={MdCancel} boxSize={7} color="gray.600" />
          </Box>

          <Box>
            {step === "category" ? (
              <CategoryGrid
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelect={handleCategorySelect}
              />
            ) : null}

            {step === "service" && selectedMeta ? (
              <ServiceGrid
                selectedMeta={selectedMeta}
                services={CATEGORY_SERVICE_MAP[selectedMeta.type]!.services}
                onSelect={handleServiceSelect}
                onBack={handleBackToCategory}
              />
            ) : null}

            {step === "requirement" && requirementGroup ? (
              <RequirementList
                title={requirementGroup.title}
                requirements={requirementGroup.requirements}
                onSelect={handleRequirementSelect}
                onBack={handleBackFromRequirement}
              />
            ) : null}

            {step === "auth" ? (
              <AuthPrompt
                onAuth={handleAuth}
                onBack={handleBackToRequirement}
              />
            ) : null}
          </Box>
        </Box>
        {isAddNodePending || isDeleteNodePending ? (
          <Text mt={4} textAlign="center" color="gray.500">
            노드 변경 내용을 반영하는 중입니다.
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
