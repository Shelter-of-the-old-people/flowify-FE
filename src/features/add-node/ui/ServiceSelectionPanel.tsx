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
import {
  MdArrowBack,
  MdArticle,
  MdCancel,
  MdFolder,
  MdSchool,
  MdSearch,
} from "react-icons/md";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiGooglesheets,
  SiSlack,
} from "react-icons/si";

import { Box, Button, Grid, Icon, Input, Text, VStack } from "@chakra-ui/react";
import { useReactFlow, useViewport } from "@xyflow/react";

import { type DataType, type FlowNodeData } from "@/entities/node";
import {
  getOAuthConnectionUiState,
  useConnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities/oauth-token";
import {
  type SinkServiceResponse,
  type SourceModeResponse,
  type SourceServiceResponse,
  type TargetOptionItemResponse,
  findAddedNodeId,
  getVisualNodeTypeFromServiceKey,
  toBackendDataType,
  toFrontendDataType,
  toNodeAddRequest,
  useAddWorkflowNodeMutation,
  useSinkCatalogQuery,
  useSourceCatalogQuery,
  useTargetOptionsQuery,
} from "@/entities/workflow";
import { hydrateStore, useWorkflowStore } from "@/features/workflow-editor";
import {
  RemoteOptionPicker,
  getApiErrorMessage,
  getLeafNodeIds,
} from "@/shared";

import { isSinkServiceInRollout } from "../model/sink-rollout";
import { isSourceModeInRollout } from "../model/source-rollout";

type StartWizardStep = "service" | "auth" | "mode" | "target" | "confirm";
type EndWizardStep = "service" | "auth" | "confirm";
type CatalogService = SourceServiceResponse | SinkServiceResponse;

const WIZARD_CARD_BORDER = "#f2f2f2";
const START_END_PANEL_GAP = 48;
const PLACEHOLDER_NODE_WIDTH = 100;
const START_END_NODE_HEIGHT = 176;
const EMPTY_TARGET_SENTINEL = "";

const CATALOG_SERVICE_ICON_MAP: Record<string, IconType> = {
  canvas_lms: MdSchool,
  gmail: SiGmail,
  google_calendar: SiGooglecalendar,
  google_drive: SiGoogledrive,
  google_sheets: SiGooglesheets,
  notion: MdArticle,
  slack: SiSlack,
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

const DATA_TYPE_LABELS: Record<DataType, string> = {
  "api-response": "API 응답",
  "email-list": "이메일 목록",
  "file-list": "파일 목록",
  "schedule-data": "일정 데이터",
  "single-email": "단일 이메일",
  "single-file": "단일 파일",
  spreadsheet: "스프레드시트 데이터",
  text: "텍스트",
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

const REMOTE_TARGET_PICKER_TYPES = new Set([
  "course_picker",
  "file_picker",
  "folder_picker",
  "term_picker",
]);

const REMOTE_TARGET_PICKER_SERVICES = new Set(["canvas_lms", "google_drive"]);

const DAY_PICKER_OPTIONS = [
  { label: "월요일", value: "monday" },
  { label: "화요일", value: "tuesday" },
  { label: "수요일", value: "wednesday" },
  { label: "목요일", value: "thursday" },
  { label: "금요일", value: "friday" },
  { label: "토요일", value: "saturday" },
  { label: "일요일", value: "sunday" },
] as const;

const WizardCard = ({
  children,
  maxWidth,
  minWidth = "520px",
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
    maxW={maxWidth}
    minW={minWidth}
    overflow="hidden"
    p={12}
  >
    {children}
  </Box>
);

const getCatalogServiceIcon = (serviceKey: string) =>
  CATALOG_SERVICE_ICON_MAP[serviceKey] ?? MdFolder;

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

const CatalogServiceGrid = ({
  emptyMessage,
  connectedServiceKeys,
  isAuthStatusError,
  isAuthStatusLoading,
  isLoading,
  onSelect,
  searchQuery,
  services,
  setSearchQuery,
}: {
  connectedServiceKeys: Set<string>;
  emptyMessage: string;
  isAuthStatusError: boolean;
  isAuthStatusLoading: boolean;
  isLoading: boolean;
  onSelect: (service: CatalogService) => void;
  searchQuery: string;
  services: CatalogService[];
  setSearchQuery: (query: string) => void;
}) => (
  <WizardCard minWidth="820px" maxWidth="820px">
    <Box position="relative" mb={6}>
      <Input
        bg="white"
        border="1px solid"
        borderColor="gray.500"
        borderRadius="full"
        fontSize="md"
        fontWeight="bold"
        placeholder="서비스 검색"
        pl={12}
        pr={12}
        py={2}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />
      <Box
        pointerEvents="none"
        position="absolute"
        right={6}
        top="50%"
        transform="translateY(-50%)"
      >
        <Icon as={MdSearch} boxSize={8} color="gray.600" />
      </Box>
    </Box>

    {isLoading ? (
      <Text color="text.secondary" px={6} py={10} textAlign="center">
        서비스를 불러오는 중입니다.
      </Text>
    ) : services.length === 0 ? (
      <Text color="text.secondary" px={6} py={10} textAlign="center">
        {emptyMessage}
      </Text>
    ) : (
      <Grid gap={8} p={6} templateColumns="repeat(5, 1fr)">
        {services.map((service) => {
          const connected = connectedServiceKeys.has(service.key);
          const authState = getOAuthConnectionUiState({
            authRequired: service.auth_required,
            connected,
            isAuthStatusError,
            isAuthStatusLoading,
            serviceKey: service.key,
          });

          return (
            <VStack
              key={service.key}
              cursor={authState.selectionDisabled ? "not-allowed" : "pointer"}
              gap={2}
              minH="96px"
              opacity={authState.selectionDisabled ? 0.5 : 1}
              transition="opacity 150ms ease"
              _hover={
                authState.selectionDisabled ? undefined : { opacity: 0.7 }
              }
              onClick={() => {
                if (authState.selectionDisabled) {
                  return;
                }

                onSelect(service);
              }}
            >
              <Box
                alignItems="center"
                display="flex"
                h="64px"
                justifyContent="center"
              >
                <Icon as={getCatalogServiceIcon(service.key)} boxSize={16} />
              </Box>
              <Text fontSize="xs" fontWeight="medium" textAlign="center">
                {service.label}
              </Text>
              <Text color="text.secondary" fontSize="10px">
                {authState.label}
              </Text>
            </VStack>
          );
        })}
      </Grid>
    )}
  </WizardCard>
);

const AuthPrompt = ({
  errorMessage,
  isPending,
  onAuth,
  onBack,
  serviceLabel,
}: {
  errorMessage: string | null;
  isPending: boolean;
  onAuth: () => void;
  onBack: () => void;
  serviceLabel: string;
}) => (
  <WizardCard>
    <Box
      alignItems="center"
      color="gray.500"
      cursor="pointer"
      display="inline-flex"
      mb={4}
      transition="color 150ms ease"
      _hover={{ color: "black" }}
      onClick={onBack}
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={3}>
      인증이 필요합니다
    </Text>
    <Text color="text.secondary" fontSize="md" mb={6}>
      {serviceLabel} 계정 연결이 필요합니다. 인증은 처음 한 번만 진행하면
      됩니다.
    </Text>

    <Button
      loading={isPending}
      px={16}
      py={3}
      variant="outline"
      onClick={onAuth}
    >
      계정 인증하기
    </Button>
    {errorMessage ? (
      <Text color="status.error" fontSize="sm" mt={4}>
        {errorMessage}
      </Text>
    ) : null}
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
      alignItems="center"
      color="gray.500"
      cursor="pointer"
      display="inline-flex"
      mb={4}
      transition="color 150ms ease"
      _hover={{ color: "black" }}
      onClick={onBack}
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={2}>
      {service.label}
    </Text>
    <Text color="text.secondary" fontSize="sm" mb={6}>
      어떤 방식으로 데이터를 가져올지 선택해주세요.
    </Text>

    <Box display="flex" flexDirection="column" gap={3}>
      {service.source_modes.map((mode) => (
        <Box
          key={mode.key}
          borderRadius="3xl"
          cursor="pointer"
          px={6}
          py={5}
          transition="background 150ms ease"
          _hover={{ bg: "gray.50" }}
          onClick={() => onSelect(mode)}
        >
          <Text fontSize="md" fontWeight="bold" mb={1}>
            {mode.label}
          </Text>
          <Text color="text.secondary" fontSize="sm">
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
  emptyOptionMessage,
  errorMessage,
  hasMoreOptions,
  isLoadingMoreOptions,
  isLoadingOptions,
  mode,
  onBrowseOption,
  onBack,
  onChange,
  onLoadMoreOptions,
  onOptionPathSelect,
  onOptionSearchChange,
  onOptionSelect,
  onResetOptionPath,
  onSubmit,
  optionItems,
  optionPath,
  optionQuery,
  selectedOptionId,
  useRemoteOptions,
  value,
}: {
  emptyOptionMessage: string;
  errorMessage?: string | null;
  hasMoreOptions: boolean;
  isLoadingMoreOptions: boolean;
  isLoadingOptions: boolean;
  mode: SourceModeResponse;
  onBrowseOption?: (option: TargetOptionItemResponse) => void;
  onBack: () => void;
  onChange: (value: string) => void;
  onLoadMoreOptions: () => void;
  onOptionPathSelect: (index: number) => void;
  onOptionSearchChange: (value: string) => void;
  onOptionSelect: (option: TargetOptionItemResponse) => void;
  onResetOptionPath: () => void;
  onSubmit: () => void;
  optionItems: TargetOptionItemResponse[];
  optionPath: Array<{ id: string; label: string }>;
  optionQuery: string;
  selectedOptionId?: string | null;
  useRemoteOptions: boolean;
  value: string;
}) => {
  const schemaType = getTargetSchemaType(mode.target_schema);

  return (
    <WizardCard minWidth="520px" maxWidth="640px">
      <Box
        alignItems="center"
        color="gray.500"
        cursor="pointer"
        display="inline-flex"
        mb={4}
        transition="color 150ms ease"
        _hover={{ color: "black" }}
        onClick={onBack}
      >
        <Icon as={MdArrowBack} boxSize={5} mr={1} />
        <Text fontSize="sm">뒤로</Text>
      </Box>

      <Text fontSize="xl" fontWeight="bold" mb={2}>
        대상 선택
      </Text>
      <Text color="text.secondary" fontSize="sm" mb={6}>
        {getTargetSchemaLabel(mode.target_schema)} 정보를 입력해주세요.
      </Text>

      {useRemoteOptions ? (
        <RemoteOptionPicker
          emptyMessage={emptyOptionMessage}
          errorMessage={errorMessage}
          hasMore={hasMoreOptions}
          isLoading={isLoadingOptions}
          isLoadingMore={isLoadingMoreOptions}
          items={optionItems}
          path={optionPath}
          searchPlaceholder={`${getTargetSchemaLabel(mode.target_schema)} 검색`}
          searchValue={optionQuery}
          selectedId={selectedOptionId}
          onBrowse={onBrowseOption}
          onLoadMore={onLoadMoreOptions}
          onPathSelect={onOptionPathSelect}
          onResetPath={onResetOptionPath}
          onSearchChange={onOptionSearchChange}
          onSelect={onOptionSelect}
        />
      ) : schemaType === "day_picker" ? (
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
          placeholder={getTargetSchemaPlaceholder(mode.target_schema)}
          type={schemaType === "time_picker" ? "time" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      <Box display="flex" justifyContent="flex-end" mt={6}>
        <Button disabled={!value.trim()} onClick={onSubmit}>
          다음
        </Button>
      </Box>
    </WizardCard>
  );
};

const StartNodeConfirm = ({
  mode,
  onBack,
  onConfirm,
  service,
  targetLabel,
  targetValue,
}: {
  mode: SourceModeResponse;
  onBack: () => void;
  onConfirm: () => void;
  service: SourceServiceResponse;
  targetLabel: string;
  targetValue: string;
}) => (
  <WizardCard minWidth="520px" maxWidth="640px">
    <Box
      alignItems="center"
      color="gray.500"
      cursor="pointer"
      display="inline-flex"
      mb={4}
      transition="color 150ms ease"
      _hover={{ color: "black" }}
      onClick={onBack}
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={2}>
      시작 노드 확인
    </Text>
    <Text color="text.secondary" fontSize="sm" mb={6}>
      선택한 source 설정으로 시작 노드를 생성합니다.
    </Text>

    <VStack align="stretch" gap={3}>
      <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
        <Text color="text.secondary" fontSize="sm">
          서비스
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {service.label}
        </Text>
      </Box>
      <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
        <Text color="text.secondary" fontSize="sm">
          source mode
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {mode.label}
        </Text>
      </Box>
      <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
        <Text color="text.secondary" fontSize="sm">
          canonical type
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {CANONICAL_INPUT_TYPE_LABELS[mode.canonical_input_type] ??
            mode.canonical_input_type}
        </Text>
      </Box>
      {targetValue ? (
        <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
          <Text color="text.secondary" fontSize="sm">
            target
          </Text>
          <Text fontSize="md" fontWeight="semibold">
            {targetLabel || targetValue}
          </Text>
        </Box>
      ) : null}
    </VStack>

    <Box display="flex" justifyContent="flex-end" mt={6}>
      <Button onClick={onConfirm}>시작 노드 만들기</Button>
    </Box>
  </WizardCard>
);

const SinkNodeConfirm = ({
  inputType,
  onBack,
  onConfirm,
  service,
}: {
  inputType: DataType | null;
  onBack: () => void;
  onConfirm: () => void;
  service: SinkServiceResponse;
}) => (
  <WizardCard minWidth="520px" maxWidth="640px">
    <Box
      alignItems="center"
      color="gray.500"
      cursor="pointer"
      display="inline-flex"
      mb={4}
      transition="color 150ms ease"
      _hover={{ color: "black" }}
      onClick={onBack}
    >
      <Icon as={MdArrowBack} boxSize={5} mr={1} />
      <Text fontSize="sm">뒤로</Text>
    </Box>

    <Text fontSize="xl" fontWeight="bold" mb={2}>
      도착 노드 확인
    </Text>
    <Text color="text.secondary" fontSize="sm" mb={6}>
      먼저 어디로 보낼지만 정하고, 상세 설정은 마지막 단계에서 완료합니다.
    </Text>

    <VStack align="stretch" gap={3}>
      <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
        <Text color="text.secondary" fontSize="sm">
          sink 서비스
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {service.label}
        </Text>
      </Box>
      <Box bg="gray.50" borderRadius="2xl" px={5} py={4}>
        <Text color="text.secondary" fontSize="sm">
          현재 결과 타입
        </Text>
        <Text fontSize="md" fontWeight="semibold">
          {inputType ? DATA_TYPE_LABELS[inputType] : "결과 타입 확인 필요"}
        </Text>
      </Box>
    </VStack>

    <Box display="flex" justifyContent="flex-end" mt={6}>
      <Button disabled={!inputType} onClick={onConfirm}>
        도착 노드 만들기
      </Button>
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
  const edges = useWorkflowStore((state) => state.edges);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const setActivePlaceholder = useWorkflowStore(
    (state) => state.setActivePlaceholder,
  );
  const { mutateAsync: addWorkflowNode, isPending: isAddNodePending } =
    useAddWorkflowNodeMutation();
  const { mutateAsync: connectOAuthToken, isPending: isConnectOAuthPending } =
    useConnectOAuthTokenMutation();
  const {
    data: oauthTokens,
    isError: isOAuthTokensError,
    isLoading: isOAuthTokensLoading,
  } = useOAuthTokensQuery({
    enabled: Boolean(activePlaceholder),
  });
  const { data: sinkCatalog, isLoading: isSinkCatalogLoading } =
    useSinkCatalogQuery();
  const { data: sourceCatalog, isLoading: isSourceCatalogLoading } =
    useSourceCatalogQuery();
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useViewport();

  const [endStep, setEndStep] = useState<EndWizardStep>("service");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSinkService, setSelectedSinkService] =
    useState<SinkServiceResponse | null>(null);
  const [selectedSourceMode, setSelectedSourceMode] =
    useState<SourceModeResponse | null>(null);
  const [selectedSourceService, setSelectedSourceService] =
    useState<SourceServiceResponse | null>(null);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState("");
  const [selectedTargetValue, setSelectedTargetValue] = useState("");
  const [targetOptionPath, setTargetOptionPath] = useState<
    TargetOptionItemResponse[]
  >([]);
  const [targetOptionQuery, setTargetOptionQuery] = useState("");
  const [startStep, setStartStep] = useState<StartWizardStep>("service");
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
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

  const connectedServiceKeys = useMemo(
    () =>
      new Set(
        (oauthTokens ?? [])
          .filter((token) => token.connected)
          .map((token) => token.service),
      ),
    [oauthTokens],
  );

  const isServiceConnected = useCallback(
    (serviceKey: string) => connectedServiceKeys.has(serviceKey),
    [connectedServiceKeys],
  );

  const shouldRequestAuth = useCallback(
    (service: CatalogService) =>
      service.auth_required && !isServiceConnected(service.key),
    [isServiceConnected],
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

  const resetTargetOptions = useCallback(() => {
    setSelectedTargetLabel("");
    setSelectedTargetValue("");
    setTargetOptionPath([]);
    setTargetOptionQuery("");
  }, []);

  const selectedTargetSchemaType = selectedSourceMode
    ? getTargetSchemaType(selectedSourceMode.target_schema)
    : null;
  const useRemoteTargetOptions = Boolean(
    selectedSourceMode &&
    selectedSourceService &&
    selectedTargetSchemaType &&
    REMOTE_TARGET_PICKER_TYPES.has(selectedTargetSchemaType) &&
    REMOTE_TARGET_PICKER_SERVICES.has(selectedSourceService.key),
  );
  const targetOptionParentId =
    targetOptionPath.length > 0
      ? (targetOptionPath[targetOptionPath.length - 1]?.id ?? null)
      : null;
  const targetOptionsRequest = useMemo(() => {
    if (
      !useRemoteTargetOptions ||
      !selectedSourceService ||
      !selectedSourceMode
    ) {
      return null;
    }

    return {
      mode: selectedSourceMode.key,
      parentId: targetOptionParentId,
      query: targetOptionQuery.trim() || null,
      serviceKey: selectedSourceService.key,
    };
  }, [
    selectedSourceMode,
    selectedSourceService,
    targetOptionParentId,
    targetOptionQuery,
    useRemoteTargetOptions,
  ]);
  const {
    data: targetOptionsResponse,
    fetchNextPage: fetchMoreTargetOptions,
    hasNextPage: hasMoreTargetOptions,
    error: targetOptionsError,
    isFetching: isTargetOptionsFetching,
    isLoading: isTargetOptionsLoading,
  } = useTargetOptionsQuery(targetOptionsRequest, {
    enabled: startStep === "target" && useRemoteTargetOptions,
  });
  const targetOptionItems = useMemo(() => {
    const pages = targetOptionsResponse?.pages ?? [];
    const seenIds = new Set<string>();
    const mergedItems: TargetOptionItemResponse[] = [];

    for (const page of pages) {
      for (const item of page.items) {
        if (seenIds.has(item.id)) {
          continue;
        }
        seenIds.add(item.id);
        mergedItems.push(item);
      }
    }

    return mergedItems;
  }, [targetOptionsResponse?.pages]);

  const endSourceNode = useMemo(() => {
    const nodeIds = nodes
      .map((node) => node.id)
      .filter((id) => id !== endNodeId);
    const leafIds = getLeafNodeIds(nodeIds, edges);
    const leafNodes = leafIds
      .map((leafId) => nodes.find((node) => node.id === leafId) ?? null)
      .filter((node): node is (typeof nodes)[number] => node !== null);

    return (
      leafNodes
        .sort((left, right) =>
          left.position.x === right.position.x
            ? left.position.y - right.position.y
            : left.position.x - right.position.x,
        )
        .at(-1) ??
      (startNodeId
        ? (nodes.find((node) => node.id === startNodeId) ?? null)
        : null)
    );
  }, [edges, endNodeId, nodes, startNodeId]);

  const sinkInputType = endSourceNode?.data.outputTypes[0] ?? null;
  const sinkInputTypeKey = sinkInputType
    ? toBackendDataType(sinkInputType)
    : null;
  const sinkServices = useMemo(
    () =>
      (sinkCatalog?.services ?? []).filter(
        (service) =>
          isSinkServiceInRollout(service.key) &&
          Boolean(
            sinkInputTypeKey &&
            service.accepted_input_types.includes(sinkInputTypeKey),
          ),
      ),
    [sinkCatalog?.services, sinkInputTypeKey],
  );

  const filteredCatalogServices = useMemo(() => {
    const targetServices =
      activePlaceholder?.id === "placeholder-end"
        ? sinkServices
        : sourceServices;

    return targetServices.filter((service) =>
      service.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [activePlaceholder?.id, searchQuery, sinkServices, sourceServices]);

  const resetWizard = useCallback(() => {
    setEndStep("service");
    setSearchQuery("");
    setSelectedSinkService(null);
    setSelectedSourceMode(null);
    setSelectedSourceService(null);
    resetTargetOptions();
    setStartStep("service");
    setAuthErrorMessage(null);
    setActivePlaceholder(null);
  }, [resetTargetOptions, setActivePlaceholder]);

  const handleOverlayClose = useCallback(() => {
    resetWizard();
  }, [resetWizard]);

  useEffect(() => {
    if (!activePlaceholder) {
      return;
    }

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
    if (!overlayElement || !wrapperElement) {
      return;
    }

    const overlayRect = overlayElement.getBoundingClientRect();
    const wrapperRect = wrapperElement.getBoundingClientRect();
    const anchorCenterY =
      activePlaceholder.position.y + START_END_NODE_HEIGHT / 2;
    const anchorScreenPosition = flowToScreenPosition({
      x: activePlaceholder.position.x + PLACEHOLDER_NODE_WIDTH,
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
    viewport.x,
    viewport.y,
    viewport.zoom,
  ]);

  if (!canEditNodes || !activePlaceholder) {
    return null;
  }

  const isStartPlaceholder = activePlaceholder.id === "placeholder-start";
  const isEndPlaceholder = activePlaceholder.id === "placeholder-end";

  if (!isStartPlaceholder && !isEndPlaceholder) {
    return null;
  }

  const handleTargetValueChange = (value: string) => {
    setSelectedTargetValue(value);
    setSelectedTargetLabel(value);
  };

  const handleTargetOptionSelect = (option: TargetOptionItemResponse) => {
    setSelectedTargetValue(option.id);
    setSelectedTargetLabel(option.label);
  };

  const handleTargetOptionBrowse = (option: TargetOptionItemResponse) => {
    setTargetOptionPath((current) => [...current, option]);
  };

  const handleTargetOptionPathSelect = (index: number) => {
    setTargetOptionPath((current) => current.slice(0, index + 1));
  };

  const handleTargetOptionPathReset = () => {
    setTargetOptionPath([]);
  };

  const handleSourceServiceSelect = (service: SourceServiceResponse) => {
    setSelectedSourceService(service);
    setSelectedSourceMode(null);
    resetTargetOptions();
    setAuthErrorMessage(null);

    if (shouldRequestAuth(service)) {
      setStartStep("auth");
      return;
    }

    setStartStep("mode");
  };

  const handleSourceModeSelect = (mode: SourceModeResponse) => {
    setSelectedSourceMode(mode);
    resetTargetOptions();

    if (hasTargetSchema(mode.target_schema)) {
      setStartStep("target");
      return;
    }

    setStartStep("confirm");
  };

  const handleCreateStartNode = () => {
    if (!selectedSourceMode || !selectedSourceService || !workflowId) {
      return;
    }

    const nodeType = getVisualNodeTypeFromServiceKey(selectedSourceService.key);
    if (!nodeType) {
      return;
    }

    const outputType = toCanonicalInputType(
      selectedSourceMode.canonical_input_type,
    );
    const normalizedTargetValue = hasTargetSchema(
      selectedSourceMode.target_schema,
    )
      ? selectedTargetValue.trim()
      : EMPTY_TARGET_SENTINEL;
    const normalizedTargetLabel = selectedTargetLabel.trim();

    void (async () => {
      const startNodeConfig: Partial<FlowNodeData["config"]> = {
        canonical_input_type: selectedSourceMode.canonical_input_type,
        service: selectedSourceService.key,
        source_mode: selectedSourceMode.key,
        target: normalizedTargetValue,
        trigger_kind: selectedSourceMode.trigger_kind,
      };

      if (normalizedTargetLabel) {
        startNodeConfig.target_label = normalizedTargetLabel;
      }

      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type: nodeType,
          position: activePlaceholder.position,
          role: "start",
          config: startNodeConfig,
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

  const handleSinkServiceSelect = (service: SinkServiceResponse) => {
    setSelectedSinkService(service);
    setAuthErrorMessage(null);

    if (shouldRequestAuth(service)) {
      setEndStep("auth");
      return;
    }

    setEndStep("confirm");
  };

  const handleConnectService = (serviceKey: string) => {
    void (async () => {
      try {
        setAuthErrorMessage(null);
        const result = await connectOAuthToken(serviceKey);
        window.location.assign(result.authUrl);
      } catch (error) {
        setAuthErrorMessage(getApiErrorMessage(error));
      }
    })();
  };

  const handleCreateEndNode = () => {
    if (
      !selectedSinkService ||
      !workflowId ||
      !endSourceNode ||
      !sinkInputType
    ) {
      return;
    }

    const nodeType = getVisualNodeTypeFromServiceKey(selectedSinkService.key);
    if (!nodeType) {
      return;
    }

    void (async () => {
      const nextWorkflow = await addWorkflowNode({
        workflowId,
        body: toNodeAddRequest({
          type: nodeType,
          position: activePlaceholder.position,
          role: "end",
          prevNodeId: endSourceNode.id,
          config: {
            service: selectedSinkService.key,
          } as Partial<FlowNodeData["config"]>,
          inputTypes: [sinkInputType],
          outputTypes: [],
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

  const handleStartBack = () => {
    switch (startStep) {
      case "service":
        resetWizard();
        return;
      case "auth":
        setSelectedSourceService(null);
        resetTargetOptions();
        setStartStep("service");
        return;
      case "mode":
        setSelectedSourceMode(null);
        resetTargetOptions();
        setStartStep("service");
        return;
      case "target":
        resetTargetOptions();
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
    }
  };

  const handleEndBack = () => {
    switch (endStep) {
      case "service":
        resetWizard();
        return;
      case "auth":
        setSelectedSinkService(null);
        setEndStep("service");
        return;
      case "confirm":
        setEndStep("service");
    }
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

    switch (endStep) {
      case "service":
        return "어디로 결과를 보낼까요?";
      case "auth":
        return "이 sink는 인증이 필요합니다.";
      case "confirm":
        return "도착 노드 설정을 확인해주세요.";
    }
  };

  return (
    <Box
      inset={0}
      position="absolute"
      ref={overlayRef}
      zIndex={20}
      onClick={handleOverlayClose}
    >
      <Box
        left={0}
        onClick={(event) => event.stopPropagation()}
        position="absolute"
        ref={wrapperRef}
        top={0}
        visibility="hidden"
      >
        <Text
          fontSize="24px"
          fontWeight="bold"
          lineHeight="shorter"
          pb="24px"
          textAlign="center"
        >
          {getGuidelineTitle()}
        </Text>

        <Box position="relative">
          <Box
            cursor="pointer"
            position="absolute"
            right={5}
            top={5}
            zIndex={1}
            onClick={handleOverlayClose}
          >
            <Icon as={MdCancel} boxSize={7} color="gray.600" />
          </Box>

          {isStartPlaceholder ? (
            <>
              {startStep === "service" ? (
                <CatalogServiceGrid
                  connectedServiceKeys={connectedServiceKeys}
                  emptyMessage="표시할 source 서비스가 없습니다."
                  isAuthStatusError={isOAuthTokensError}
                  isAuthStatusLoading={isOAuthTokensLoading}
                  isLoading={isSourceCatalogLoading}
                  searchQuery={searchQuery}
                  services={filteredCatalogServices}
                  setSearchQuery={setSearchQuery}
                  onSelect={(service) =>
                    handleSourceServiceSelect(service as SourceServiceResponse)
                  }
                />
              ) : null}

              {startStep === "auth" && selectedSourceService ? (
                <AuthPrompt
                  errorMessage={authErrorMessage}
                  isPending={isConnectOAuthPending}
                  serviceLabel={selectedSourceService.label}
                  onAuth={() => handleConnectService(selectedSourceService.key)}
                  onBack={handleStartBack}
                />
              ) : null}

              {startStep === "mode" && selectedSourceService ? (
                <SourceModeList
                  service={selectedSourceService}
                  onBack={handleStartBack}
                  onSelect={handleSourceModeSelect}
                />
              ) : null}

              {startStep === "target" && selectedSourceMode ? (
                <SourceTargetForm
                  emptyOptionMessage="선택 가능한 항목이 없습니다."
                  errorMessage={
                    targetOptionsError
                      ? getApiErrorMessage(targetOptionsError)
                      : null
                  }
                  hasMoreOptions={Boolean(hasMoreTargetOptions)}
                  isLoadingMoreOptions={
                    isTargetOptionsFetching && !isTargetOptionsLoading
                  }
                  isLoadingOptions={isTargetOptionsLoading}
                  mode={selectedSourceMode}
                  optionItems={targetOptionItems}
                  optionPath={targetOptionPath.map((item) => ({
                    id: item.id,
                    label: item.label,
                  }))}
                  optionQuery={targetOptionQuery}
                  selectedOptionId={selectedTargetValue || null}
                  useRemoteOptions={useRemoteTargetOptions}
                  value={selectedTargetValue}
                  onBack={handleStartBack}
                  onBrowseOption={handleTargetOptionBrowse}
                  onChange={handleTargetValueChange}
                  onLoadMoreOptions={() => {
                    if (!hasMoreTargetOptions) {
                      return;
                    }

                    void fetchMoreTargetOptions();
                  }}
                  onOptionPathSelect={handleTargetOptionPathSelect}
                  onOptionSearchChange={setTargetOptionQuery}
                  onOptionSelect={handleTargetOptionSelect}
                  onResetOptionPath={handleTargetOptionPathReset}
                  onSubmit={() => setStartStep("confirm")}
                />
              ) : null}

              {startStep === "confirm" &&
              selectedSourceMode &&
              selectedSourceService ? (
                <StartNodeConfirm
                  mode={selectedSourceMode}
                  service={selectedSourceService}
                  targetLabel={selectedTargetLabel}
                  targetValue={selectedTargetValue}
                  onBack={handleStartBack}
                  onConfirm={handleCreateStartNode}
                />
              ) : null}
            </>
          ) : (
            <>
              {endStep === "service" ? (
                <CatalogServiceGrid
                  connectedServiceKeys={connectedServiceKeys}
                  emptyMessage={
                    sinkInputType
                      ? "현재 결과 타입과 연결할 수 있는 sink 서비스가 없습니다."
                      : "먼저 결과를 만들 노드가 필요합니다."
                  }
                  isAuthStatusError={isOAuthTokensError}
                  isAuthStatusLoading={isOAuthTokensLoading}
                  isLoading={isSinkCatalogLoading}
                  searchQuery={searchQuery}
                  services={filteredCatalogServices}
                  setSearchQuery={setSearchQuery}
                  onSelect={(service) =>
                    handleSinkServiceSelect(service as SinkServiceResponse)
                  }
                />
              ) : null}

              {endStep === "auth" && selectedSinkService ? (
                <AuthPrompt
                  errorMessage={authErrorMessage}
                  isPending={isConnectOAuthPending}
                  serviceLabel={selectedSinkService.label}
                  onAuth={() => handleConnectService(selectedSinkService.key)}
                  onBack={handleEndBack}
                />
              ) : null}

              {endStep === "confirm" && selectedSinkService ? (
                <SinkNodeConfirm
                  inputType={sinkInputType}
                  service={selectedSinkService}
                  onBack={handleEndBack}
                  onConfirm={handleCreateEndNode}
                />
              ) : null}
            </>
          )}
        </Box>

        {isAddNodePending ? (
          <Text color="gray.500" mt={4} textAlign="center">
            노드 변경 내용을 반영하는 중입니다.
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
