import { useCallback, useState } from "react";
import { MdArrowBack, MdSearch } from "react-icons/md";

import { Box, Grid, Icon, Input, Text, VStack } from "@chakra-ui/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { NodeMeta } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

import { CATEGORY_SERVICE_MAP } from "../model/serviceMap";
import type { ServiceOption } from "../model/serviceMap";
import { SERVICE_REQUIREMENTS } from "../model/serviceRequirements";
import { useAddNode } from "../model/useAddNode";

// ─── 오버레이 단계 ───────────────────────────────────────────
type WizardStep = "category" | "service";

const allNodeEntries = Object.values(NODE_REGISTRY);

const parseSourceNodeId = (placeholderId: string): string | undefined => {
  if (
    placeholderId === "placeholder-start" ||
    placeholderId === "placeholder-end"
  ) {
    return undefined;
  }
  return placeholderId.replace("placeholder-", "");
};

// ─── Step 1: 카테고리 선택 그리드 ────────────────────────────
const CategoryGrid = ({
  searchQuery,
  setSearchQuery,
  onSelect,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelect: (meta: NodeMeta) => void;
}) => {
  const filtered = searchQuery
    ? allNodeEntries.filter((meta) => meta.label.includes(searchQuery))
    : allNodeEntries;

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="lg"
      p={12}
      maxW="820px"
      w="full"
    >
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
          onChange={(e) => setSearchQuery(e.target.value)}
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
    </Box>
  );
};

// ─── Step 2: 서비스 선택 ─────────────────────────────────────
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
  <Box display="flex" gap={12} alignItems="flex-start">
    {/* 선택된 카테고리 아이콘 */}
    <VStack gap={2} flexShrink={0} w="100px">
      <Icon
        as={selectedMeta.iconComponent}
        boxSize={20}
        color={selectedMeta.color}
      />
      <Text fontSize="md" fontWeight="bold" textAlign="center">
        {selectedMeta.label}
      </Text>
    </VStack>

    {/* 서비스 목록 */}
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="lg"
      p={12}
      minW="420px"
    >
      <Text fontSize="xl" fontWeight="bold" mb={6}>
        서비스를 선택해주세요.
      </Text>

      <Grid
        templateColumns="repeat(auto-fill, minmax(80px, 1fr))"
        gap={8}
        p={4}
      >
        {services.map((svc) => (
          <VStack
            key={svc.value}
            gap={1}
            cursor="pointer"
            minH="80px"
            _hover={{ opacity: 0.7 }}
            transition="opacity 150ms ease"
            onClick={() => onSelect(svc)}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              h="64px"
            >
              <Icon as={svc.iconComponent} boxSize={16} />
            </Box>
            <Text fontSize="xs" fontWeight="medium" textAlign="center">
              {svc.label}
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
    </Box>
  </Box>
);

// ─── 메인 ServiceSelectionPanel ──────────────────────────────
export const ServiceSelectionPanel = () => {
  const activePlaceholder = useWorkflowStore((s) => s.activePlaceholder);
  const setActivePlaceholder = useWorkflowStore((s) => s.setActivePlaceholder);
  const setStartNodeId = useWorkflowStore((s) => s.setStartNodeId);
  const setEndNodeId = useWorkflowStore((s) => s.setEndNodeId);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const openPanel = useWorkflowStore((s) => s.openPanel);
  const setWizardStep = useWorkflowStore((s) => s.setWizardStep);
  const setWizardSourcePlaceholder = useWorkflowStore(
    (s) => s.setWizardSourcePlaceholder,
  );
  const { addNode } = useAddNode();

  const [step, setStep] = useState<WizardStep>("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<NodeMeta | null>(null);

  const resetWizard = useCallback(() => {
    setStep("category");
    setSearchQuery("");
    setSelectedMeta(null);
    setActivePlaceholder(null);
  }, [setActivePlaceholder]);

  /**
   * 노드를 캔버스에 배치하고, placeholder 관계(start/end/엣지)를 설정한다.
   * 서비스가 있으면 config.service까지 함께 주입한다.
   */
  const placeNode = useCallback(
    (meta: NodeMeta, service?: ServiceOption) => {
      if (!activePlaceholder) return null;

      const nodeId = addNode(meta.type, {
        position: activePlaceholder.position,
      });

      if (service) {
        const store = useWorkflowStore.getState();
        const node = store.nodes.find((n) => n.id === nodeId);
        if (node) {
          store.updateNodeConfig(nodeId, {
            ...node.data.config,
            service: service.value as never,
          });
        }
      }

      // placeholder 관계 설정
      const sourceNodeId = parseSourceNodeId(activePlaceholder.id);

      if (activePlaceholder.id === "placeholder-start") {
        setStartNodeId(nodeId);
      } else if (activePlaceholder.id === "placeholder-end") {
        setEndNodeId(nodeId);
      }

      if (sourceNodeId) {
        onConnect({
          source: sourceNodeId,
          target: nodeId,
          sourceHandle: null,
          targetHandle: null,
        });
      }

      return nodeId;
    },
    [activePlaceholder, addNode, onConnect, setStartNodeId, setEndNodeId],
  );

  if (!activePlaceholder) return null;

  // ── Step 1: 카테고리 선택 ──────────────────────────────────
  const handleCategorySelect = (meta: NodeMeta) => {
    const serviceGroup = CATEGORY_SERVICE_MAP[meta.type];

    if (serviceGroup && serviceGroup.services.length > 0) {
      setSelectedMeta(meta);
      setStep("service");
      return;
    }

    const nodeId = placeNode(meta);
    if (!nodeId) return;

    const reqGroup = SERVICE_REQUIREMENTS[meta.type];
    if (reqGroup) {
      setWizardSourcePlaceholder(activePlaceholder);
      openPanel(nodeId);
      setWizardStep("requirement");
    }

    resetWizard();
  };

  // ── Step 2: 서비스 선택 후 우측 패널 위저드 시작 ────────────
  const handleServiceSelect = (service: ServiceOption) => {
    if (!selectedMeta) return;

    const nodeId = placeNode(selectedMeta, service);
    if (!nodeId) return;

    const reqGroup = SERVICE_REQUIREMENTS[selectedMeta.type];
    if (reqGroup) {
      setWizardSourcePlaceholder(activePlaceholder);
      openPanel(nodeId);
      setWizardStep("requirement");
    }

    resetWizard();
  };

  // ── 제목 결정 ──────────────────────────────────────────────
  const getTitle = (): string => {
    switch (step) {
      case "category":
        return "어디에서 어디로 갈까요?";
      case "service":
        return "가이드라인 제목";
    }
  };

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={20}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      pointerEvents="auto"
    >
      <Text fontSize="2xl" fontWeight="bold" mb={6} textAlign="center">
        {getTitle()}
      </Text>

      {step === "category" && (
        <CategoryGrid
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelect={handleCategorySelect}
        />
      )}

      {step === "service" && selectedMeta && (
        <ServiceGrid
          selectedMeta={selectedMeta}
          services={CATEGORY_SERVICE_MAP[selectedMeta.type]!.services}
          onSelect={handleServiceSelect}
          onBack={() => {
            setStep("category");
            setSelectedMeta(null);
          }}
        />
      )}
    </Box>
  );
};
