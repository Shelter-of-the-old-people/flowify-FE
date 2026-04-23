import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ReactNode } from "react";
import { type IconType } from "react-icons";
import { MdArrowBack, MdCancel, MdFolder, MdSearch } from "react-icons/md";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiGooglesheets,
  SiSlack,
} from "react-icons/si";

import { Box, Button, Grid, Icon, Input, Text, VStack } from "@chakra-ui/react";
import { useReactFlow, useViewport } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  type DataType,
  type FlowNodeData,
  type NodeMeta,
  type NodeType,
} from "@/entities/node";
import {
  type SourceModeResponse,
  type SourceServiceResponse,
  findAddedNodeId,
  toFrontendDataType,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useDeleteWorkflowNodeMutation,
  useSourceCatalogQuery,
} from "@/entities/workflow";
import { hydrateStore, useWorkflowStore } from "@/features/workflow-editor";

import { CATEGORY_SERVICE_MAP } from "../model/serviceMap";
import { type ServiceOption } from "../model/serviceMap";
import {
  SERVICE_REQUIREMENTS,
  type ServiceRequirement,
} from "../model/serviceRequirements";
import { isSourceModeInRollout } from "../model/source-rollout";

type WizardStep = "category" | "service" | "requirement" | "auth";
type StartWizardStep = "service" | "auth" | "mode" | "target" | "confirm";

const allNodeEntries = Object.values(NODE_REGISTRY);
const WIZARD_CARD_BORDER = "#f2f2f2";
const START_END_PANEL_GAP = 48;
const PLACEHOLDER_NODE_WIDTH = 100;
const START_END_NODE_WIDTH = 172;
const START_END_NODE_HEIGHT = 176;
const EMPTY_TARGET_SENTINEL = "";

const SOURCE_SERVICE_ICON_MAP: Record<string, IconType> = {
  gmail: SiGmail,
  google_calendar: SiGooglecalendar,
  google_drive: SiGoogledrive,
  google_sheets: SiGooglesheets,
  slack: SiSlack,
};

const SOURCE_SERVICE_NODE_TYPE_MAP: Record<string, NodeType> = {
  gmail: "communication",
  google_drive: "storage",
  google_sheets: "spreadsheet",
  slack: "communication",
};

const CANONICAL_INPUT_TYPE_LABELS: Record<string, string> = {
  API_RESPONSE: "구조화된 API 응답",
  EMAIL_LIST: "이메일 목록",
  FILE_LIST: "파일 목록",
  SCHEDULE_DATA: "일정 데이터",
  SINGLE_EMAIL: "단일 이메일",
  SINGLE_FILE: "단일 파일",
  SPREADSHEET_DATA: "스프레드시트 데이터",
  TEXT: "텍스트",
};

const TARGET_SCHEMA_LABELS: Record<string, string> = {
  channel_picker: "채널",
  day_picker: "요일",
  email_picker: "이메일",
  file_picker: "파일",
  folder_picker: "폴더",
  label_picker: "라벨",
  page_picker: "페이지",
  sheet_picker: "시트",
  text_input: "대상",
  time_picker: "시간",
};

const DAY_PICKER_OPTIONS = [
  { label: "월요일", value: "monday" },
  { label: "화요일", value: "tuesday" },
  { label: "수요일", value: "wednesday" },
  { label: "목요일", value: "thursday" },
  { label: "금요일", value: "friday" },
  { label: "토요일", value: "saturday" },
  { label: "일요일", value: "sunday" },
] as const;

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

const getSourceServiceIcon = (serviceKey: string) =>
  SOURCE_SERVICE_ICON_MAP[serviceKey] ?? MdFolder;

const getTargetSchemaType = (targetSchema: Record<string, unknown>) =>
  typeof targetSchema.type === "string" ? targetSchema.type : "text_input";

const getTargetSchemaLabel = (targetSchema: Record<string, unknown>) =>
  TARGET_SCHEMA_LABELS[getTargetSchemaType(targetSchema)] ?? "대상";

const getTargetSchemaPlaceholder = (targetSchema: Record<string, unknown>) =>
  typeof targetSchema.placeholder === "string"
    ? targetSchema.placeholder
    : `${getTargetSchemaLabel(targetSchema)} 입력`;

const hasTargetSchema = (targetSchema: Record<string, unknown>) =>
  Object.keys(targetSchema).length > 0;

const toCanonicalInputType = (canonicalInputType: string): DataType =>
  toFrontendDataType(canonicalInputType);

const SourceServiceGrid = ({
  isLoading,
  onSelect,
  searchQuery,
  services,
  setSearchQuery,
}: {
  isLoading: boolean;
  onSelect: (service: SourceServiceResponse) => void;
  searchQuery: string;
  services: SourceServiceResponse[];
  setSearchQuery: (query: string) => void;
}) => (
  <WizardCard minWidth="820px" maxWidth="820px">
    <Box position="relative" mb={6}>
      <Input
        placeholder="서비스 검색"
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

    {isLoading ? (
      <Text px={6} py={10} textAlign="center" color="text.secondary">
        source 서비스를 불러오는 중입니다.
      </Text>
    ) : (
      <Grid templateColumns="repeat(5, 1fr)" gap={8} p={6}>
        {services.map((service) => (
          <VStack
            key={service.key}
            gap={2}
            cursor="pointer"
            minH="96px"
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
              <Icon as={getSourceServiceIcon(service.key)} boxSize={16} />
            </Box>
            <Text fontSize="xs" fontWeight="medium" textAlign="center">
              {service.label}
            </Text>
            <Text fontSize="10px" color="text.secondary">
              {service.auth_required ? "인증 필요" : "바로 사용"}
            </Text>
          </VStack>
        ))}
      </Grid>
    )}
  </WizardCard>
);

const SourceModeList = ({
  onBack,
  onSelect,
  service,
}: {
  onBack: () => void;
  onSelect: (mode: SourceModeResponse) => void;
  service: SourceServiceResponse;
}) => (
  <WizardCard minWidth="560px" maxWidth="760px">
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

    <Text fontSize="xl" fontWeight="bold" mb={2}>
      {service.label}
    </Text>
    <Text fontSize="sm" color="text.secondary" mb={6}>
      어떤 방식으로 데이터를 가져올지 선택해주세요.
    </Text>

    <Box display="flex" flexDirection="column" gap={3}>
      {service.source_modes.map((mode) => (
        <Box
          key={mode.key}
          px={6}
          py={5}
          borderRadius="3xl"
          cursor="pointer"
          _hover={{ bg: "gray.50" }}
          transition="background 150ms ease"
          onClick={() => onSelect(mode)}
        >
          <Text fontSize="md" fontWeight="bold" mb={1}>
            {mode.label}
          </Text>
          <Text fontSize="sm" color="text.secondary">
            {CANONICAL_INPUT_TYPE_LABELS[mode.canonical_input_type] ??
              mode.canonical_input_type}
            {" · "}
            {mode.trigger_kind}
          </Text>
        </Box>
      ))}
    </Box>
  </WizardCard>
);

const SourceTargetForm = ({
  mode,
  onBack,
  onChange,
  onSubmit,
  value,
}: {
  mode: SourceModeResponse;
  onBack: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) => {
  const schemaType = getTargetSchemaType(mode.target_schema);

  return (
    <WizardCard minWidth="520px" maxWidth="640px">
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

      <Text fontSize="xl" fontWeight="bold" mb={2}>
        대상 선택
      </Text>
      <Text fontSize="sm" color="text.secondary" mb={6}>
        {getTargetSchemaLabel(mode.target_schema)} 정보를 입력해주세요.
      </Text>

      {schemaType === "day_picker" ? (
        <Box display="flex" flexDirection="column" gap={3}>
          {DAY_PICKER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              justifyContent="flex-start"
              variant={value === option.value ? "solid" : "outline"}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </Box>
      ) : (
        <Input
          type={schemaType === "time_picker" ? "time" : "text"}
          placeholder={getTargetSchemaPlaceholder(mode.target_schema)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      <Box mt={6} display="flex" justifyContent="flex-end">
        <Button onClick={onSubmit} isDisabled={!value.trim()}>
          다음
        </Button>
      </Box>
    </WizardCard>
  );
};

const CanonicalTypeConfirm = ({
  mode,
  onBack,
  onConfirm,
  service,
  targetValue,
}: {
  mode: SourceModeResponse;
  onBack: () => void;
  onConfirm: () => void;
  service: SourceServiceResponse;
  targetValue: string;
}) => (
  <WizardCard minWidth="520px" maxWidth="640px">
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

    <Text fontSize="xl" fontWeight="bold" mb={2}>
      시작 노드 확인
    </Text>
    <Text fontSize="sm" color="text.secondary" mb={6}>
      선택한 source 설정으로 시작 노드를 생성합니다.
    </Text>

    <VStack align="stretch" gap={3}>
      <Box px={5} py={4} borderRadius="2xl" bg="gray.50">
        <Text fontSize="sm" color="text.secondary">
          서비스
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {service.label}
        </Text>
      </Box>
      <Box px={5} py={4} borderRadius="2xl" bg="gray.50">
        <Text fontSize="sm" color="text.secondary">
          source mode
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {mode.label}
        </Text>
      </Box>
      <Box px={5} py={4} borderRadius="2xl" bg="gray.50">
        <Text fontSize="sm" color="text.secondary">
          canonical type
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {CANONICAL_INPUT_TYPE_LABELS[mode.canonical_input_type] ??
            mode.canonical_input_type}
        </Text>
      </Box>
      {targetValue ? (
        <Box px={5} py={4} borderRadius="2xl" bg="gray.50">
          <Text fontSize="sm" color="text.secondary">
            target
          </Text>
          <Text fontSize="md" fontWeight="semibold">
            {targetValue}
          </Text>
        </Box>
      ) : null}
    </VStack>

    <Box mt={6} display="flex" justifyContent="flex-end">
      <Button onClick={onConfirm}>시작 노드 만들기</Button>
    </Box>
  </WizardCard>
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
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const activePlaceholder = useWorkflowStore(
    (state) => state.activePlaceholder,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: deleteWorkflowNode, isPending: isDeleteNodePending } =
    useDeleteWorkflowNodeMutation();
  const { data: sourceCatalog, isLoading: isSourceCatalogLoading } =
    useSourceCatalogQuery();
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useViewport();

  const [step, setStep] = useState<WizardStep>("category");
  const [startStep, setStartStep] = useState<StartWizardStep>("service");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<NodeMeta | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(
    null,
  );
  const [selectedSourceService, setSelectedSourceService] =
    useState<SourceServiceResponse | null>(null);
  const [selectedSourceMode, setSelectedSourceMode] =
    useState<SourceModeResponse | null>(null);
  const [selectedTargetValue, setSelectedTargetValue] = useState("");
  const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
  const [selectedRequirementPreset, setSelectedRequirementPreset] =
    useState<Record<string, unknown> | null>(null);
  const syncWorkflowFromResponse = useCallback(
    (workflow: Parameters<typeof hydrateStore>[0]) => {
      syncWorkflowGraph(hydrateStore(workflow), {
        preserveActivePanelNodeId: true,
        preserveActivePlaceholder: true,
        preserveDirty: true,
      });
    },
    [syncWorkflowGraph],
  );
  const sourceServices = useMemo(
    () =>
      (sourceCatalog?.services ?? [])
        .map((service) => ({
          ...service,
          source_modes: service.source_modes.filter((mode) =>
            isSourceModeInRollout(service.key, mode.key),
          ),
        }))
        .filter((service) => service.source_modes.length > 0),
    [sourceCatalog?.services],
  );
  const filteredSourceServices = sourceServices.filter((service) =>
    service.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const resetWizard = useCallback(() => {
    setStep("category");
    setStartStep("service");
    setSearchQuery("");
    setSelectedMeta(null);
    setSelectedService(null);
    setSelectedSourceService(null);
    setSelectedSourceMode(null);
    setSelectedTargetValue("");
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

      syncWorkflowFromResponse(nextWorkflow);
      return addedNodeId;
    },
    [
      activePlaceholder,
      addWorkflowNode,
      nodes,
      syncWorkflowFromResponse,
      workflowId,
    ],
  );

  if (!canEditNodes || !activePlaceholder) return null;

  const isStartPlaceholder = activePlaceholder.id === "placeholder-start";
  const isEndPlaceholder = activePlaceholder.id === "placeholder-end";
  const isStartOrEndPlaceholder = isStartPlaceholder || isEndPlaceholder;

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

  const handleSourceServiceSelect = (service: SourceServiceResponse) => {
    setSelectedSourceService(service);
    setSelectedSourceMode(null);
    setSelectedTargetValue("");

    if (service.auth_required) {
      setStartStep("auth");
      return;
    }

    setStartStep("mode");
  };

  const handleSourceAuthContinue = () => {
    setStartStep("mode");
  };

  const handleSourceModeSelect = (mode: SourceModeResponse) => {
    setSelectedSourceMode(mode);
    setSelectedTargetValue("");

    if (hasTargetSchema(mode.target_schema)) {
      setStartStep("target");
      return;
    }

    setStartStep("confirm");
  };

  const handleCreateStartNode = () => {
    if (!activePlaceholder || !workflowId || !selectedSourceMode) return;
    if (!selectedSourceService) return;

    const nodeType = SOURCE_SERVICE_NODE_TYPE_MAP[selectedSourceService.key];
    if (!nodeType) return;

    const outputType = toCanonicalInputType(
      selectedSourceMode.canonical_input_type,
    );

    void (async () => {
      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type: nodeType,
          position: activePlaceholder.position,
          role: "start",
          config: {
            canonical_input_type: selectedSourceMode.canonical_input_type,
            service: selectedSourceService.key,
            source_mode: selectedSourceMode.key,
            target: hasTargetSchema(selectedSourceMode.target_schema)
              ? selectedTargetValue.trim()
              : EMPTY_TARGET_SENTINEL,
            trigger_kind: selectedSourceMode.trigger_kind,
          } as Partial<FlowNodeData["config"]>,
          outputTypes: [outputType],
        }),
      });

      const addedNodeId = findAddedNodeId(nodes, nextWorkflow.nodes);
      const addedNode = nextWorkflow.nodes.find(
        (node) => node.id === addedNodeId,
      );

      if (!addedNodeId || !addedNode) {
        return;
      }

      syncWorkflowFromResponse(nextWorkflow);
      resetWizard();
    })();
  };

  const handleBackToCategory = () => {
    setSelectedMeta(null);
    setSelectedService(null);
    setStep("category");
  };

  const handleStartBack = () => {
    switch (startStep) {
      case "service":
        resetWizard();
        return;
      case "auth":
        setSelectedSourceService(null);
        setStartStep("service");
        return;
      case "mode":
        setSelectedSourceMode(null);
        setStartStep("service");
        return;
      case "target":
        setSelectedTargetValue("");
        setStartStep("mode");
        return;
      case "confirm":
        if (
          selectedSourceMode &&
          hasTargetSchema(selectedSourceMode.target_schema)
        ) {
          setStartStep("target");
          return;
        }

        setStartStep("mode");
        return;
    }
  };

  const handleBackFromRequirement = () => {
    void (async () => {
      if (placedNodeId && workflowId) {
        const nextWorkflow = await deleteWorkflowNode({
          workflowId,
          nodeId: placedNodeId,
        });
        setPlacedNodeId(null);
        syncWorkflowFromResponse(nextWorkflow);
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
    if (isStartPlaceholder) {
      switch (startStep) {
        case "service":
          return "어디에서 데이터를 가져올까요?";
        case "auth":
          return "이 source는 인증이 필요합니다.";
        case "mode":
          return "어떤 방식으로 가져올까요?";
        case "target":
          return "대상을 선택해주세요.";
        case "confirm":
          return "시작 노드 설정을 확인해주세요.";
      }
    }

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
            {isStartPlaceholder ? (
              <>
                {startStep === "service" ? (
                  <SourceServiceGrid
                    isLoading={isSourceCatalogLoading}
                    services={filteredSourceServices}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSelect={handleSourceServiceSelect}
                  />
                ) : null}

                {startStep === "auth" && selectedSourceService ? (
                  <AuthPrompt
                    onAuth={handleSourceAuthContinue}
                    onBack={handleStartBack}
                  />
                ) : null}

                {startStep === "mode" && selectedSourceService ? (
                  <SourceModeList
                    service={selectedSourceService}
                    onSelect={handleSourceModeSelect}
                    onBack={handleStartBack}
                  />
                ) : null}

                {startStep === "target" && selectedSourceMode ? (
                  <SourceTargetForm
                    mode={selectedSourceMode}
                    value={selectedTargetValue}
                    onChange={setSelectedTargetValue}
                    onSubmit={() => setStartStep("confirm")}
                    onBack={handleStartBack}
                  />
                ) : null}

                {startStep === "confirm" &&
                selectedSourceMode &&
                selectedSourceService ? (
                  <CanonicalTypeConfirm
                    mode={selectedSourceMode}
                    service={selectedSourceService}
                    targetValue={selectedTargetValue}
                    onBack={handleStartBack}
                    onConfirm={handleCreateStartNode}
                  />
                ) : null}
              </>
            ) : (
              <>
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
              </>
            )}
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
