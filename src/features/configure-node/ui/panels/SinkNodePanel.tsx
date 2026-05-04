import { useEffect, useMemo, useState } from "react";
import { MdClose, MdDescription, MdFolder, MdForum } from "react-icons/md";

import {
  Box,
  Button,
  Icon,
  IconButton,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type SinkSchemaFieldResponse,
  type SinkTargetOptionItemResponse,
  type SourceTargetOptionItemResponse,
  getNodeStatusMissingFieldLabel,
  toBackendDataType,
  toEdgeDefinition,
  toNodeDefinition,
  useCreateGoogleDriveFolderMutation,
  useInfiniteSinkTargetOptionsQuery,
  useInfiniteSourceTargetOptionsQuery,
  useSinkCatalogQuery,
  useSinkSchemaQuery,
  useWorkflowSchemaPreviewMutation,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";
import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";
import { toaster } from "@/shared/utils";

import { type NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

const FIELD_LABELS: Record<string, string> = {
  calendar_picker: "캘린더",
  channel_picker: "채널",
  email_input: "이메일",
  folder_picker: "폴더",
  number: "숫자",
  page_picker: "페이지",
  select: "선택",
  sheet_picker: "시트",
  text: "텍스트",
};

const GOOGLE_DRIVE_SERVICE_KEY = "google_drive";
const GOOGLE_DRIVE_FOLDER_PICKER_MODE = "folder_all_files";
const REMOTE_PICKER_FIELD_TYPES = new Set([
  "folder_picker",
  "channel_picker",
  "page_picker",
]);
const SINK_TARGET_OPTION_TYPES: Partial<Record<string, string>> = {
  channel_picker: "channel",
  page_picker: "page",
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

const getFieldInputType = (fieldType: string) => {
  if (fieldType === "email_input") {
    return "email";
  }

  if (fieldType === "number") {
    return "number";
  }

  return "text";
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

    if (field.required && trimmedValue.length === 0) {
      nextValidationErrors[field.key] = `${field.label} 항목을 입력해 주세요.`;
      return;
    }

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

  const isConfigured = fields
    .filter((field) => field.required)
    .every((field) =>
      Object.prototype.hasOwnProperty.call(nextConfig, field.key),
    );

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
  scope,
  searchQuery: "",
});

const formatMetadataValue = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
};

const getMetadataSummary = (metadata: Record<string, unknown> | undefined) => {
  if (!metadata) {
    return "";
  }

  const summaryKeys = [
    "mimeType",
    "modifiedTime",
    "size",
    "memberCount",
    "lastEditedTime",
    "parentType",
  ];

  return summaryKeys
    .map((key) => {
      const value = formatMetadataValue(metadata[key]);
      return value ? `${key}: ${value}` : null;
    })
    .filter((value): value is string => value !== null)
    .join(" · ");
};

const renderRemotePickerMetadata = (option: RemoteOptionPickerItem) => {
  const metadataSummary = getMetadataSummary(option.metadata);

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
  const { searchQuery } = activePickerState;
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

  const handleSelectOption = (option: RemoteOptionPickerItem) => {
    const sinkOption = items.find((item) => item.id === option.id);
    if (!sinkOption) {
      return;
    }

    onSelectOption(sinkOption);
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
      ) : null}

      <RemoteOptionPicker
        disabled={readOnly}
        emptyMessage="선택할 수 있는 항목이 없습니다."
        errorMessage={isError ? getApiErrorMessage(error) : null}
        getItemIcon={getSinkTargetOptionIcon}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        renderItemMetadata={renderRemotePickerMetadata}
        searchPlaceholder="이름으로 검색"
        searchValue={searchQuery}
        selectedId={selectedId}
        onLoadMore={() => void fetchNextPage()}
        onRetry={() => void refetch()}
        onSearchChange={setScopedSearchQuery}
        onSelect={handleSelectOption}
      />

      {hint ? (
        <Text color="text.secondary" fontSize="xs">
          {hint}
        </Text>
      ) : null}
    </Box>
  );
};

type SinkSchemaEditorProps = {
  fields: SinkSchemaFieldResponse[];
  nodeId: string;
  onSaveConfig: (config: FlowNodeData["config"]) => void;
  readOnly: boolean;
  serviceKey: string;
  sinkConfig: Record<string, unknown>;
};

const SinkSchemaEditor = ({
  fields,
  nodeId,
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
    handleFieldChange(field.key, option.id);
    setAuxiliaryDraftValues((current) => ({
      ...current,
      [getAuxiliaryLabelKey(field.key)]: option.label,
      [getAuxiliaryMetaKey(field.key)]: option.metadata,
    }));
  };

  const handleRemotePickerFieldClear = (field: SinkSchemaFieldResponse) => {
    handleFieldChange(field.key, "");
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

          return (
            <Box
              key={`${nodeId}-${field.key}`}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              <Text fontSize="sm" fontWeight="medium">
                {field.label}
                {field.required ? " *" : ""}
              </Text>

              {field.type === "select" && field.options ? (
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
                  serviceKey={serviceKey}
                  onClear={() => handleRemotePickerFieldClear(field)}
                  onSelectOption={(option) =>
                    handleRemotePickerFieldSelect(field, option)
                  }
                />
              ) : (
                <Input
                  disabled={readOnly}
                  placeholder={`${FIELD_LABELS[field.type] ?? field.type} 입력`}
                  type={getFieldInputType(field.type)}
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
  readOnly = false,
}: NodePanelProps) => {
  const edges = useWorkflowStore((state) => state.edges);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
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

  const previewRequest = useMemo(() => {
    const previewNodes = nodes.filter((node) => node.id !== nodeId);
    const previewEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    );

    return {
      nodes: previewNodes.map((node) =>
        toNodeDefinition(node, startNodeId, endNodeId),
      ),
      edges: previewEdges.map(toEdgeDefinition),
    };
  }, [edges, endNodeId, nodeId, nodes, startNodeId]);

  useEffect(() => {
    if (!workflowId || previewRequest.nodes.length === 0) {
      return;
    }

    previewSchema(previewRequest);
  }, [previewRequest, previewSchema, workflowId]);

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

  return (
    <NodePanelShell
      description="현재 결과를 어디로 보낼지 정한 뒤 마지막 단계에서 상세 설정을 채워넣습니다."
      eyebrow="도착 설정"
      title={selectedSinkService?.label ?? "Destination"}
    >
      <Box display="flex" flexDirection="column" gap={6}>
        {nodeStatus ? (
          <Box bg="gray.50" borderRadius="2xl" px={4} py={4}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              현재 상태
            </Text>
            <Text color="text.secondary" fontSize="sm">
              설정 완료: {nodeStatus.configured ? "예" : "아니오"}
            </Text>
            <Text color="text.secondary" fontSize="sm">
              실행 가능: {nodeStatus.executable ? "예" : "아니오"}
            </Text>
            {missingFields.length > 0 ? (
              <Text color="text.secondary" fontSize="sm" mt={2}>
                누락 항목: {missingFields.join(", ")}
              </Text>
            ) : null}
          </Box>
        ) : null}

        <Box display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="medium">
            현재 결과 타입
          </Text>
          <Text color="text.secondary" fontSize="sm">
            {inputType ? sinkInputType : "결과 타입 확인 필요"}
          </Text>
        </Box>

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
              {schemaPreview.fields.map((field) => (
                <Box
                  key={field.key}
                  bg="gray.50"
                  borderRadius="xl"
                  px={4}
                  py={3}
                >
                  <Text fontSize="sm" fontWeight="semibold">
                    {field.label}
                  </Text>
                  <Text color="text.secondary" fontSize="xs">
                    {field.key} · {field.value_type}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : (
            <Text color="text.secondary" fontSize="sm">
              표시할 스키마가 없습니다.
            </Text>
          )}
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          <Text fontSize="sm" fontWeight="medium">
            sink 상세 설정
          </Text>

          {selectedSinkService && sinkSchema ? (
            <SinkSchemaEditor
              key={sinkEditorKey ?? nodeId}
              fields={sinkSchema.fields}
              nodeId={nodeId}
              readOnly={readOnly}
              serviceKey={selectedSinkService.key}
              sinkConfig={sinkConfig}
              onSaveConfig={(config) => replaceNodeConfig(nodeId, config)}
            />
          ) : (
            <Text color="text.secondary" fontSize="sm">
              sink 서비스를 먼저 선택하면 상세 설정을 채울 수 있습니다.
            </Text>
          )}
        </Box>
      </Box>
    </NodePanelShell>
  );
};
