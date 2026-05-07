import { useEffect, useMemo, useState } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Button, Icon, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  getOAuthConnectionUiState,
  useConnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities/oauth-token";
import {
  type SinkServiceResponse,
  type SourceServiceResponse,
  getDataTypeDisplayLabel,
  getTriggerKindLabel,
  toBackendDataType,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
  useSourceCatalogQuery,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";
import {
  getApiErrorMessage,
  getCurrentRelativeUrl,
  storeOAuthConnectReturnPath,
} from "@/shared";

import {
  buildSourceNodeConfigDraft,
  createEmptySourceTargetSetupValue,
  hasTargetSchema,
  isSourceNodeSetupComplete,
} from "../model";
import { type SourceTargetSetupValue } from "../model";

import { AuthPrompt } from "./AuthPrompt";
import { SinkSchemaEditor } from "./SinkSchemaEditor";
import { SourceTargetForm } from "./SourceTargetForm";

type CatalogService = SourceServiceResponse | SinkServiceResponse;

type SourceTargetDraftState = {
  scope: string;
  value: SourceTargetSetupValue;
};

const getServiceKey = (config: FlowNodeData["config"]) =>
  typeof (config as Record<string, unknown>).service === "string"
    ? ((config as Record<string, unknown>).service as string)
    : null;

const createInitialSourceTargetValue = (
  config: FlowNodeData["config"],
): SourceTargetSetupValue => {
  const target =
    typeof (config as Record<string, unknown>).target === "string"
      ? ((config as Record<string, unknown>).target as string)
      : "";

  return {
    option: null,
    value: target,
  };
};

const findConnectedServiceKeys = (
  tokens: Awaited<ReturnType<typeof useOAuthTokensQuery>>["data"],
) =>
  new Set(
    (tokens ?? [])
      .filter((token) => token.connected)
      .map((token) => token.service),
  );

const getAuthState = ({
  connectedServiceKeys,
  isOAuthTokensError,
  isOAuthTokensLoading,
  service,
}: {
  connectedServiceKeys: Set<string>;
  isOAuthTokensError: boolean;
  isOAuthTokensLoading: boolean;
  service: CatalogService | null;
}) => {
  if (!service) {
    return null;
  }

  return getOAuthConnectionUiState({
    authRequired: service.auth_required,
    connected: connectedServiceKeys.has(service.key),
    isAuthStatusError: isOAuthTokensError,
    isAuthStatusLoading: isOAuthTokensLoading,
    serviceKey: service.key,
  });
};

export const NodeSetupOverlay = () => {
  const activeNodeSetupSession = useWorkflowStore(
    (state) => state.activeNodeSetupSession,
  );
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const nodes = useWorkflowStore((state) => state.nodes);
  const closeNodeSetup = useWorkflowStore((state) => state.closeNodeSetup);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const replaceNodeConfig = useWorkflowStore(
    (state) => state.replaceNodeConfig,
  );
  const activeNode = useMemo(
    () =>
      nodes.find((node) => node.id === activeNodeSetupSession?.nodeId) ?? null,
    [activeNodeSetupSession?.nodeId, nodes],
  );
  const { data: sourceCatalog, isLoading: isSourceCatalogLoading } =
    useSourceCatalogQuery(Boolean(activeNodeSetupSession));
  const { data: sinkCatalog, isLoading: isSinkCatalogLoading } =
    useSinkCatalogQuery(Boolean(activeNodeSetupSession));
  const {
    data: oauthTokens,
    isError: isOAuthTokensError,
    isLoading: isOAuthTokensLoading,
    refetch: refetchOAuthTokens,
  } = useOAuthTokensQuery({
    enabled: Boolean(activeNodeSetupSession),
  });
  const connectOAuthMutation = useConnectOAuthTokenMutation();
  const [sourceTargetDraft, setSourceTargetDraft] =
    useState<SourceTargetDraftState>({
      scope: "",
      value: createEmptySourceTargetSetupValue(),
    });
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const nodeConfig = activeNode?.data.config ?? null;
  const serviceKey = nodeConfig ? getServiceKey(nodeConfig) : null;
  const sourceService =
    activeNodeSetupSession?.role === "start"
      ? (sourceCatalog?.services.find(
          (service) => service.key === serviceKey,
        ) ?? null)
      : null;
  const sourceModeKey =
    typeof (nodeConfig as Record<string, unknown> | null)?.source_mode ===
    "string"
      ? ((nodeConfig as Record<string, unknown>).source_mode as string)
      : null;
  const sourceMode =
    sourceService?.source_modes.find((mode) => mode.key === sourceModeKey) ??
    null;
  const sourceTargetScope = `${activeNodeSetupSession?.nodeId ?? ""}:${sourceMode?.key ?? ""}`;
  const initialSourceTargetValue = nodeConfig
    ? createInitialSourceTargetValue(nodeConfig)
    : createEmptySourceTargetSetupValue();
  const sourceTargetValue =
    sourceTargetDraft.scope === sourceTargetScope
      ? sourceTargetDraft.value
      : initialSourceTargetValue;
  const sinkService =
    activeNodeSetupSession?.role === "end"
      ? (sinkCatalog?.services.find((service) => service.key === serviceKey) ??
        null)
      : null;
  const sinkInputType = activeNode?.data.inputTypes[0] ?? null;
  const backendSinkInputType = sinkInputType
    ? toBackendDataType(sinkInputType)
    : null;
  const { data: sinkSchema, isLoading: isSinkSchemaLoading } =
    useSinkSchemaQuery(sinkService?.key, backendSinkInputType, {
      enabled: Boolean(sinkService?.key && backendSinkInputType),
    });
  const connectedServiceKeys = useMemo(
    () => findConnectedServiceKeys(oauthTokens),
    [oauthTokens],
  );
  const activeService: CatalogService | null = sourceService ?? sinkService;
  const authState = getAuthState({
    connectedServiceKeys,
    isOAuthTokensError,
    isOAuthTokensLoading,
    service: activeService,
  });
  const canEditSetup =
    Boolean(activeService) &&
    (!activeService?.auth_required || authState?.key === "connected");
  const isCatalogLoading =
    activeNodeSetupSession?.role === "start"
      ? isSourceCatalogLoading
      : isSinkCatalogLoading;

  useEffect(() => {
    if (!activeNodeSetupSession) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNodeSetup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNodeSetupSession, closeNodeSetup]);

  if (!activeNodeSetupSession || !canEditNodes) {
    return null;
  }

  const handleConnectService = (targetServiceKey: string) => {
    void (async () => {
      try {
        setAuthErrorMessage(null);
        const result = await connectOAuthMutation.mutateAsync(targetServiceKey);
        if (result.kind === "redirect") {
          storeOAuthConnectReturnPath(getCurrentRelativeUrl());
          window.location.assign(result.authUrl);
          return;
        }

        await refetchOAuthTokens();
      } catch (error) {
        setAuthErrorMessage(getApiErrorMessage(error));
      }
    })();
  };

  const handleApplySourceSetup = () => {
    if (!activeNode || !sourceMode) {
      return;
    }

    updateNodeConfig(
      activeNode.id,
      buildSourceNodeConfigDraft({
        currentConfig: activeNode.data.config,
        targetSchema: sourceMode.target_schema,
        targetValue: sourceTargetValue,
      }),
    );
    closeNodeSetup();
  };

  const handleSourceTargetChange = (value: SourceTargetSetupValue) => {
    setSourceTargetDraft({
      scope: sourceTargetScope,
      value,
    });
  };

  const handleApplySinkSetup = (config: Record<string, unknown>) => {
    if (!activeNode) {
      return;
    }

    replaceNodeConfig(activeNode.id, config as FlowNodeData["config"]);
    closeNodeSetup();
  };

  const existingTargetLabel =
    typeof (nodeConfig as Record<string, unknown> | null)?.target_label ===
    "string"
      ? ((nodeConfig as Record<string, unknown>).target_label as string)
      : null;
  const sourceNextConfig =
    activeNode && sourceMode
      ? buildSourceNodeConfigDraft({
          currentConfig: activeNode.data.config,
          targetSchema: sourceMode.target_schema,
          targetValue: sourceTargetValue,
        })
      : null;
  const isSourceComplete =
    sourceNextConfig && sourceMode
      ? isSourceNodeSetupComplete(sourceNextConfig, sourceMode.target_schema)
      : false;
  const title =
    activeNodeSetupSession.role === "start"
      ? "가져오는 곳 설정"
      : "보낼 곳 설정";
  const description =
    activeNodeSetupSession.role === "start"
      ? "서비스와 가져오는 방식은 유지하고, 내 계정에서 사용할 대상을 다시 선택합니다."
      : "서비스는 유지하고, 결과를 보낼 대상과 상세 값을 다시 선택합니다.";

  return (
    <Box
      alignItems="center"
      bg="blackAlpha.300"
      display="flex"
      inset={0}
      justifyContent="center"
      p={6}
      position="absolute"
      zIndex={9}
    >
      <Box
        bg="white"
        border="1px solid"
        borderColor="#f2f2f2"
        borderRadius="20px"
        boxShadow="0 12px 32px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        gap={5}
        maxH="calc(100dvh - 80px)"
        maxW="720px"
        overflowY="auto"
        px={8}
        py={7}
        w="full"
      >
        <Box
          alignItems="flex-start"
          display="flex"
          justifyContent="space-between"
        >
          <Box>
            <Text fontSize="xl" fontWeight="bold">
              {title}
            </Text>
            <Text color="text.secondary" fontSize="sm" mt={2}>
              {description}
            </Text>
          </Box>
          <Box cursor="pointer" flexShrink={0} onClick={closeNodeSetup}>
            <Icon as={MdCancel} boxSize={6} color="gray.600" />
          </Box>
        </Box>

        {!activeNode ? (
          <Text color="text.secondary" fontSize="sm">
            설정할 노드를 찾을 수 없습니다.
          </Text>
        ) : isCatalogLoading ? (
          <Box alignItems="center" display="flex" gap={2}>
            <Spinner color="gray.500" size="sm" />
            <Text color="text.secondary" fontSize="sm">
              설정 정보를 불러오는 중입니다.
            </Text>
          </Box>
        ) : !activeService ? (
          <Text color="red.500" fontSize="sm">
            이 노드의 서비스 정보를 찾을 수 없습니다.
          </Text>
        ) : (
          <Box display="flex" flexDirection="column" gap={5}>
            <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)">
              <Box bg="gray.50" borderRadius="2xl" px={4} py={3}>
                <Text color="text.secondary" fontSize="xs">
                  서비스
                </Text>
                <Text fontSize="sm" fontWeight="semibold" mt={1}>
                  {activeService.label}
                </Text>
              </Box>

              {activeNodeSetupSession.role === "start" && sourceMode ? (
                <Box bg="gray.50" borderRadius="2xl" px={4} py={3}>
                  <Text color="text.secondary" fontSize="xs">
                    가져오는 방식
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" mt={1}>
                    {sourceMode.label}
                  </Text>
                  <Text color="text.secondary" fontSize="xs" mt={1}>
                    {getTriggerKindLabel(sourceMode.trigger_kind)}
                  </Text>
                </Box>
              ) : null}

              {activeNodeSetupSession.role === "end" ? (
                <Box bg="gray.50" borderRadius="2xl" px={4} py={3}>
                  <Text color="text.secondary" fontSize="xs">
                    보낼 데이터
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" mt={1}>
                    {getDataTypeDisplayLabel(backendSinkInputType) ??
                      "데이터 확인 필요"}
                  </Text>
                </Box>
              ) : null}
            </Box>

            {authState ? (
              <AuthPrompt
                authState={authState}
                isConnecting={connectOAuthMutation.isPending}
                onConnect={() => handleConnectService(activeService.key)}
              />
            ) : null}

            {authErrorMessage ? (
              <Text color="red.500" fontSize="sm">
                {authErrorMessage}
              </Text>
            ) : null}

            {activeNodeSetupSession.role === "start" && sourceMode ? (
              hasTargetSchema(sourceMode.target_schema) ? (
                <Box display="flex" flexDirection="column" gap={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">
                      가져올 대상
                    </Text>
                    {existingTargetLabel ? (
                      <Text color="text.secondary" fontSize="xs" mt={1}>
                        현재 선택: {existingTargetLabel}
                      </Text>
                    ) : null}
                  </Box>
                  <SourceTargetForm
                    disabled={!canEditSetup}
                    mode={sourceMode}
                    serviceKey={activeService.key}
                    value={sourceTargetValue}
                    onChange={handleSourceTargetChange}
                  />
                  {!isSourceComplete ? (
                    <Text color="orange.500" fontSize="xs">
                      필수 대상이 비어 있으면 저장 후에도 미설정 상태로
                      표시됩니다.
                    </Text>
                  ) : null}
                </Box>
              ) : (
                <Text color="text.secondary" fontSize="sm">
                  이 가져오기 방식은 추가 대상 선택 없이 사용할 수 있습니다.
                </Text>
              )
            ) : null}

            {activeNodeSetupSession.role === "end" ? (
              isSinkSchemaLoading ? (
                <Box alignItems="center" display="flex" gap={2}>
                  <Spinner color="gray.500" size="sm" />
                  <Text color="text.secondary" fontSize="sm">
                    도착 설정 항목을 불러오는 중입니다.
                  </Text>
                </Box>
              ) : sinkSchema ? (
                <SinkSchemaEditor
                  key={`${activeNode.id}:${activeService.key}:${backendSinkInputType ?? "none"}`}
                  fields={sinkSchema.fields}
                  readOnly={!canEditSetup}
                  serviceKey={activeService.key}
                  sinkConfig={activeNode.data.config as never}
                  onApply={handleApplySinkSetup}
                />
              ) : (
                <Text color="text.secondary" fontSize="sm">
                  보낼 데이터 타입에 맞는 도착 설정을 찾을 수 없습니다.
                </Text>
              )
            ) : null}

            {activeNodeSetupSession.role === "start" ? (
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button variant="outline" onClick={closeNodeSetup}>
                  닫기
                </Button>
                <Button
                  disabled={!canEditSetup}
                  onClick={handleApplySourceSetup}
                >
                  설정 적용
                </Button>
              </Box>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
};
