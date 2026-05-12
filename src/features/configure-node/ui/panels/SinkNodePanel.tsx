import { useEffect, useMemo, useState } from "react";
import {
  MdClose,
  MdDescription,
  MdFolder,
  MdForum,
  MdTableChart,
} from "react-icons/md";

import {
  Box,
  Button,
  Icon,
  IconButton,
  Input,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type SinkSchemaFieldResponse,
  type SinkTargetOptionItemResponse,
  type SourceTargetOptionItemResponse,
  getDataTypeDisplayLabel,
  getNodeStatusMissingFieldLabel,
  getSchemaValueTypeLabel,
  getWorkflowMetadataSummary,
  toBackendDataType,
  toEdgeDefinition,
  toNodeDefinition,
  useCreateGoogleDriveFolderMutation,
  useCreateGoogleSheetMutation,
  useCreateGoogleSheetsSpreadsheetMutation,
  useInfiniteSinkTargetOptionsQuery,
  useInfiniteSourceTargetOptionsQuery,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
  useWorkflowSchemaPreviewMutation,
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

import {
  type NodePanelProps,
  getGoogleSheetsWriteModePresentation,
  getSinkFieldPresentation,
  shouldShowSinkSchemaPreview,
} from "../../model";

import { NodePanelShell } from "./NodePanelShell";

const GOOGLE_DRIVE_SERVICE_KEY = "google_drive";
const GOOGLE_DRIVE_FOLDER_PICKER_MODE = "folder_all_files";
const REMOTE_PICKER_FIELD_TYPES = new Set([
  "folder_picker",
  "channel_picker",
  "page_picker",
  "sheet_picker",
]);
const SINK_TARGET_OPTION_TYPES: Partial<Record<string, string>> = {
  channel_picker: "channel",
  page_picker: "page",
  sheet_picker: "sheet",
};

type DraftValues = Record<string, string>;
type AuxiliaryDraftValues = Record<string, unknown>;
type FolderPickerState = {
  folderPath: SourceTargetOptionItemResponse[];
  scope: string;
  searchQuery: string;
};

type PickerOptionLike = {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
};

const getAuxiliaryLabelKey = (fieldKey: string) => `${fieldKey}_label`;

const getAuxiliaryMetaKey = (fieldKey: string) => `${fieldKey}_meta`;

const isRemotePickerField = (fieldType: string) =>
  REMOTE_PICKER_FIELD_TYPES.has(fieldType);

const getAuxiliaryFieldKeys = (fields: SinkSchemaFieldResponse[]) =>
  fields.flatMap((field) =>
    isRemotePickerField(field.type)
      ? [getAuxiliaryLabelKey(field.key), getAuxiliaryMetaKey(field.key)]
      : [],
  );

const getInitialDraftValues = (
  fields: SinkSchemaFieldResponse[],
  sinkConfig: Record<string, unknown>,
) =>
  Object.fromEntries(
    fields.map((field) => {
      const rawValue = sinkConfig[field.key];
      const stringValue =
        typeof rawValue === "string" || typeof rawValue === "number"
          ? String(rawValue)
          : "";

      return [field.key, stringValue];
    }),
  );

const getInitialAuxiliaryDraftValues = (
  fields: SinkSchemaFieldResponse[],
  sinkConfig: Record<string, unknown>,
) => {
  const entries = getAuxiliaryFieldKeys(fields)
    .map((key) => [key, sinkConfig[key]] as const)
    .filter(([, value]) => value !== undefined && value !== null);

  return Object.fromEntries(entries);
};

const normalizeDraftValue = (
  field: SinkSchemaFieldResponse,
  value: string,
): string | number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (field.type === "number") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return value;
};

const validateDraft = (
  draftValues: DraftValues,
  fields: SinkSchemaFieldResponse[],
) => {
  const nextValidationErrors: Record<string, string> = {};

  fields.forEach((field) => {
    const rawValue = draftValues[field.key] ?? "";
    const trimmedValue = rawValue.trim();

    if (field.type === "number" && trimmedValue.length > 0) {
      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        nextValidationErrors[field.key] =
          `${field.label} 항목에는 올바른 숫자를 입력해 주세요.`;
      }
    }
  });

  return nextValidationErrors;
};

const buildCommittedConfigFromDraft = ({
  auxiliaryDraftValues,
  draftValues,
  fields,
  sinkConfig,
}: {
  auxiliaryDraftValues: AuxiliaryDraftValues;
  draftValues: DraftValues;
  fields: SinkSchemaFieldResponse[];
  sinkConfig: Record<string, unknown>;
}) => {
  const schemaFieldKeys = new Set(fields.map((field) => field.key));
  const auxiliaryFieldKeys = new Set(getAuxiliaryFieldKeys(fields));
  const preservedConfigEntries = Object.entries(sinkConfig).filter(
    ([key]) =>
      !schemaFieldKeys.has(key) &&
      !auxiliaryFieldKeys.has(key) &&
      key !== "isConfigured",
  );
  const nextConfig = Object.fromEntries(preservedConfigEntries) as Record<
    string,
    unknown
  >;

  fields.forEach((field) => {
    const normalizedValue = normalizeDraftValue(
      field,
      draftValues[field.key] ?? "",
    );
    if (normalizedValue !== undefined) {
      nextConfig[field.key] = normalizedValue;
    }
  });

  fields.forEach((field) => {
    if (!isRemotePickerField(field.type)) {
      return;
    }

    const pickerValue = draftValues[field.key]?.trim() ?? "";
    if (pickerValue.length === 0) {
      return;
    }

    [getAuxiliaryLabelKey(field.key), getAuxiliaryMetaKey(field.key)].forEach(
      (key) => {
        const value = auxiliaryDraftValues[key];
        if (value !== undefined && value !== null && value !== "") {
          nextConfig[key] = value;
        }
      },
    );
  });

  let isConfigured = fields
    .filter((field) => field.required)
    .every((field) =>
      Object.prototype.hasOwnProperty.call(nextConfig, field.key),
    );

  if (nextConfig.service === "google_sheets") {
    const sheetName =
      typeof nextConfig.sheet_name === "string"
        ? nextConfig.sheet_name.trim()
        : "";
    const writeMode =
      typeof nextConfig.write_mode === "string" ? nextConfig.write_mode : "";
    const keyColumn =
      typeof nextConfig.key_column === "string"
        ? nextConfig.key_column.trim()
        : "";

    if (!sheetName) {
      isConfigured = false;
    }

    if (
      (writeMode === "update_row_by_key" ||
        writeMode === "upsert_row_by_key") &&
      !keyColumn
    ) {
      isConfigured = false;
    }
  }

  return {
    ...nextConfig,
    isConfigured,
  } as FlowNodeData["config"];
};

const createFolderPickerState = (scope: string): FolderPickerState => ({
  folderPath: [],
  scope,
  searchQuery: "",
});

const createSearchPickerState = (scope: string) => ({
  path: [] as SinkTargetOptionItemResponse[],
  scope,
  searchQuery: "",
});

const renderRemotePickerMetadata = (option: RemoteOptionPickerItem) => {
  const metadataSummary = getWorkflowMetadataSummary(option.metadata);

  return metadataSummary ? (
    <Text color="text.secondary" fontSize="xs">
      {metadataSummary}
    </Text>
  ) : null;
};

const getSinkTargetOptionIcon = (option: RemoteOptionPickerItem) => {
  if (option.type === "channel") {
    return MdForum;
  }

  if (option.type === "page") {
    return MdDescription;
  }

  if (option.type === "sheet" || option.type === "spreadsheet") {
    return MdTableChart;
  }

  return MdFolder;
};

const getSinkPickerHint = (serviceKey: string, optionType: string) => {
  if (serviceKey === "slack" && optionType === "channel") {
    return "공개 채널을 우선 지원합니다.";
  }

  if (serviceKey === "notion" && optionType === "page") {
    return "연결된 통합이 접근 가능한 공유 페이지가 표시됩니다.";
  }

  return null;
};

type GoogleDriveFolderPickerFieldProps = {
  fieldKey: string;
  onClear: () => void;
  onSelectOption: (option: SourceTargetOptionItemResponse) => void;
  readOnly: boolean;
  selectedId: string;
  selectedLabel?: string | null;
};

const GoogleDriveFolderPickerField = ({
  fieldKey,
  onClear,
  onSelectOption,
  readOnly,
  selectedId,
  selectedLabel,
}: GoogleDriveFolderPickerFieldProps) => {
  const pickerScope = `${fieldKey}:${GOOGLE_DRIVE_FOLDER_PICKER_MODE}`;
  const [pickerState, setPickerState] = useState<FolderPickerState>(() =>
    createFolderPickerState(pickerScope),
  );
  const activePickerState =
    pickerState.scope === pickerScope
      ? pickerState
      : createFolderPickerState(pickerScope);
  const { folderPath, searchQuery } = activePickerState;
  const parentId =
    folderPath.length > 0 ? folderPath[folderPath.length - 1]?.id : undefined;
  const pickerPath = folderPath.map(({ id, label }) => ({ id, label }));
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
    GOOGLE_DRIVE_SERVICE_KEY,
    {
      mode: GOOGLE_DRIVE_FOLDER_PICKER_MODE,
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
  const [newFolderName, setNewFolderName] = useState("");
  const createFolderMutation = useCreateGoogleDriveFolderMutation({
    showErrorToast: true,
    errorMessage: "Google Drive 새 폴더 생성에 실패했습니다.",
  });

  const setScopedSearchQuery = (nextQuery: string) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createFolderPickerState(pickerScope);

      return {
        ...base,
        searchQuery: nextQuery,
      };
    });
  };

  const handleBrowseOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption || sourceOption.type !== "folder") {
      return;
    }

    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createFolderPickerState(pickerScope);

      return {
        ...base,
        folderPath: [...base.folderPath, sourceOption],
        searchQuery: "",
      };
    });
  };

  const handleSelectOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption) {
      return;
    }

    onSelectOption(sourceOption);
  };

  const handleResetPath = () => {
    setPickerState(createFolderPickerState(pickerScope));
  };

  const handlePathSelect = (index: number) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createFolderPickerState(pickerScope);

      return {
        ...base,
        folderPath: base.folderPath.slice(0, index + 1),
        searchQuery: "",
      };
    });
  };

  const handleCreateFolder = async () => {
    const trimmedFolderName = newFolderName.trim();
    if (readOnly || trimmedFolderName.length === 0) {
      return;
    }

    try {
      const createdFolder = await createFolderMutation.mutateAsync({
        name: trimmedFolderName,
        parentId,
      });
      onSelectOption(createdFolder);
      setNewFolderName("");
      await refetch();
      toaster.create({
        type: "success",
        description: "새 폴더를 만들고 바로 선택했습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {selectedId ? (
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
              선택된 폴더
            </Text>
            <Text fontSize="sm" fontWeight="semibold" truncate>
              {selectedLabel || selectedId}
            </Text>
          </Box>
          <IconButton
            aria-label="Clear selected folder"
            disabled={readOnly}
            flexShrink={0}
            size="xs"
            variant="ghost"
            onClick={onClear}
          >
            <Icon as={MdClose} boxSize={4} />
          </IconButton>
        </Box>
      ) : null}

      <RemoteOptionPicker
        canBrowseItem={(option) => option.type === "folder"}
        disabled={readOnly}
        emptyMessage="선택할 수 있는 폴더가 없습니다."
        errorMessage={isError ? getApiErrorMessage(error) : null}
        getBrowseLabel={(option) => `${option.label} 내부 폴더 보기`}
        getItemIcon={() => MdFolder}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        path={pickerPath}
        renderItemMetadata={renderRemotePickerMetadata}
        rootLabel="내 드라이브"
        searchPlaceholder="폴더 검색"
        searchValue={searchQuery}
        selectedId={selectedId}
        onBrowse={handleBrowseOption}
        onLoadMore={() => void fetchNextPage()}
        onPathSelect={handlePathSelect}
        onResetPath={handleResetPath}
        onRetry={() => void refetch()}
        onSearchChange={setScopedSearchQuery}
        onSelect={handleSelectOption}
      />

      <Box display="flex" flexDirection="column" gap={2}>
        <Text color="text.secondary" fontSize="xs">
          현재 위치에 새 폴더를 만들고 바로 선택할 수 있습니다.
        </Text>
        <Box display="flex" gap={2}>
          <Input
            disabled={readOnly}
            placeholder="새 폴더 이름"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreateFolder();
              }
            }}
          />
          <Button
            disabled={readOnly || newFolderName.trim().length === 0}
            flexShrink={0}
            loading={createFolderMutation.isPending}
            onClick={() => void handleCreateFolder()}
          >
            새 폴더 만들기
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

type SinkRemotePickerFieldProps = {
  fieldKey: string;
  onClear: () => void;
  onSelectOption: (option: SinkTargetOptionItemResponse) => void;
  optionType: string;
  readOnly: boolean;
  selectedId: string;
  selectedLabel?: string | null;
  selectedMetadata?: Record<string, unknown> | null;
  serviceKey: string;
};

const SinkRemotePickerField = ({
  fieldKey,
  onClear,
  onSelectOption,
  optionType,
  readOnly,
  selectedId,
  selectedLabel,
  selectedMetadata,
  serviceKey,
}: SinkRemotePickerFieldProps) => {
  const pickerScope = `${serviceKey}:${fieldKey}:${optionType}`;
  const [pickerState, setPickerState] = useState(() =>
    createSearchPickerState(pickerScope),
  );
  const activePickerState =
    pickerState.scope === pickerScope
      ? pickerState
      : createSearchPickerState(pickerScope);
  const { path, searchQuery } = activePickerState;
  const isGoogleSheetsPicker =
    serviceKey === "google_sheets" && optionType === "sheet";
  const parentId =
    isGoogleSheetsPicker && path.length > 0
      ? path[path.length - 1]?.id
      : undefined;
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
  } = useInfiniteSinkTargetOptionsQuery(
    serviceKey,
    {
      parentId,
      type: optionType,
      query: searchQuery,
    },
    {
      enabled: !readOnly,
      staleTime: 1000 * 30,
    },
  );
  const items =
    targetOptions?.pages.flatMap((page) => page.items) ??
    ([] as SinkTargetOptionItemResponse[]);
  const hint = getSinkPickerHint(serviceKey, optionType);
  const currentSpreadsheet =
    isGoogleSheetsPicker && path.length > 0 ? path[path.length - 1] : null;
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

  const setScopedSearchQuery = (nextQuery: string) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createSearchPickerState(pickerScope);

      return {
        ...base,
        searchQuery: nextQuery,
      };
    });
  };

  const handleBrowseOption = (option: RemoteOptionPickerItem) => {
    const sinkOption = items.find((item) => item.id === option.id);
    if (!sinkOption || sinkOption.type !== "spreadsheet") {
      return;
    }

    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createSearchPickerState(pickerScope);

      return {
        ...base,
        path: [...base.path, sinkOption],
        searchQuery: "",
      };
    });
  };

  const handleSelectOption = (option: RemoteOptionPickerItem) => {
    const sinkOption = items.find((item) => item.id === option.id);
    if (!sinkOption) {
      return;
    }

    if (isGoogleSheetsPicker && sinkOption.type === "spreadsheet") {
      handleBrowseOption(option);
      return;
    }

    onSelectOption(sinkOption);
  };

  const handleResetPath = () => {
    setPickerState(createSearchPickerState(pickerScope));
  };

  const handlePathSelect = (index: number) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createSearchPickerState(pickerScope);

      return {
        ...base,
        path: base.path.slice(0, index + 1),
        searchQuery: "",
      };
    });
  };

  const handleCreateSpreadsheet = async () => {
    const trimmedName = newSpreadsheetName.trim();
    if (!isGoogleSheetsPicker || readOnly || trimmedName.length === 0) {
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
            : createSearchPickerState(pickerScope);

        return {
          ...base,
          path: [createdSpreadsheet as SinkTargetOptionItemResponse],
          searchQuery: "",
        };
      });
      setNewSpreadsheetName("");
      setNewSheetName("");
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
      onSelectOption(createdSheet as SinkTargetOptionItemResponse);
      toaster.create({
        type: "success",
        description: "시트를 준비하고 바로 선택했습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {selectedId ? (
        <Box
          bg="gray.50"
          borderRadius="xl"
          display="flex"
          flexDirection="column"
          gap={3}
          px={4}
          py={3}
        >
          <Box
            alignItems="flex-start"
            display="flex"
            gap={3}
            justifyContent="space-between"
          >
            <Box minW={0}>
              <Text color="text.secondary" fontSize="xs">
                선택된 대상
              </Text>
              <Text fontSize="sm" fontWeight="semibold" truncate>
                {selectedLabel || selectedId}
              </Text>
            </Box>
            <IconButton
              aria-label="Clear selected target"
              disabled={readOnly}
              flexShrink={0}
              size="xs"
              variant="ghost"
              onClick={onClear}
            >
              <Icon as={MdClose} boxSize={4} />
            </IconButton>
          </Box>

          {isGoogleSheetsPicker ? (
            <Box
              display="grid"
              gap={3}
              gridTemplateColumns="repeat(2, 1fr)"
              w="full"
            >
              <Box minW={0}>
                <Text color="text.secondary" fontSize="xs">
                  저장할 스프레드시트
                </Text>
                <Text fontSize="sm" fontWeight="semibold" truncate>
                  {typeof selectedMetadata?.spreadsheetTitle === "string" &&
                  selectedMetadata.spreadsheetTitle.trim().length > 0
                    ? selectedMetadata.spreadsheetTitle
                    : selectedId}
                </Text>
              </Box>
              <Box minW={0}>
                <Text color="text.secondary" fontSize="xs">
                  저장할 시트 탭
                </Text>
                <Text fontSize="sm" fontWeight="semibold" truncate>
                  {typeof selectedMetadata?.sheetName === "string" &&
                  selectedMetadata.sheetName.trim().length > 0
                    ? selectedMetadata.sheetName
                    : "아직 선택되지 않았습니다."}
                </Text>
              </Box>
            </Box>
          ) : null}
        </Box>
      ) : null}

      <RemoteOptionPicker
        canBrowseItem={(option) =>
          isGoogleSheetsPicker && option.type === "spreadsheet"
        }
        disabled={readOnly}
        emptyMessage="선택할 수 있는 항목이 없습니다."
        errorMessage={isError ? getApiErrorMessage(error) : null}
        getBrowseLabel={(option) => `${option.label} 하위 시트 보기`}
        getItemIcon={getSinkTargetOptionIcon}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        path={isGoogleSheetsPicker ? pickerPath : undefined}
        renderItemMetadata={renderRemotePickerMetadata}
        rootLabel={isGoogleSheetsPicker ? "Google Sheets" : undefined}
        searchPlaceholder="이름으로 검색"
        searchValue={searchQuery}
        selectedId={selectedId}
        onBrowse={isGoogleSheetsPicker ? handleBrowseOption : undefined}
        onLoadMore={() => void fetchNextPage()}
        onPathSelect={isGoogleSheetsPicker ? handlePathSelect : undefined}
        onResetPath={isGoogleSheetsPicker ? handleResetPath : undefined}
        onRetry={() => void refetch()}
        onSearchChange={setScopedSearchQuery}
        onSelect={handleSelectOption}
      />

      {hint ? (
        <Text color="text.secondary" fontSize="xs">
          {hint}
        </Text>
      ) : null}

      {isGoogleSheetsPicker ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {currentSpreadsheet ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

type SinkSchemaEditorProps = {
  fields: SinkSchemaFieldResponse[];
  onCancel?: () => void;
  onComplete?: () => void;
  nodeId: string;
  onSaveConfig: (config: FlowNodeData["config"]) => void;
  readOnly: boolean;
  serviceKey: string;
  sinkConfig: Record<string, unknown>;
};

const SinkSchemaEditor = ({
  fields,
  nodeId,
  onCancel,
  onComplete,
  onSaveConfig,
  readOnly,
  serviceKey,
  sinkConfig,
}: SinkSchemaEditorProps) => {
  const initialDraftValues = useMemo(
    () => getInitialDraftValues(fields, sinkConfig),
    [fields, sinkConfig],
  );
  const initialAuxiliaryDraftValues = useMemo(
    () => getInitialAuxiliaryDraftValues(fields, sinkConfig),
    [fields, sinkConfig],
  );
  const [draftValues, setDraftValues] =
    useState<DraftValues>(initialDraftValues);
  const [auxiliaryDraftValues, setAuxiliaryDraftValues] =
    useState<AuxiliaryDraftValues>(initialAuxiliaryDraftValues);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const hasChanges = useMemo(() => {
    const hasDraftChanges = fields.some(
      (field) =>
        (draftValues[field.key] ?? "") !==
        (initialDraftValues[field.key] ?? ""),
    );

    if (hasDraftChanges) {
      return true;
    }

    return (
      JSON.stringify(auxiliaryDraftValues) !==
      JSON.stringify(initialAuxiliaryDraftValues)
    );
  }, [
    auxiliaryDraftValues,
    draftValues,
    fields,
    initialAuxiliaryDraftValues,
    initialDraftValues,
  ]);

  const handleFieldChange = (fieldKey: string, value: string) => {
    setDraftValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
    setValidationErrors((current) => {
      if (!(fieldKey in current)) {
        return current;
      }

      const nextValidationErrors = { ...current };
      delete nextValidationErrors[fieldKey];
      return nextValidationErrors;
    });
  };

  const handleRemotePickerFieldSelect = (
    field: SinkSchemaFieldResponse,
    option: PickerOptionLike,
  ) => {
    const selectedValue =
      field.type === "sheet_picker"
        ? getGoogleSheetsSpreadsheetId(option)
        : option.id;
    handleFieldChange(field.key, selectedValue);
    if (field.type === "sheet_picker") {
      const sheetName = getGoogleSheetsSheetName(option);
      if (sheetName) {
        handleFieldChange("sheet_name", sheetName);
      }
    }
    setAuxiliaryDraftValues((current) => ({
      ...current,
      [getAuxiliaryLabelKey(field.key)]: option.label,
      [getAuxiliaryMetaKey(field.key)]: option.metadata,
    }));
  };

  const handleRemotePickerFieldClear = (field: SinkSchemaFieldResponse) => {
    handleFieldChange(field.key, "");
    if (field.type === "sheet_picker") {
      handleFieldChange("sheet_name", "");
    }
    setAuxiliaryDraftValues((current) => {
      const nextAuxiliaryDraftValues = { ...current };
      delete nextAuxiliaryDraftValues[getAuxiliaryLabelKey(field.key)];
      delete nextAuxiliaryDraftValues[getAuxiliaryMetaKey(field.key)];
      return nextAuxiliaryDraftValues;
    });
  };

  const handleResetDraft = () => {
    setDraftValues(initialDraftValues);
    setAuxiliaryDraftValues(initialAuxiliaryDraftValues);
    setValidationErrors({});
  };

  const handleSaveDraft = () => {
    const nextValidationErrors = validateDraft(draftValues, fields);
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    const nextConfig = buildCommittedConfigFromDraft({
      auxiliaryDraftValues,
      draftValues,
      fields,
      sinkConfig,
    });

    onSaveConfig(nextConfig);
    onComplete?.();
    setValidationErrors({});
  };

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box
        display="flex"
        flexDirection="column"
        gap={4}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {fields.map((field) => {
          const stringValue = draftValues[field.key] ?? "";
          const validationError = validationErrors[field.key] ?? null;
          const presentation = getSinkFieldPresentation(serviceKey, field);

          return (
            <Box
              key={`${nodeId}-${field.key}`}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              <Text fontSize="sm" fontWeight="medium">
                {presentation.label}
                {field.required ? " *" : ""}
              </Text>

              {field.type === "select" &&
              field.options &&
              serviceKey === "google_sheets" &&
              field.key === "write_mode" ? (
                <Box display="flex" flexDirection="column" gap={2}>
                  {field.options.map((option) => {
                    const presentation =
                      getGoogleSheetsWriteModePresentation(option);

                    return (
                      <Box
                        key={option}
                        bg={stringValue === option ? "blue.50" : "gray.50"}
                        border="1px solid"
                        borderColor={
                          stringValue === option ? "blue.200" : "gray.100"
                        }
                        borderRadius="xl"
                        cursor={readOnly ? "default" : "pointer"}
                        px={4}
                        py={3}
                        onClick={() => {
                          if (!readOnly) {
                            handleFieldChange(field.key, option);
                          }
                        }}
                      >
                        <Text fontSize="sm" fontWeight="semibold">
                          {presentation.label}
                        </Text>
                        <Text color="text.secondary" fontSize="xs" mt={1}>
                          {presentation.description}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              ) : field.type === "select" && field.options ? (
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {field.options.map((option) => (
                    <Button
                      key={option}
                      disabled={readOnly}
                      size="sm"
                      variant={stringValue === option ? "solid" : "outline"}
                      onClick={() => handleFieldChange(field.key, option)}
                    >
                      {option}
                    </Button>
                  ))}
                </Box>
              ) : serviceKey === GOOGLE_DRIVE_SERVICE_KEY &&
                field.type === "folder_picker" ? (
                <GoogleDriveFolderPickerField
                  fieldKey={field.key}
                  readOnly={readOnly}
                  selectedId={stringValue}
                  selectedLabel={
                    typeof auxiliaryDraftValues[
                      getAuxiliaryLabelKey(field.key)
                    ] === "string"
                      ? (auxiliaryDraftValues[
                          getAuxiliaryLabelKey(field.key)
                        ] as string)
                      : null
                  }
                  onClear={() => handleRemotePickerFieldClear(field)}
                  onSelectOption={(option) =>
                    handleRemotePickerFieldSelect(field, option)
                  }
                />
              ) : serviceKey &&
                typeof SINK_TARGET_OPTION_TYPES[field.type] === "string" ? (
                <SinkRemotePickerField
                  fieldKey={field.key}
                  optionType={SINK_TARGET_OPTION_TYPES[field.type] as string}
                  readOnly={readOnly}
                  selectedId={
                    field.type === "sheet_picker"
                      ? getGoogleSheetsSelectedSheetOptionId({
                          spreadsheetId: stringValue,
                          sheetName:
                            typeof draftValues.sheet_name === "string"
                              ? draftValues.sheet_name
                              : "",
                        })
                      : stringValue
                  }
                  selectedLabel={
                    typeof auxiliaryDraftValues[
                      getAuxiliaryLabelKey(field.key)
                    ] === "string"
                      ? (auxiliaryDraftValues[
                          getAuxiliaryLabelKey(field.key)
                        ] as string)
                      : null
                  }
                  selectedMetadata={
                    typeof auxiliaryDraftValues[
                      getAuxiliaryMetaKey(field.key)
                    ] === "object"
                      ? (auxiliaryDraftValues[
                          getAuxiliaryMetaKey(field.key)
                        ] as Record<string, unknown>)
                      : null
                  }
                  serviceKey={serviceKey}
                  onClear={() => handleRemotePickerFieldClear(field)}
                  onSelectOption={(option) =>
                    handleRemotePickerFieldSelect(field, option)
                  }
                />
              ) : field.type === "textarea" ? (
                <Textarea
                  disabled={readOnly}
                  minH="120px"
                  placeholder={presentation.placeholder}
                  resize="vertical"
                  value={stringValue}
                  onChange={(event) =>
                    handleFieldChange(field.key, event.target.value)
                  }
                  onKeyDown={(event) => event.stopPropagation()}
                />
              ) : (
                <Input
                  disabled={readOnly}
                  placeholder={presentation.placeholder}
                  type={presentation.inputType}
                  value={stringValue}
                  onChange={(event) =>
                    handleFieldChange(field.key, event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
              )}

              {presentation.helpText ? (
                <Text color="text.secondary" fontSize="xs">
                  {presentation.helpText}
                </Text>
              ) : null}

              {validationError ? (
                <Text color="red.500" fontSize="xs">
                  {validationError}
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Box>

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
            : "현재 패널에 표시된 값이 editor store에 반영된 상태입니다."}
        </Text>

        <Box display="flex" gap={2} justifyContent="flex-end">
          {onCancel ? (
            <Button size="sm" variant="outline" onClick={onCancel}>
              취소
            </Button>
          ) : null}
          <Button
            disabled={readOnly || !hasChanges}
            size="sm"
            variant="outline"
            onClick={handleResetDraft}
          >
            되돌리기
          </Button>
          <Button
            disabled={readOnly || !hasChanges}
            size="sm"
            onClick={handleSaveDraft}
          >
            설정 저장
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const SinkNodePanel = ({
  data,
  nodeId,
  onCancel,
  onComplete,
  readOnly = false,
}: NodePanelProps) => {
  const edges = useWorkflowStore((state) => state.edges);
  const endNodeIds = useWorkflowStore((state) => state.endNodeIds);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const nodes = useWorkflowStore((state) => state.nodes);
  const replaceNodeConfig = useWorkflowStore(
    (state) => state.replaceNodeConfig,
  );
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: sinkCatalog } = useSinkCatalogQuery();
  const {
    data: schemaPreview,
    isPending: isSchemaPreviewPending,
    mutate: previewSchema,
  } = useWorkflowSchemaPreviewMutation();
  const sinkConfig = data.config as unknown as Record<string, unknown>;
  const serviceKey =
    typeof sinkConfig.service === "string" ? sinkConfig.service : null;
  const inputType = data.inputTypes[0] ?? null;
  const sinkInputType = inputType ? toBackendDataType(inputType) : null;
  const selectedSinkService =
    sinkCatalog?.services.find((service) => service.key === serviceKey) ?? null;
  const { data: sinkSchema } = useSinkSchemaQuery(serviceKey, sinkInputType);
  const nodeStatus = nodeStatuses[nodeId] ?? null;
  const missingFields =
    nodeStatus?.missingFields.map(getNodeStatusMissingFieldLabel) ?? [];
  const shouldRenderSchemaPreview = shouldShowSinkSchemaPreview(serviceKey);

  const previewRequest = useMemo(() => {
    const previewNodes = nodes.filter((node) => node.id !== nodeId);
    const previewEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    );

    return {
      nodes: previewNodes.map((node) =>
        toNodeDefinition(node, startNodeId, endNodeIds),
      ),
      edges: previewEdges.map(toEdgeDefinition),
    };
  }, [edges, endNodeIds, nodeId, nodes, startNodeId]);

  useEffect(() => {
    if (
      !workflowId ||
      !shouldRenderSchemaPreview ||
      previewRequest.nodes.length === 0
    ) {
      return;
    }

    previewSchema(previewRequest);
  }, [previewRequest, previewSchema, shouldRenderSchemaPreview, workflowId]);

  const sinkEditorKey = useMemo(() => {
    if (!sinkSchema || !serviceKey) {
      return null;
    }

    const snapshot = sinkSchema.fields.map((field) => [
      field.key,
      sinkConfig[field.key] ?? "",
    ]);

    return `${nodeId}:${serviceKey}:${JSON.stringify(snapshot)}`;
  }, [nodeId, serviceKey, sinkConfig, sinkSchema]);
  const shouldShowNodeStatus = Boolean(
    nodeStatus && (!nodeStatus.configured || !nodeStatus.executable),
  );
  const inputTypeLabel =
    getDataTypeDisplayLabel(sinkInputType) ?? "데이터 확인 필요";

  return (
    <NodePanelShell
      description="현재 결과를 어디로 보낼지 정한 뒤 마지막 단계에서 상세 설정을 채워넣습니다."
      eyebrow="도착 설정"
      title={selectedSinkService?.label ?? "Destination"}
    >
      <Box display="flex" flexDirection="column" gap={6}>
        {shouldShowNodeStatus ? (
          <Box
            bg="orange.50"
            border="1px solid"
            borderColor="orange.100"
            borderRadius="2xl"
            px={4}
            py={4}
          >
            <Text color="orange.600" fontSize="sm" fontWeight="semibold" mb={1}>
              도착 노드 설정을 확인해 주세요.
            </Text>
            <Text color="text.secondary" fontSize="sm">
              {missingFields.length > 0
                ? `확인 항목: ${missingFields.join(", ")}`
                : "설정 값을 다시 확인해 주세요."}
            </Text>
          </Box>
        ) : null}

        <Box display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="medium">
            보낼 데이터
          </Text>
          <Text color="text.secondary" fontSize="sm">
            {inputType ? inputTypeLabel : "데이터 확인 필요"}
          </Text>
        </Box>

        {shouldRenderSchemaPreview ? (
          <Box display="flex" flexDirection="column" gap={3}>
            <Text fontSize="sm" fontWeight="medium">
              결과 스키마 미리보기
            </Text>

            {isSchemaPreviewPending ? (
              <Box alignItems="center" display="flex" gap={2}>
                <Spinner color="gray.500" size="sm" />
                <Text color="text.secondary" fontSize="sm">
                  현재 결과 스키마를 계산하는 중입니다.
                </Text>
              </Box>
            ) : schemaPreview ? (
              <Box display="flex" flexDirection="column" gap={2}>
                {schemaPreview.fields.map((field) => {
                  const valueTypeLabel = getSchemaValueTypeLabel(
                    field.value_type,
                  );

                  return (
                    <Box
                      key={field.key}
                      bg="gray.50"
                      borderRadius="xl"
                      px={4}
                      py={3}
                    >
                      <Text fontSize="sm" fontWeight="semibold">
                        {field.label || "항목"}
                      </Text>
                      {valueTypeLabel ? (
                        <Text color="text.secondary" fontSize="xs">
                          {valueTypeLabel}
                        </Text>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Text color="text.secondary" fontSize="sm">
                표시할 스키마가 없습니다.
              </Text>
            )}
          </Box>
        ) : null}

        <Box display="flex" flexDirection="column" gap={3}>
          <Text fontSize="sm" fontWeight="medium">
            도착 상세 설정
          </Text>

          {selectedSinkService && sinkSchema ? (
            <SinkSchemaEditor
              key={sinkEditorKey ?? nodeId}
              fields={sinkSchema.fields}
              nodeId={nodeId}
              onCancel={onCancel}
              onComplete={onComplete}
              readOnly={readOnly}
              serviceKey={selectedSinkService.key}
              sinkConfig={sinkConfig}
              onSaveConfig={(config) => replaceNodeConfig(nodeId, config)}
            />
          ) : (
            <Text color="text.secondary" fontSize="sm">
              보낼 서비스를 먼저 선택하면 상세 설정을 채울 수 있습니다.
            </Text>
          )}
        </Box>
      </Box>
    </NodePanelShell>
  );
};
