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
  useCreateGoogleSheetMutation,
  useCreateGoogleSheetsSpreadsheetMutation,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";
import {
  FeedSourcePicker,
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";
import { toaster } from "@/shared/utils";

import {
  DAY_PICKER_OPTIONS,
  type SourceTargetPickerValue,
  getTargetSchemaLabel,
  getTargetSchemaPlaceholder,
  getTargetSchemaType,
  isRemoteTargetPicker,
} from "../model/source-target-picker";

type Props = {
  mode: SourceModeResponse;
  onChange: (value: SourceTargetPickerValue) => void;
  serviceKey: string;
  value: SourceTargetPickerValue;
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

const createPickerState = (scope: string): PickerState => ({
  path: [],
  scope,
  searchQuery: "",
});

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

export const SourceTargetPicker = ({
  mode,
  onChange,
  serviceKey,
  value,
}: Props) => {
  const schemaType = getTargetSchemaType(mode.target_schema);
  const isRemotePicker = isRemoteTargetPicker(mode.target_schema);
  const isFeedSourcePicker = schemaType === "feed_source_picker";
  const isFolderPicker = schemaType === "folder_picker";
  const isSheetPicker = schemaType === "sheet_picker";
  const isGroupedPicker = isGroupedSourceTargetOptionPicker(
    serviceKey,
    schemaType,
  );
  const isGoogleSheetsPicker = serviceKey === "google_sheets" && isSheetPicker;
  const supportsPathBrowsing = isFolderPicker || isSheetPicker;
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
    enabled: isRemotePicker,
    staleTime: 1000 * 30,
  });
  const items =
    targetOptions?.pages.flatMap((page) => page.items) ??
    ([] as SourceTargetOptionItemResponse[]);
  const feedSelectedOptions = value.selectedOptions ?? [];
  const feedCustomValues = value.customValues ?? [];
  const feedMaxItems =
    typeof mode.target_schema.max_items === "number"
      ? mode.target_schema.max_items
      : 10;
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

  const getFeedPrimaryValue = (
    selectedOptions: SourceTargetOptionItemResponse[],
    customValues: string[],
  ) => selectedOptions[0]?.id ?? customValues[0] ?? "";

  const handleSelectFeedOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption) {
      return;
    }

    if (feedCustomValues.includes(sourceOption.id)) {
      return;
    }

    const nextSelectedOptions = feedSelectedOptions.some(
      (selectedOption) => selectedOption.id === sourceOption.id,
    )
      ? feedSelectedOptions
      : [...feedSelectedOptions, sourceOption];

    onChange({
      ...value,
      option: null,
      selectedOptions: nextSelectedOptions,
      value: getFeedPrimaryValue(nextSelectedOptions, feedCustomValues),
    });
  };

  const handleRemoveFeedOption = (id: string) => {
    const nextSelectedOptions = feedSelectedOptions.filter(
      (option) => option.id !== id,
    );

    onChange({
      ...value,
      option: null,
      selectedOptions: nextSelectedOptions,
      value: getFeedPrimaryValue(nextSelectedOptions, feedCustomValues),
    });
  };

  const handleAddFeedCustomValue = (customValue: string) => {
    if (feedSelectedOptions.some((option) => option.id === customValue)) {
      return;
    }

    const nextCustomValues = feedCustomValues.includes(customValue)
      ? feedCustomValues
      : [...feedCustomValues, customValue];

    onChange({
      ...value,
      option: null,
      customValues: nextCustomValues,
      value: getFeedPrimaryValue(feedSelectedOptions, nextCustomValues),
    });
  };

  const handleRemoveFeedCustomValue = (customValue: string) => {
    const nextCustomValues = feedCustomValues.filter(
      (value) => value !== customValue,
    );

    onChange({
      ...value,
      option: null,
      customValues: nextCustomValues,
      value: getFeedPrimaryValue(feedSelectedOptions, nextCustomValues),
    });
  };

  const handleCreateSpreadsheet = async () => {
    const trimmedName = newSpreadsheetName.trim();
    if (!isGoogleSheetsPicker || trimmedName.length === 0) {
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
      onChange({ ...value, option: null, value: "" });
      toaster.create({
        type: "success",
        description: "새 스프레드시트를 만들고 바로 이동했습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  const handleCreateSheet = async () => {
    const trimmedSheetName = newSheetName.trim();
    if (!currentSpreadsheet || trimmedSheetName.length === 0) {
      return;
    }

    try {
      const createdSheet = await createSheetMutation.mutateAsync({
        spreadsheetId: currentSpreadsheet.id,
        sheetName: trimmedSheetName,
      });
      setNewSheetName("");
      onChange({ ...value, option: createdSheet, value: createdSheet.id });
      toaster.create({
        type: "success",
        description: "시트를 준비하고 바로 선택했습니다.",
      });
    } catch {
      // mutation toast handles the error state
    }
  };

  const keywordInput = shouldShowKeywordInput ? (
    <Box mt={4}>
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        포함 검색어
      </Text>
      <Input
        placeholder="예: 수강신청, 공지"
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
      <Input
        placeholder={getTargetSchemaPlaceholder(mode.target_schema)}
        type={schemaType === "time_picker" ? "time" : "text"}
        value={value.value}
        onChange={(event) =>
          onChange({ ...value, option: null, value: event.target.value })
        }
      />
    );
  }

  if (isFeedSourcePicker) {
    return (
      <FeedSourcePicker
        customValues={feedCustomValues}
        emptyMessage="선택할 수 있는 출처가 없습니다."
        errorMessage={isError ? getApiErrorMessage(error) : null}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        maxItems={feedMaxItems}
        searchValue={searchQuery}
        selectedOptions={feedSelectedOptions}
        onAddCustomValue={handleAddFeedCustomValue}
        onLoadMore={() => void fetchNextPage()}
        onRemoveCustomValue={handleRemoveFeedCustomValue}
        onRemoveOption={handleRemoveFeedOption}
        onRetry={() => void refetch()}
        onSearchChange={setScopedSearchQuery}
        onSelectOption={handleSelectFeedOption}
      />
    );
  }

  if (isGroupedPicker) {
    return (
      <Box>
        <GroupedSourceTargetOptionPicker
          emptyMessage="선택할 수 있는 게시판이 없습니다."
          errorMessage={isError ? getApiErrorMessage(error) : null}
          getItemIcon={getOptionIcon}
          hasMore={Boolean(hasNextPage)}
          isLoading={isLoading}
          isLoadingMore={isFetchingNextPage}
          items={items}
          searchPlaceholder={`${getTargetSchemaLabel(mode.target_schema)} 검색`}
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
    <Box display="flex" flexDirection="column" gap={3}>
      <RemoteOptionPicker
        canBrowseItem={(option) =>
          (isFolderPicker && option.type === "folder") ||
          (isSheetPicker && option.type === "spreadsheet")
        }
        emptyMessage={`선택할 ${getTargetSchemaLabel(mode.target_schema)}가 없습니다.`}
        errorMessage={isError ? getApiErrorMessage(error) : null}
        getBrowseLabel={(option) =>
          isSheetPicker
            ? `${option.label} 시트 보기`
            : `${option.label} 아래 폴더 보기`
        }
        getItemIcon={getOptionIcon}
        hasMore={Boolean(hasNextPage)}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        items={items}
        path={supportsPathBrowsing ? pickerPath : undefined}
        renderItemMetadata={renderOptionMetadata}
        rootLabel={getPickerRootLabel(serviceKey, schemaType)}
        searchPlaceholder={`${getTargetSchemaLabel(mode.target_schema)} 검색`}
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

      {isGoogleSheetsPicker ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {currentSpreadsheet ? (
            <>
              <Text color="text.secondary" fontSize="xs">
                원하는 시트가 없으면 여기에서 새 시트를 만들 수 있습니다.
              </Text>
              <Box display="flex" gap={2}>
                <Input
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
