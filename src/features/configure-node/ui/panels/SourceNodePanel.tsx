import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Box, Button, Input, Spinner, Text } from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  getOAuthConnectionUiState,
  getServiceConnectionKind,
  useConnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities/oauth-token";
import {
  getPrimarySourceModeLabel,
  getSourceModeTargetScopeKey,
  getTriggerKindLabel,
  isSeBoardNewPostsSourceMode,
  useSourceCatalogQuery,
} from "@/entities/workflow";
import { buildGoogleSheetsSheetOptionId } from "@/entities/workflow/lib/google-sheets-target-option";
import { useWorkflowStore } from "@/features/workflow-editor";
import {
  ROUTE_PATHS,
  getApiErrorMessage,
  getCurrentRelativeUrl,
  storeOAuthConnectReturnPath,
} from "@/shared";

import {
  type NodePanelProps,
  type SourceTargetSetupValue,
  buildSourceNodeConfigDraft,
  createEmptySourceTargetSetupValue,
  getGoogleSheetsInitialSyncPresentation,
  getGoogleSheetsSourceModeDescription,
  getSourceTargetSchemaValidationMessage,
  hasTargetSchema,
  isSourceNodeSetupComplete,
} from "../../model";

import { AuthPrompt } from "./AuthPrompt";
import { NodePanelShell } from "./NodePanelShell";
import { SourceTargetForm } from "./SourceTargetForm";

const GOOGLE_SHEETS_SERVICE_KEY = "google_sheets";

type SourceTargetDraftState = {
  scope: string;
  value: SourceTargetSetupValue;
};

type GoogleSheetsDraftValues = {
  dataStartRow: string;
  headerRow: string;
  initialSyncMode: string;
  keyColumn: string;
  rangeA1: string;
};

type GoogleSheetsDraftState = {
  scope: string;
  values: GoogleSheetsDraftValues;
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

const getNumberLikeConfigValue = (
  config: FlowNodeData["config"] | null | undefined,
  key: string,
) => {
  const value = toConfigRecord(config)[key];
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
};

const createInitialSourceTargetValue = (
  config: FlowNodeData["config"],
): SourceTargetSetupValue => ({
  keyword: getStringConfigValue(config, "keyword") ?? "",
  option: null,
  value: (() => {
    const target = getStringConfigValue(config, "target") ?? "";
    const service = getStringConfigValue(config, "service");

    if (service !== GOOGLE_SHEETS_SERVICE_KEY) {
      return target;
    }

    const spreadsheetId =
      getStringConfigValue(config, "spreadsheet_id") ?? target;
    const sheetName = getStringConfigValue(config, "sheet_name");

    if (!spreadsheetId || !sheetName) {
      return target;
    }

    return buildGoogleSheetsSheetOptionId(spreadsheetId, sheetName);
  })(),
});

const createInitialGoogleSheetsDraftValues = (
  config: FlowNodeData["config"],
): GoogleSheetsDraftValues => ({
  dataStartRow: getNumberLikeConfigValue(config, "data_start_row") ?? "2",
  headerRow: getNumberLikeConfigValue(config, "header_row") ?? "1",
  initialSyncMode:
    getStringConfigValue(config, "initial_sync_mode") ?? "skip_existing",
  keyColumn: getStringConfigValue(config, "key_column") ?? "",
  rangeA1: getStringConfigValue(config, "range_a1") ?? "",
});

const findConnectedServiceKeys = (
  tokens: Awaited<ReturnType<typeof useOAuthTokensQuery>>["data"],
) =>
  new Set(
    (tokens ?? [])
      .filter((token) => token.connected)
      .map((token) => token.service),
  );

const buildGoogleSheetsConfigDraft = (
  config: FlowNodeData["config"],
  draftValues: GoogleSheetsDraftValues,
): FlowNodeData["config"] =>
  ({
    ...config,
    range_a1: draftValues.rangeA1.trim() || "",
    header_row: draftValues.headerRow.trim() || "",
    data_start_row: draftValues.dataStartRow.trim() || "",
    initial_sync_mode: draftValues.initialSyncMode,
    key_column: draftValues.keyColumn.trim() || "",
  }) as FlowNodeData["config"];

export const SourceNodePanel = ({
  data,
  nodeId,
  onCancel,
  onComplete,
  readOnly = false,
}: NodePanelProps) => {
  const navigate = useNavigate();
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
  const [googleSheetsDraft, setGoogleSheetsDraft] =
    useState<GoogleSheetsDraftState>({
      scope: "",
      values: createInitialGoogleSheetsDraftValues(data.config),
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
  const sourceTargetScope = `${nodeId}:${getSourceModeTargetScopeKey(
    serviceKey,
    sourceMode?.key ?? null,
  )}`;
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
  const isGoogleSheetsSource = sourceService?.key === GOOGLE_SHEETS_SERVICE_KEY;
  const googleSheetsScope = `${nodeId}:${sourceMode?.key ?? ""}:google-sheets`;
  const initialGoogleSheetsDraftValues = createInitialGoogleSheetsDraftValues(
    data.config,
  );
  const googleSheetsDraftValues =
    googleSheetsDraft.scope === googleSheetsScope
      ? googleSheetsDraft.values
      : initialGoogleSheetsDraftValues;
  const draftConfigBase =
    sourceMode && isGoogleSheetsSource
      ? buildGoogleSheetsConfigDraft(data.config, googleSheetsDraftValues)
      : data.config;
  const sourceNextConfig =
    sourceMode && sourceService
      ? buildSourceNodeConfigDraft({
          currentConfig: draftConfigBase,
          targetSchema: sourceMode.target_schema,
          targetValue: sourceTargetValue,
        })
      : null;
  const sourceNextConfigWithMode =
    sourceNextConfig && sourceMode
      ? ({
          ...sourceNextConfig,
          canonical_input_type: sourceMode.canonical_input_type,
          source_mode: sourceMode.key,
          trigger_kind: sourceMode.trigger_kind,
        } as FlowNodeData["config"])
      : null;
  const isSourceComplete =
    sourceNextConfigWithMode && sourceMode
      ? isSourceNodeSetupComplete(
          sourceNextConfigWithMode,
          sourceMode.target_schema,
        )
      : false;
  const sourceTargetValidationMessage = sourceMode
    ? getSourceTargetSchemaValidationMessage(
        sourceMode.target_schema,
        sourceTargetValue.value,
      )
    : null;
  const existingTargetLabel = getStringConfigValue(data.config, "target_label");
  const existingKeyword = getStringConfigValue(data.config, "keyword");
  const shouldShowKeywordSummary =
    sourceService &&
    sourceMode &&
    isSeBoardNewPostsSourceMode(sourceService.key, sourceMode.key) &&
    existingKeyword;

  const handleConnectService = (targetServiceKey: string) => {
    if (getServiceConnectionKind(targetServiceKey) === "manual_token") {
      navigate(ROUTE_PATHS.SETTINGS);
      return;
    }

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

  const handleGoogleSheetsDraftChange = (
    key: keyof GoogleSheetsDraftValues,
    value: string,
  ) => {
    setGoogleSheetsDraft((current) => {
      const base =
        current.scope === googleSheetsScope
          ? current.values
          : initialGoogleSheetsDraftValues;

      return {
        scope: googleSheetsScope,
        values: {
          ...base,
          [key]: value,
        },
      };
    });
  };

  const handleApplySourceSetup = () => {
    if (
      !sourceNextConfigWithMode ||
      !sourceMode ||
      sourceTargetValidationMessage
    ) {
      return;
    }

    updateNodeConfig(nodeId, sourceNextConfigWithMode);
    onComplete?.();
  };

  return (
    <NodePanelShell
      description="서비스에서 데이터를 가져오는 방식과 사용할 시트 대상을 다시 설정합니다."
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
                {getPrimarySourceModeLabel(sourceService.key, sourceMode)}
              </Text>
              <Text color="text.secondary" fontSize="xs" mt={1}>
                {getTriggerKindLabel(sourceMode.trigger_kind)}
              </Text>
            </Box>
            {shouldShowKeywordSummary ? (
              <Box bg="gray.50" borderRadius="2xl" px={4} py={3}>
                <Text color="text.secondary" fontSize="xs">
                  포함할 단어
                </Text>
                <Text fontSize="sm" fontWeight="semibold" mt={1}>
                  {existingKeyword}
                </Text>
              </Box>
            ) : null}
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
            </Box>
          ) : (
            <Text color="text.secondary" fontSize="sm">
              이 가져오기 방식은 추가 대상 선택 없이 사용할 수 있습니다.
            </Text>
          )}

          {isGoogleSheetsSource ? (
            <Box display="flex" flexDirection="column" gap={4}>
              <Text fontSize="sm" fontWeight="semibold">
                Google Sheets 상세 설정
              </Text>

              <Box
                bg="blue.50"
                border="1px solid"
                borderColor="blue.100"
                borderRadius="xl"
                px={4}
                py={3}
              >
                <Text fontSize="sm" fontWeight="semibold">
                  이 설정으로 무엇을 가져오나요?
                </Text>
                <Text color="text.secondary" fontSize="xs" mt={1}>
                  {getGoogleSheetsSourceModeDescription(sourceMode.key)}
                </Text>
              </Box>
              <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    헤더 행
                  </Text>
                  <Input
                    disabled={!canEditSetup}
                    type="number"
                    value={googleSheetsDraftValues.headerRow}
                    onChange={(event) =>
                      handleGoogleSheetsDraftChange(
                        "headerRow",
                        event.target.value,
                      )
                    }
                  />
                  <Text color="text.secondary" fontSize="xs" mt={2}>
                    컬럼 이름이 들어 있는 행 번호입니다. 보통 첫 줄이면
                    `1`입니다.
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    데이터 시작 행
                  </Text>
                  <Input
                    disabled={!canEditSetup}
                    type="number"
                    value={googleSheetsDraftValues.dataStartRow}
                    onChange={(event) =>
                      handleGoogleSheetsDraftChange(
                        "dataStartRow",
                        event.target.value,
                      )
                    }
                  />
                  <Text color="text.secondary" fontSize="xs" mt={2}>
                    실제 데이터가 시작되는 첫 행 번호입니다. 헤더 다음 줄이면
                    보통 `2`입니다.
                  </Text>
                </Box>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  범위 (A1)
                </Text>
                <Input
                  disabled={!canEditSetup}
                  placeholder="예: A1:F200"
                  value={googleSheetsDraftValues.rangeA1}
                  onChange={(event) =>
                    handleGoogleSheetsDraftChange("rangeA1", event.target.value)
                  }
                />
                <Text color="text.secondary" fontSize="xs" mt={2}>
                  비워두면 선택한 시트 전체를 읽습니다. 특정 영역만 쓸 때만
                  `A1:F200`처럼 입력합니다.
                </Text>
              </Box>

              {(sourceMode.key === "new_row" ||
                sourceMode.key === "row_updated") && (
                <Box display="flex" flexDirection="column" gap={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    첫 실행 기준
                  </Text>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {["skip_existing", "emit_existing"].map((value) => {
                      const option =
                        getGoogleSheetsInitialSyncPresentation(value);

                      return (
                        <Box
                          key={option.value}
                          bg={
                            googleSheetsDraftValues.initialSyncMode ===
                            option.value
                              ? "blue.50"
                              : "gray.50"
                          }
                          border="1px solid"
                          borderColor={
                            googleSheetsDraftValues.initialSyncMode ===
                            option.value
                              ? "blue.200"
                              : "gray.100"
                          }
                          borderRadius="xl"
                          cursor={canEditSetup ? "pointer" : "default"}
                          px={4}
                          py={3}
                          onClick={() => {
                            if (canEditSetup) {
                              handleGoogleSheetsDraftChange(
                                "initialSyncMode",
                                option.value,
                              );
                            }
                          }}
                        >
                          <Text fontSize="sm" fontWeight="semibold">
                            {option.label}
                          </Text>
                          <Text color="text.secondary" fontSize="xs" mt={1}>
                            {option.description}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {sourceMode.key === "row_updated" ? (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    기준 컬럼
                  </Text>
                  <Input
                    disabled={!canEditSetup}
                    placeholder="예: id, email, student_no"
                    value={googleSheetsDraftValues.keyColumn}
                    onChange={(event) =>
                      handleGoogleSheetsDraftChange(
                        "keyColumn",
                        event.target.value,
                      )
                    }
                  />
                  <Text color="text.secondary" fontSize="xs" mt={2}>
                    수정 감지는 기준 컬럼 값이 같은 행끼리 비교해서 판단합니다.
                    변경이력 기준으로 자주 쓰는 값은 `email`, `id`, `order_id`
                    같은 중복되지 않는 컬럼입니다.
                  </Text>
                </Box>
              ) : null}

              {(sourceMode.key === "new_row" ||
                sourceMode.key === "row_updated") && (
                <Box bg="gray.50" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="sm" fontWeight="semibold">
                    실행 결과 이해하기
                  </Text>
                  <Text color="text.secondary" fontSize="xs" mt={1}>
                    이 모드는 시트 전체를 매번 다시 넘기지 않고, 설정한 기준에
                    따라 새로 추가되거나 수정된 행만 다음 단계로 전달합니다.
                  </Text>
                </Box>
              )}
            </Box>
          ) : null}

          {!isSourceComplete ? (
            <Text color="orange.500" fontSize="xs">
              필수 값이 비어 있으면 이 노드는 미설정 상태로 표시됩니다.
            </Text>
          ) : null}

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button size="sm" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button
              disabled={!canEditSetup || Boolean(sourceTargetValidationMessage)}
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
