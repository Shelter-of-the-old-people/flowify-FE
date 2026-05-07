import { useMemo, useState } from "react";
import { MdClose, MdDescription, MdFolder, MdForum } from "react-icons/md";

import { Box, Button, Icon, IconButton, Input, Text } from "@chakra-ui/react";

import {
  type SinkSchemaFieldResponse,
  type SinkTargetOptionItemResponse,
  type SourceTargetOptionItemResponse,
  getWorkflowMetadataSummary,
  useInfiniteSinkTargetOptionsQuery,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";
import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";

import {
  buildSinkNodeConfigDraft,
  getInitialSinkAuxiliaryDraftValues,
  getInitialSinkDraftValues,
  getSinkAuxiliaryLabelKey,
  getSinkAuxiliaryMetaKey,
  validateSinkNodeSetupDraft,
} from "../model";
import {
  type SinkSetupAuxiliaryDraftValues,
  type SinkSetupDraftValues,
} from "../model";

type Props = {
  fields: SinkSchemaFieldResponse[];
  onApply: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
  serviceKey: string;
  sinkConfig: Record<string, unknown>;
};

type FolderPickerState = {
  folderPath: SourceTargetOptionItemResponse[];
  scope: string;
  searchQuery: string;
};

type SearchPickerState = {
  scope: string;
  searchQuery: string;
};

type PickerOptionLike = {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
};

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
const SINK_TARGET_OPTION_TYPES: Partial<Record<string, string>> = {
  channel_picker: "channel",
  page_picker: "page",
};

const createFolderPickerState = (scope: string): FolderPickerState => ({
  folderPath: [],
  scope,
  searchQuery: "",
});

const createSearchPickerState = (scope: string): SearchPickerState => ({
  scope,
  searchQuery: "",
});

const getFieldInputType = (fieldType: string) => {
  if (fieldType === "email_input") {
    return "email";
  }

  if (fieldType === "number") {
    return "number";
  }

  return "text";
};

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

  return MdFolder;
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
            aria-label="선택된 폴더 지우기"
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
            aria-label="선택된 대상 지우기"
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
    </Box>
  );
};

export const SinkSchemaEditor = ({
  fields,
  onApply,
  readOnly = false,
  serviceKey,
  sinkConfig,
}: Props) => {
  const initialDraftValues = useMemo(
    () => getInitialSinkDraftValues(fields, sinkConfig),
    [fields, sinkConfig],
  );
  const initialAuxiliaryDraftValues = useMemo(
    () => getInitialSinkAuxiliaryDraftValues(fields, sinkConfig),
    [fields, sinkConfig],
  );
  const [draftValues, setDraftValues] =
    useState<SinkSetupDraftValues>(initialDraftValues);
  const [auxiliaryDraftValues, setAuxiliaryDraftValues] =
    useState<SinkSetupAuxiliaryDraftValues>(initialAuxiliaryDraftValues);
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
      [getSinkAuxiliaryLabelKey(field.key)]: option.label,
      [getSinkAuxiliaryMetaKey(field.key)]: option.metadata,
    }));
  };

  const handleRemotePickerFieldClear = (field: SinkSchemaFieldResponse) => {
    handleFieldChange(field.key, "");
    setAuxiliaryDraftValues((current) => {
      const nextAuxiliaryDraftValues = { ...current };
      delete nextAuxiliaryDraftValues[getSinkAuxiliaryLabelKey(field.key)];
      delete nextAuxiliaryDraftValues[getSinkAuxiliaryMetaKey(field.key)];
      return nextAuxiliaryDraftValues;
    });
  };

  const handleResetDraft = () => {
    setDraftValues(initialDraftValues);
    setAuxiliaryDraftValues(initialAuxiliaryDraftValues);
    setValidationErrors({});
  };

  const handleApply = () => {
    const nextValidationErrors = validateSinkNodeSetupDraft(
      draftValues,
      fields,
    );
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    onApply(
      buildSinkNodeConfigDraft({
        auxiliaryDraftValues,
        currentConfig: sinkConfig as never,
        draftValues,
        fields,
      }) as Record<string, unknown>,
    );
  };

  return (
    <Box display="flex" flexDirection="column" gap={5}>
      <Box display="flex" flexDirection="column" gap={4}>
        {fields.map((field) => {
          const stringValue = draftValues[field.key] ?? "";
          const validationError = validationErrors[field.key] ?? null;

          return (
            <Box key={field.key} display="flex" flexDirection="column" gap={2}>
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
                      getSinkAuxiliaryLabelKey(field.key)
                    ] === "string"
                      ? (auxiliaryDraftValues[
                          getSinkAuxiliaryLabelKey(field.key)
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
                      getSinkAuxiliaryLabelKey(field.key)
                    ] === "string"
                      ? (auxiliaryDraftValues[
                          getSinkAuxiliaryLabelKey(field.key)
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

      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button
          disabled={readOnly || !hasChanges}
          size="sm"
          variant="outline"
          onClick={handleResetDraft}
        >
          되돌리기
        </Button>
        <Button disabled={readOnly} size="sm" onClick={handleApply}>
          설정 적용
        </Button>
      </Box>
    </Box>
  );
};
