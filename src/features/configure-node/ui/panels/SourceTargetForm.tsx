import { useMemo, useState } from "react";
import {
  MdArticle,
  MdCalendarMonth,
  MdFolder,
  MdInsertDriveFile,
  MdLabel,
  MdSchool,
  MdTableChart,
} from "react-icons/md";

import { Box, Button, Input, Text } from "@chakra-ui/react";

import {
  GroupedSourceTargetOptionPicker,
  type SourceModeResponse,
  type SourceTargetOptionItemResponse,
  getWorkflowMetadataSummary,
  isGroupedSourceTargetOptionPicker,
  isSeBoardNewPostsSourceMode,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";
import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";

import {
  DAY_PICKER_OPTIONS,
  getSourceTargetSchemaHelperText,
  getSourceTargetSchemaLabel,
  getSourceTargetSchemaPlaceholder,
  getSourceTargetSchemaType,
  getSourceTargetSchemaValidationMessage,
  isRemoteSourceTargetPicker,
} from "../../model";
import { type SourceTargetSetupValue } from "../../model";

type Props = {
  disabled?: boolean;
  mode: SourceModeResponse;
  onChange: (value: SourceTargetSetupValue) => void;
  serviceKey: string;
  value: SourceTargetSetupValue;
};

type PickerState = {
  path: SourceTargetOptionItemResponse[];
  scope: string;
  searchQuery: string;
};

const TARGET_OPTION_ICON_MAP = {
  category: MdArticle,
  course: MdSchool,
  file: MdInsertDriveFile,
  folder: MdFolder,
  label: MdLabel,
  sheet: MdTableChart,
  spreadsheet: MdTableChart,
  term: MdCalendarMonth,
};

const createPickerState = (scope: string): PickerState => ({
  path: [],
  scope,
  searchQuery: "",
});

const getOptionIcon = (option: RemoteOptionPickerItem) =>
  TARGET_OPTION_ICON_MAP[option.type as keyof typeof TARGET_OPTION_ICON_MAP] ??
  MdFolder;

const renderOptionMetadata = (option: RemoteOptionPickerItem) => {
  const metadataSummary = getWorkflowMetadataSummary(option.metadata);

  return metadataSummary ? (
    <Text color="text.secondary" fontSize="xs">
      {metadataSummary}
    </Text>
  ) : null;
};

const getPickerRootLabel = (serviceKey: string, schemaType: string) => {
  if (serviceKey === "gmail" && schemaType === "label_picker") {
    return "Gmail 라벨";
  }

  if (serviceKey === "web_news" && schemaType === "category_picker") {
    return "SE Board 게시판";
  }

  if (serviceKey === "google_sheets" && schemaType === "sheet_picker") {
    return "Google Sheets";
  }

  if (schemaType === "folder_picker") {
    return "내 드라이브";
  }

  return "루트";
};

export const SourceTargetForm = ({
  disabled = false,
  mode,
  onChange,
  serviceKey,
  value,
}: Props) => {
  const schemaType = getSourceTargetSchemaType(mode.target_schema);
  const isRemotePicker = isRemoteSourceTargetPicker(mode.target_schema);
  const isFolderPicker = schemaType === "folder_picker";
  const isSheetPicker = schemaType === "sheet_picker";
  const isGroupedPicker = isGroupedSourceTargetOptionPicker(
    serviceKey,
    schemaType,
  );
  const supportsPathBrowsing = isFolderPicker || isSheetPicker;
  const helperText = getSourceTargetSchemaHelperText(mode.target_schema);
  const validationMessage = getSourceTargetSchemaValidationMessage(
    mode.target_schema,
    value.value,
  );
  const shouldShowKeywordInput = isSeBoardNewPostsSourceMode(
    serviceKey,
    mode.key,
  );
  const pickerScope = `${serviceKey}:${mode.key}:${schemaType}`;
  const [pickerState, setPickerState] = useState<PickerState>(() =>
    createPickerState(pickerScope),
  );
  const activePickerState =
    pickerState.scope === pickerScope
      ? pickerState
      : createPickerState(pickerScope);
  const { path, searchQuery } = activePickerState;
  const parentId =
    supportsPathBrowsing && path.length > 0
      ? path[path.length - 1]?.id
      : undefined;
  const pickerPath = path.map(({ id, label }) => ({ id, label }));
  const targetOptionsParams = useMemo(
    () =>
      isRemotePicker
        ? {
            mode: mode.key,
            parentId,
            query: searchQuery,
          }
        : undefined,
    [isRemotePicker, mode.key, parentId, searchQuery],
  );
  const {
    data: targetOptions,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteSourceTargetOptionsQuery(serviceKey, targetOptionsParams, {
    enabled: isRemotePicker && !disabled,
    staleTime: 1000 * 30,
  });
  const items =
    targetOptions?.pages.flatMap((page) => page.items) ??
    ([] as SourceTargetOptionItemResponse[]);

  const setScopedSearchQuery = (nextQuery: string) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createPickerState(pickerScope);

      return {
        ...base,
        searchQuery: nextQuery,
      };
    });
  };

  const handleBrowseOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    const canBrowseFolder = sourceOption?.type === "folder";
    const canBrowseSpreadsheet =
      isSheetPicker && sourceOption?.type === "spreadsheet";

    if (!sourceOption || (!canBrowseFolder && !canBrowseSpreadsheet)) {
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
    onChange({ ...value, option: null, value: "" });
  };

  const handleSelectOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption) {
      return;
    }

    if (isSheetPicker && sourceOption.type === "spreadsheet") {
      handleBrowseOption(option);
      return;
    }

    onChange({ ...value, option: sourceOption, value: sourceOption.id });
  };

  const handleResetPath = () => {
    setPickerState(createPickerState(pickerScope));
    onChange({ ...value, option: null, value: "" });
  };

  const handlePathSelect = (index: number) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createPickerState(pickerScope);

      return {
        ...base,
        path: base.path.slice(0, index + 1),
        searchQuery: "",
      };
    });
    onChange({ ...value, option: null, value: "" });
  };

  const handleKeywordChange = (keyword: string) => {
    onChange({ ...value, keyword });
  };

  const keywordInput = shouldShowKeywordInput ? (
    <Box mt={4}>
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        포함할 단어
      </Text>
      <Input
        disabled={disabled}
        placeholder="예: 장학, 수강신청"
        value={value.keyword}
        onChange={(event) => handleKeywordChange(event.target.value)}
      />
      <Text color="text.secondary" fontSize="xs" mt={2}>
        비워두면 선택한 게시판의 새 글을 모두 가져옵니다.
      </Text>
    </Box>
  ) : null;

  if (schemaType === "day_picker") {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        {DAY_PICKER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            disabled={disabled}
            justifyContent="flex-start"
            variant={value.value === option.value ? "solid" : "outline"}
            onClick={() =>
              onChange({ ...value, option: null, value: option.value })
            }
          >
            {option.label}
          </Button>
        ))}
      </Box>
    );
  }

  if (!isRemotePicker) {
    return (
      <Box>
        {helperText ? (
          <Text color="text.secondary" fontSize="sm" mb={2}>
            {helperText}
          </Text>
        ) : null}
        <Input
          disabled={disabled}
          placeholder={getSourceTargetSchemaPlaceholder(mode.target_schema)}
          type={schemaType === "time_picker" ? "time" : "text"}
          value={value.value}
          onChange={(event) =>
            onChange({ ...value, option: null, value: event.target.value })
          }
        />
        {validationMessage ? (
          <Text color="orange.500" fontSize="xs" mt={2}>
            {validationMessage}
          </Text>
        ) : null}
      </Box>
    );
  }

  if (isGroupedPicker) {
    return (
      <Box>
        {helperText ? (
          <Text color="text.secondary" fontSize="sm" mb={2}>
            {helperText}
          </Text>
        ) : null}
        <GroupedSourceTargetOptionPicker
          disabled={disabled}
          emptyMessage="선택할 수 있는 게시판이 없습니다."
          errorMessage={isError ? getApiErrorMessage(error) : null}
          getItemIcon={getOptionIcon}
          hasMore={Boolean(hasNextPage)}
          isLoading={isLoading}
          isLoadingMore={isFetchingNextPage}
          items={items}
          searchPlaceholder={`${getSourceTargetSchemaLabel(mode.target_schema)} 검색`}
          searchValue={searchQuery}
          selectedId={value.value}
          onLoadMore={() => void fetchNextPage()}
          onRetry={() => void refetch()}
          onSearchChange={setScopedSearchQuery}
          onSelect={handleSelectOption}
        />
        {keywordInput}
      </Box>
    );
  }

  return (
    <Box>
      {helperText ? (
        <Text color="text.secondary" fontSize="sm" mb={2}>
          {helperText}
        </Text>
      ) : null}
      <RemoteOptionPicker
        canBrowseItem={(option) =>
          (isFolderPicker && option.type === "folder") ||
          (isSheetPicker && option.type === "spreadsheet")
        }
        disabled={disabled}
        emptyMessage={`선택할 ${getSourceTargetSchemaLabel(mode.target_schema)}가 없습니다.`}
        errorMessage={isError ? getApiErrorMessage(error) : null}
        getBrowseLabel={(option) =>
          isSheetPicker ? `${option.label} 시트 보기` : `${option.label} 내부 폴더 보기`
        }
        getItemIcon={getOptionIcon}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        path={supportsPathBrowsing ? pickerPath : undefined}
        renderItemMetadata={renderOptionMetadata}
        rootLabel={getPickerRootLabel(serviceKey, schemaType)}
        searchPlaceholder={`${getSourceTargetSchemaLabel(mode.target_schema)} 검색`}
        searchValue={searchQuery}
        selectedId={value.value}
        onBrowse={supportsPathBrowsing ? handleBrowseOption : undefined}
        onLoadMore={() => void fetchNextPage()}
        onPathSelect={supportsPathBrowsing ? handlePathSelect : undefined}
        onResetPath={supportsPathBrowsing ? handleResetPath : undefined}
        onRetry={() => void refetch()}
        onSearchChange={setScopedSearchQuery}
        onSelect={handleSelectOption}
      />
      {keywordInput}
    </Box>
  );
};
