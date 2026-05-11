import { useMemo, useState } from "react";
import { MdClose, MdTableChart } from "react-icons/md";

import { Box, Button, Icon, IconButton, Input, Text } from "@chakra-ui/react";

import {
  type FlowNodeData,
  getNodePresentation,
  getTypedConfig,
} from "@/entities/node";
import {
  type SourceTargetOptionItemResponse,
  getWorkflowMetadataSummary,
  useCreateGoogleSheetMutation,
  useCreateGoogleSheetsSpreadsheetMutation,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";
import {
  getGoogleSheetsSelectedSheetOptionId,
  getGoogleSheetsSheetName,
  getGoogleSheetsSpreadsheetId,
} from "@/entities/workflow/lib/google-sheets-target-option";
import { useWorkflowStore } from "@/features/workflow-editor";
import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";
import { toaster } from "@/shared/utils";

import { type NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

const GOOGLE_SHEETS_PICKER_MODE = "sheet_all";

type SpreadsheetDraftValues = {
  action: "read_range" | "search_text" | "lookup_row_by_key";
  lookupField: string;
  lookupSource: "value" | "input_field";
  lookupValue: string;
  keyColumn: string;
  matchMode: "contains" | "exact" | "starts_with";
  rangeA1: string;
  resultLimit: string;
  searchColumns: string;
  searchField: string;
  searchSource: "value" | "input_field";
  searchValue: string;
  sheetName: string;
  spreadsheetId: string;
  spreadsheetLabel: string;
};

type SpreadsheetDraftState = {
  scope: string;
  values: SpreadsheetDraftValues;
};

type PickerState = {
  path: SourceTargetOptionItemResponse[];
  scope: string;
  searchQuery: string;
};

const ACTION_OPTIONS = [
  {
    description: "선택한 범위를 읽어 다음 단계로 넘깁니다.",
    key: "read_range",
    label: "범위 읽기",
  },
  {
    description: "시트에서 특정 텍스트가 들어간 행을 찾습니다.",
    key: "search_text",
    label: "텍스트 검색",
  },
  {
    description: "기준 컬럼 값으로 한 행을 찾아서 사용합니다.",
    key: "lookup_row_by_key",
    label: "기준 컬럼 조회",
  },
] as const;

const MATCH_MODE_OPTIONS = [
  { key: "contains", label: "포함" },
  { key: "exact", label: "정확히 일치" },
  { key: "starts_with", label: "시작값 일치" },
] as const;

const createPickerState = (scope: string): PickerState => ({
  path: [],
  scope,
  searchQuery: "",
});

const getStringValue = (
  config: FlowNodeData["config"],
  key: string,
  fallback = "",
) => {
  const value = (config as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : fallback;
};

const createInitialDraftValues = (
  config: FlowNodeData["config"],
): SpreadsheetDraftValues => {
  const typedConfig = getTypedConfig("spreadsheet", config);
  const spreadsheetId =
    typedConfig.spreadsheet_id ?? typedConfig.spreadsheetId ?? "";
  const sheetName = typedConfig.sheet_name ?? typedConfig.sheetName ?? "";
  const label =
    getStringValue(config, "spreadsheet_id_label") ||
    getStringValue(config, "target_label") ||
    spreadsheetId;

  return {
    action: typedConfig.action ?? "read_range",
    keyColumn: getStringValue(config, "key_column"),
    lookupField: getStringValue(config, "lookup_field"),
    lookupSource:
      getStringValue(config, "lookup_source") === "input_field"
        ? "input_field"
        : "value",
    lookupValue: getStringValue(config, "lookup_value"),
    matchMode:
      (getStringValue(
        config,
        "match_mode",
      ) as SpreadsheetDraftValues["matchMode"]) || "contains",
    rangeA1: typedConfig.range_a1 ?? typedConfig.range ?? "",
    resultLimit: getStringValue(config, "result_limit"),
    searchColumns: getStringValue(config, "search_columns"),
    searchField: getStringValue(config, "search_field"),
    searchSource:
      getStringValue(config, "search_source") === "input_field"
        ? "input_field"
        : "value",
    searchValue: getStringValue(config, "search_value"),
    sheetName,
    spreadsheetId,
    spreadsheetLabel: label,
  };
};

const isConfigured = (values: SpreadsheetDraftValues) => {
  if (
    !values.action ||
    !values.spreadsheetId.trim() ||
    !values.sheetName.trim()
  ) {
    return false;
  }

  if (values.action === "search_text") {
    return values.searchSource === "input_field"
      ? values.searchField.trim().length > 0
      : values.searchValue.trim().length > 0;
  }

  if (values.action === "lookup_row_by_key") {
    if (!getTrimmed(values.keyColumn)) {
      return false;
    }

    return values.lookupSource === "input_field"
      ? values.lookupField.trim().length > 0
      : values.lookupValue.trim().length > 0;
  }

  return true;
};

const getTrimmed = (value: string) => value.trim();

const buildConfigFromDraft = (
  currentConfig: FlowNodeData["config"],
  values: SpreadsheetDraftValues,
) => {
  const nextConfig = {
    ...(currentConfig as unknown as Record<string, unknown>),
    service: "google_sheets",
    action: values.action,
    spreadsheet_id: getTrimmed(values.spreadsheetId) || "",
    spreadsheet_id_label: getTrimmed(values.spreadsheetLabel) || "",
    sheet_name: getTrimmed(values.sheetName) || "",
    range_a1: getTrimmed(values.rangeA1) || "",
    search_source: values.searchSource,
    search_field: getTrimmed(values.searchField) || "",
    search_value: getTrimmed(values.searchValue) || "",
    search_columns: getTrimmed(values.searchColumns) || "",
    match_mode: values.matchMode,
    result_limit: getTrimmed(values.resultLimit) || "",
    lookup_source: values.lookupSource,
    lookup_field: getTrimmed(values.lookupField) || "",
    lookup_value: getTrimmed(values.lookupValue) || "",
    key_column: getTrimmed(values.keyColumn) || "",
    isConfigured: false,
  } as unknown as FlowNodeData["config"];

  (nextConfig as unknown as Record<string, unknown>).isConfigured =
    isConfigured(values);

  return nextConfig;
};

export const SpreadsheetPanel = ({
  data,
  nodeId,
  onCancel,
  onComplete,
  readOnly = false,
}: NodePanelProps) => {
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeIds = useWorkflowStore((state) => state.endNodeIds);
  const replaceNodeConfig = useWorkflowStore(
    (state) => state.replaceNodeConfig,
  );
  const presentation = getNodePresentation(data, {
    nodeId,
    startNodeId,
    endNodeIds,
    workflowRole: data.workflowRole,
  });

  const draftScope = `${nodeId}:spreadsheet`;
  const initialValues = createInitialDraftValues(data.config);
  const [draftState, setDraftState] = useState<SpreadsheetDraftState>({
    scope: draftScope,
    values: initialValues,
  });
  const values =
    draftState.scope === draftScope ? draftState.values : initialValues;
  const pickerScope = `${nodeId}:spreadsheet-picker`;
  const [pickerState, setPickerState] = useState<PickerState>(() =>
    createPickerState(pickerScope),
  );
  const activePickerState =
    pickerState.scope === pickerScope
      ? pickerState
      : createPickerState(pickerScope);
  const { path, searchQuery } = activePickerState;
  const parentId = path.length > 0 ? path[path.length - 1]?.id : undefined;
  const pickerPath = path.map(({ id, label }) => ({ id, label }));
  const {
    data: targetOptions,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteSourceTargetOptionsQuery(
    "google_sheets",
    {
      mode: GOOGLE_SHEETS_PICKER_MODE,
      parentId,
      query: searchQuery,
    },
    {
      enabled: !readOnly,
      staleTime: 1000 * 30,
    },
  );
  const items =
    targetOptions?.pages.flatMap((page) => page.items) ??
    ([] as SourceTargetOptionItemResponse[]);
  const currentSpreadsheet = path.length > 0 ? path[path.length - 1] : null;
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const createSpreadsheetMutation = useCreateGoogleSheetsSpreadsheetMutation({
    showErrorToast: true,
    errorMessage: "Google Sheets 스프레드시트 생성에 실패했습니다.",
  });
  const createSheetMutation = useCreateGoogleSheetMutation({
    showErrorToast: true,
    errorMessage: "Google Sheets 시트 생성에 실패했습니다.",
  });
  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [initialValues, values],
  );

  const updateDraft = <K extends keyof SpreadsheetDraftValues>(
    key: K,
    value: SpreadsheetDraftValues[K],
  ) => {
    setDraftState((current) => ({
      scope: draftScope,
      values: {
        ...(current.scope === draftScope ? current.values : initialValues),
        [key]: value,
      },
    }));
  };

  const setScopedSearchQuery = (nextQuery: string) => {
    setPickerState((current) => ({
      ...(current.scope === pickerScope
        ? current
        : createPickerState(pickerScope)),
      searchQuery: nextQuery,
    }));
  };

  const handleBrowseOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption || sourceOption.type !== "spreadsheet") {
      return;
    }

    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createPickerState(pickerScope);

      return {
        ...base,
        path: [...base.path, sourceOption],
        searchQuery: "",
      };
    });
  };

  const handleSelectSheet = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption) {
      return;
    }

    if (sourceOption.type === "spreadsheet") {
      handleBrowseOption(option);
      return;
    }

    updateDraft("spreadsheetId", getGoogleSheetsSpreadsheetId(sourceOption));
    updateDraft("spreadsheetLabel", sourceOption.label);
    const sheetName = getGoogleSheetsSheetName(sourceOption);
    if (sheetName) {
      updateDraft("sheetName", sheetName);
    }
  };

  const handleCreateSpreadsheet = async () => {
    const trimmedName = newSpreadsheetName.trim();
    if (readOnly || trimmedName.length === 0) {
      return;
    }

    try {
      const createdSpreadsheet = await createSpreadsheetMutation.mutateAsync({
        name: trimmedName,
      });
      setPickerState((current) => {
        const base =
          current.scope === pickerScope
            ? current
            : createPickerState(pickerScope);

        return {
          ...base,
          path: [createdSpreadsheet],
          searchQuery: "",
        };
      });
      setNewSpreadsheetName("");
      setNewSheetName("");
      updateDraft("spreadsheetId", "");
      updateDraft("spreadsheetLabel", "");
      updateDraft("sheetName", "");
      toaster.create({
        type: "success",
        description: "새 스프레드시트를 만들고 바로 열었습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  const handleCreateSheet = async () => {
    const trimmedSheetName = newSheetName.trim();
    if (!currentSpreadsheet || readOnly || trimmedSheetName.length === 0) {
      return;
    }

    try {
      const createdSheet = await createSheetMutation.mutateAsync({
        spreadsheetId: currentSpreadsheet.id,
        sheetName: trimmedSheetName,
      });
      setNewSheetName("");
      updateDraft("spreadsheetId", getGoogleSheetsSpreadsheetId(createdSheet));
      updateDraft("spreadsheetLabel", createdSheet.label);
      const sheetName = getGoogleSheetsSheetName(createdSheet);
      if (sheetName) {
        updateDraft("sheetName", sheetName);
      }
      toaster.create({
        type: "success",
        description: "시트를 준비하고 바로 선택했습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  const handleSave = () => {
    replaceNodeConfig(nodeId, buildConfigFromDraft(data.config, values));
    onComplete?.();
  };

  return (
    <NodePanelShell
      eyebrow={presentation.roleLabel}
      title="Google Sheets"
      description="시트 범위를 읽거나, 특정 텍스트를 찾거나, 기준 컬럼으로 한 행을 조회합니다."
    >
      <Box display="flex" flexDirection="column" gap={5}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="semibold">
            동작
          </Text>
          <Box display="flex" flexDirection="column" gap={2}>
            {ACTION_OPTIONS.map((option) => (
              <Box
                key={option.key}
                bg={values.action === option.key ? "blue.50" : "gray.50"}
                border="1px solid"
                borderColor={
                  values.action === option.key ? "blue.200" : "gray.100"
                }
                borderRadius="xl"
                cursor={readOnly ? "default" : "pointer"}
                px={4}
                py={3}
                onClick={() => {
                  if (!readOnly) {
                    updateDraft("action", option.key);
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
            ))}
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          <Text fontSize="sm" fontWeight="semibold">
            시트 선택
          </Text>

          {values.spreadsheetId ? (
            <Box
              alignItems="center"
              bg="gray.50"
              borderRadius="xl"
              display="flex"
              gap={3}
              justifyContent="space-between"
              px={4}
              py={3}
            >
              <Box minW={0}>
                <Text color="text.secondary" fontSize="xs">
                  선택된 시트
                </Text>
                <Text fontSize="sm" fontWeight="semibold" truncate>
                  {values.spreadsheetLabel || values.spreadsheetId}
                </Text>
              </Box>
              <IconButton
                aria-label="Clear selected sheet"
                disabled={readOnly}
                size="xs"
                variant="ghost"
                onClick={() => {
                  updateDraft("spreadsheetId", "");
                  updateDraft("spreadsheetLabel", "");
                  updateDraft("sheetName", "");
                }}
              >
                <Icon as={MdClose} boxSize={4} />
              </IconButton>
            </Box>
          ) : null}

          <RemoteOptionPicker
            canBrowseItem={(option) => option.type === "spreadsheet"}
            disabled={readOnly}
            emptyMessage="선택할 수 있는 시트가 없습니다."
            errorMessage={isError ? getApiErrorMessage(error) : null}
            getBrowseLabel={(option) => `${option.label} 하위 시트 보기`}
            getItemIcon={() => MdTableChart}
            hasMore={Boolean(hasNextPage)}
            isLoading={isLoading}
            isLoadingMore={isFetchingNextPage}
            items={items}
            path={pickerPath}
            renderItemMetadata={(option) => {
              const summary = getWorkflowMetadataSummary(option.metadata);
              return summary ? (
                <Text color="text.secondary" fontSize="xs">
                  {summary}
                </Text>
              ) : null;
            }}
            rootLabel="Google Sheets"
            searchPlaceholder="시트 검색"
            searchValue={searchQuery}
            selectedId={getGoogleSheetsSelectedSheetOptionId({
              spreadsheetId: values.spreadsheetId,
              sheetName: values.sheetName,
            })}
            onBrowse={handleBrowseOption}
            onLoadMore={() => void fetchNextPage()}
            onPathSelect={(index) => {
              setPickerState((current) => ({
                ...(current.scope === pickerScope
                  ? current
                  : createPickerState(pickerScope)),
                path: path.slice(0, index + 1),
                searchQuery: "",
              }));
            }}
            onResetPath={() => setPickerState(createPickerState(pickerScope))}
            onRetry={() => void refetch()}
            onSearchChange={setScopedSearchQuery}
            onSelect={handleSelectSheet}
          />

          {currentSpreadsheet ? (
            <Box display="flex" flexDirection="column" gap={2}>
              <Text color="text.secondary" fontSize="xs">
                현재 스프레드시트에 원하는 탭이 없으면 새 시트를 만들 수
                있습니다.
              </Text>
              <Box display="flex" gap={2}>
                <Input
                  disabled={readOnly}
                  placeholder="새 시트 이름"
                  value={newSheetName}
                  onChange={(event) => setNewSheetName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreateSheet();
                    }
                  }}
                />
                <Button
                  disabled={readOnly || newSheetName.trim().length === 0}
                  flexShrink={0}
                  loading={createSheetMutation.isPending}
                  onClick={() => void handleCreateSheet()}
                >
                  새 시트 만들기
                </Button>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              <Text color="text.secondary" fontSize="xs">
                원하는 스프레드시트가 없으면 새 파일을 만들고 바로 들어갈 수
                있습니다.
              </Text>
              <Box display="flex" gap={2}>
                <Input
                  disabled={readOnly}
                  placeholder="새 스프레드시트 이름"
                  value={newSpreadsheetName}
                  onChange={(event) =>
                    setNewSpreadsheetName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreateSpreadsheet();
                    }
                  }}
                />
                <Button
                  disabled={readOnly || newSpreadsheetName.trim().length === 0}
                  flexShrink={0}
                  loading={createSpreadsheetMutation.isPending}
                  onClick={() => void handleCreateSpreadsheet()}
                >
                  새 스프레드시트 만들기
                </Button>
              </Box>
            </Box>
          )}

          <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                시트 이름
              </Text>
              <Input
                disabled={readOnly}
                value={values.sheetName}
                onChange={(event) =>
                  updateDraft("sheetName", event.target.value)
                }
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                범위 (A1)
              </Text>
              <Input
                disabled={readOnly}
                placeholder="예: A1:F200"
                value={values.rangeA1}
                onChange={(event) => updateDraft("rangeA1", event.target.value)}
              />
            </Box>
          </Box>
        </Box>

        {values.action === "search_text" ? (
          <Box display="flex" flexDirection="column" gap={3}>
            <Text fontSize="sm" fontWeight="semibold">
              검색 설정
            </Text>
            <Box display="flex" gap={2}>
              {[
                { key: "value", label: "직접 입력" },
                { key: "input_field", label: "이전 노드 필드" },
              ].map((option) => (
                <Button
                  key={option.key}
                  disabled={readOnly}
                  size="sm"
                  variant={
                    values.searchSource === option.key ? "solid" : "outline"
                  }
                  onClick={() =>
                    updateDraft(
                      "searchSource",
                      option.key as SpreadsheetDraftValues["searchSource"],
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </Box>
            <Input
              disabled={readOnly}
              placeholder={
                values.searchSource === "input_field"
                  ? "이전 노드 필드명"
                  : "찾을 텍스트"
              }
              value={
                values.searchSource === "input_field"
                  ? values.searchField
                  : values.searchValue
              }
              onChange={(event) =>
                values.searchSource === "input_field"
                  ? updateDraft("searchField", event.target.value)
                  : updateDraft("searchValue", event.target.value)
              }
            />
            <Input
              disabled={readOnly}
              placeholder="검색할 컬럼들 (쉼표로 구분, 비우면 전체)"
              value={values.searchColumns}
              onChange={(event) =>
                updateDraft("searchColumns", event.target.value)
              }
            />
            <Box display="flex" gap={2} flexWrap="wrap">
              {MATCH_MODE_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  disabled={readOnly}
                  size="sm"
                  variant={
                    values.matchMode === option.key ? "solid" : "outline"
                  }
                  onClick={() =>
                    updateDraft(
                      "matchMode",
                      option.key as SpreadsheetDraftValues["matchMode"],
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </Box>
            <Input
              disabled={readOnly}
              placeholder="최대 결과 수"
              type="number"
              value={values.resultLimit}
              onChange={(event) =>
                updateDraft("resultLimit", event.target.value)
              }
            />
          </Box>
        ) : null}

        {values.action === "lookup_row_by_key" ? (
          <Box display="flex" flexDirection="column" gap={3}>
            <Text fontSize="sm" fontWeight="semibold">
              조회 설정
            </Text>
            <Input
              disabled={readOnly}
              placeholder="기준 컬럼명"
              value={values.keyColumn}
              onChange={(event) => updateDraft("keyColumn", event.target.value)}
            />
            <Box display="flex" gap={2}>
              {[
                { key: "value", label: "직접 입력" },
                { key: "input_field", label: "이전 노드 필드" },
              ].map((option) => (
                <Button
                  key={option.key}
                  disabled={readOnly}
                  size="sm"
                  variant={
                    values.lookupSource === option.key ? "solid" : "outline"
                  }
                  onClick={() =>
                    updateDraft(
                      "lookupSource",
                      option.key as SpreadsheetDraftValues["lookupSource"],
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </Box>
            <Input
              disabled={readOnly}
              placeholder={
                values.lookupSource === "input_field"
                  ? "이전 노드 필드명"
                  : "찾을 기준 값"
              }
              value={
                values.lookupSource === "input_field"
                  ? values.lookupField
                  : values.lookupValue
              }
              onChange={(event) =>
                values.lookupSource === "input_field"
                  ? updateDraft("lookupField", event.target.value)
                  : updateDraft("lookupValue", event.target.value)
              }
            />
          </Box>
        ) : null}

        <Box
          alignItems={{ base: "stretch", md: "center" }}
          display="flex"
          flexDirection={{ base: "column", md: "row" }}
          gap={3}
          justifyContent="space-between"
        >
          <Text color="text.secondary" fontSize="xs">
            {hasChanges
              ? "저장되지 않은 변경 사항이 있습니다."
              : "현재 설정이 editor store에 반영된 상태입니다."}
          </Text>

          <Box display="flex" gap={2} justifyContent="flex-end">
            {onCancel ? (
              <Button size="sm" variant="outline" onClick={onCancel}>
                취소
              </Button>
            ) : null}
            <Button disabled={readOnly} size="sm" onClick={handleSave}>
              설정 저장
            </Button>
          </Box>
        </Box>
      </Box>
    </NodePanelShell>
  );
};
