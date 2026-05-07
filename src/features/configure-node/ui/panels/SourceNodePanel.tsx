import { useMemo, useState } from "react";

import { Box, Button, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  getOAuthConnectionUiState,
  useConnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities/oauth-token";
import {
  getTriggerKindLabel,
  useSourceCatalogQuery,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";
import {
  getApiErrorMessage,
  getCurrentRelativeUrl,
  storeOAuthConnectReturnPath,
} from "@/shared";

import {
  type NodePanelProps,
  type SourceTargetSetupValue,
  buildSourceNodeConfigDraft,
  createEmptySourceTargetSetupValue,
  hasTargetSchema,
  isSourceNodeSetupComplete,
} from "../../model";

import { AuthPrompt } from "./AuthPrompt";
import { NodePanelShell } from "./NodePanelShell";
import { SourceTargetForm } from "./SourceTargetForm";

type SourceTargetDraftState = {
  scope: string;
  value: SourceTargetSetupValue;
};

const toConfigRecord = (config: FlowNodeData["config"] | null | undefined) =>
  (config ?? {}) as unknown as Record<string, unknown>;

const getStringConfigValue = (
  config: FlowNodeData["config"] | null | undefined,
  key: string,
) => {
  const value = toConfigRecord(config)[key];
  return typeof value === "string" ? value : null;
};

const createInitialSourceTargetValue = (
  config: FlowNodeData["config"],
): SourceTargetSetupValue => ({
  option: null,
  value: getStringConfigValue(config, "target") ?? "",
});

const findConnectedServiceKeys = (
  tokens: Awaited<ReturnType<typeof useOAuthTokensQuery>>["data"],
) =>
  new Set(
    (tokens ?? [])
      .filter((token) => token.connected)
      .map((token) => token.service),
  );

export const SourceNodePanel = ({
  data,
  nodeId,
  onCancel,
  onComplete,
  readOnly = false,
}: NodePanelProps) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { data: sourceCatalog, isLoading: isSourceCatalogLoading } =
    useSourceCatalogQuery();
  const {
    data: oauthTokens,
    isError: isOAuthTokensError,
    isLoading: isOAuthTokensLoading,
    refetch: refetchOAuthTokens,
  } = useOAuthTokensQuery({ enabled: !readOnly });
  const connectOAuthMutation = useConnectOAuthTokenMutation();
  const [sourceTargetDraft, setSourceTargetDraft] =
    useState<SourceTargetDraftState>({
      scope: "",
      value: createEmptySourceTargetSetupValue(),
    });
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const serviceKey = getStringConfigValue(data.config, "service");
  const sourceModeKey = getStringConfigValue(data.config, "source_mode");
  const sourceService =
    sourceCatalog?.services.find((service) => service.key === serviceKey) ??
    null;
  const sourceMode =
    sourceService?.source_modes.find((mode) => mode.key === sourceModeKey) ??
    null;
  const sourceTargetScope = `${nodeId}:${sourceMode?.key ?? ""}`;
  const initialSourceTargetValue = createInitialSourceTargetValue(data.config);
  const sourceTargetValue =
    sourceTargetDraft.scope === sourceTargetScope
      ? sourceTargetDraft.value
      : initialSourceTargetValue;
  const connectedServiceKeys = useMemo(
    () => findConnectedServiceKeys(oauthTokens),
    [oauthTokens],
  );
  const authState = sourceService
    ? getOAuthConnectionUiState({
        authRequired: sourceService.auth_required,
        connected: connectedServiceKeys.has(sourceService.key),
        isAuthStatusError: isOAuthTokensError,
        isAuthStatusLoading: isOAuthTokensLoading,
        serviceKey: sourceService.key,
      })
    : null;
  const canEditSetup =
    !readOnly &&
    Boolean(sourceService) &&
    (!sourceService?.auth_required || authState?.key === "connected");
  const sourceNextConfig =
    sourceMode && sourceService
      ? buildSourceNodeConfigDraft({
          currentConfig: data.config,
          targetSchema: sourceMode.target_schema,
          targetValue: sourceTargetValue,
        })
      : null;
  const isSourceComplete =
    sourceNextConfig && sourceMode
      ? isSourceNodeSetupComplete(sourceNextConfig, sourceMode.target_schema)
      : false;
  const existingTargetLabel = getStringConfigValue(data.config, "target_label");

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

  const handleSourceTargetChange = (value: SourceTargetSetupValue) => {
    setSourceTargetDraft({
      scope: sourceTargetScope,
      value,
    });
  };

  const handleApplySourceSetup = () => {
    if (!sourceMode) {
      return;
    }

    updateNodeConfig(
      nodeId,
      buildSourceNodeConfigDraft({
        currentConfig: data.config,
        targetSchema: sourceMode.target_schema,
        targetValue: sourceTargetValue,
      }),
    );
    onComplete?.();
  };

  return (
    <NodePanelShell
      description="서비스와 가져오는 방식은 유지하고, 이 워크플로우에서 사용할 대상을 다시 선택합니다."
      eyebrow="가져올 곳 설정"
      title={sourceService?.label ?? "Source"}
    >
      {isSourceCatalogLoading ? (
        <Box alignItems="center" display="flex" gap={2}>
          <Spinner color="gray.500" size="sm" />
          <Text color="text.secondary" fontSize="sm">
            설정 정보를 불러오는 중입니다.
          </Text>
        </Box>
      ) : !sourceService || !sourceMode ? (
        <Text color="red.500" fontSize="sm">
          이 노드의 가져오기 설정 정보를 찾을 수 없습니다.
        </Text>
      ) : (
        <Box display="flex" flexDirection="column" gap={5}>
          <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)">
            <Box bg="gray.50" borderRadius="2xl" px={4} py={3}>
              <Text color="text.secondary" fontSize="xs">
                서비스
              </Text>
              <Text fontSize="sm" fontWeight="semibold" mt={1}>
                {sourceService.label}
              </Text>
            </Box>
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
          </Box>

          {authState ? (
            <AuthPrompt
              authState={authState}
              isConnecting={connectOAuthMutation.isPending}
              onConnect={() => handleConnectService(sourceService.key)}
            />
          ) : null}

          {authErrorMessage ? (
            <Text color="red.500" fontSize="sm">
              {authErrorMessage}
            </Text>
          ) : null}

          {hasTargetSchema(sourceMode.target_schema) ? (
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
                serviceKey={sourceService.key}
                value={sourceTargetValue}
                onChange={handleSourceTargetChange}
              />
              {!isSourceComplete ? (
                <Text color="orange.500" fontSize="xs">
                  필수 대상이 비어 있으면 저장 후에도 미설정 상태로 표시됩니다.
                </Text>
              ) : null}
            </Box>
          ) : (
            <Text color="text.secondary" fontSize="sm">
              이 가져오기 방식은 추가 대상 선택 없이 사용할 수 있습니다.
            </Text>
          )}

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button size="sm" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button
              disabled={!canEditSetup}
              size="sm"
              onClick={handleApplySourceSetup}
            >
              설정 저장
            </Button>
          </Box>
        </Box>
      )}
    </NodePanelShell>
  );
};
