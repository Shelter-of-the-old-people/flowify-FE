import { useMemo, useState } from "react";
import {
  MdCalendarMonth,
  MdFolder,
  MdInsertDriveFile,
  MdLabel,
  MdSchool,
} from "react-icons/md";

import { Box, Button, Input, Text } from "@chakra-ui/react";

import {
  type SourceModeResponse,
  type SourceTargetOptionItemResponse,
  getWorkflowMetadataSummary,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";
import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
  getApiErrorMessage,
} from "@/shared";

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
  folderPath: SourceTargetOptionItemResponse[];
  scope: string;
  searchQuery: string;
};

const TARGET_OPTION_ICON_MAP = {
  course: MdSchool,
  file: MdInsertDriveFile,
  folder: MdFolder,
  label: MdLabel,
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
  folderPath: [],
  scope,
  searchQuery: "",
});

const getPickerRootLabel = (serviceKey: string, schemaType: string) => {
  if (serviceKey === "gmail" && schemaType === "label_picker") {
    return "Gmail 라벨";
  }

  return "내 드라이브";
};

export const SourceTargetPicker = ({
  mode,
  onChange,
  serviceKey,
  value,
}: Props) => {
  const schemaType = getTargetSchemaType(mode.target_schema);
  const isRemotePicker = isRemoteTargetPicker(mode.target_schema);
  const isFolderPicker = schemaType === "folder_picker";
  const pickerScope = `${serviceKey}:${mode.key}:${schemaType}`;
  const [pickerState, setPickerState] = useState<PickerState>(() =>
    createPickerState(pickerScope),
  );
  const activePickerState =
    pickerState.scope === pickerScope
      ? pickerState
      : createPickerState(pickerScope);
  const { folderPath, searchQuery } = activePickerState;
  const parentId =
    isFolderPicker && folderPath.length > 0
      ? folderPath[folderPath.length - 1]?.id
      : undefined;
  const pickerPath = folderPath.map(({ id, label }) => ({ id, label }));
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
    if (!sourceOption || sourceOption.type !== "folder") {
      return;
    }

    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createPickerState(pickerScope);

      return {
        ...base,
        folderPath: [...base.folderPath, sourceOption],
        searchQuery: "",
      };
    });
    onChange({ option: null, value: "" });
  };

  const handleSelectOption = (option: RemoteOptionPickerItem) => {
    const sourceOption = items.find((item) => item.id === option.id);
    if (!sourceOption) {
      return;
    }

    onChange({ option: sourceOption, value: sourceOption.id });
  };

  const handleResetPath = () => {
    setPickerState(createPickerState(pickerScope));
    onChange({ option: null, value: "" });
  };

  const handlePathSelect = (index: number) => {
    setPickerState((current) => {
      const base =
        current.scope === pickerScope
          ? current
          : createPickerState(pickerScope);

      return {
        ...base,
        folderPath: base.folderPath.slice(0, index + 1),
        searchQuery: "",
      };
    });
    onChange({ option: null, value: "" });
  };

  if (schemaType === "day_picker") {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        {DAY_PICKER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            justifyContent="flex-start"
            variant={value.value === option.value ? "solid" : "outline"}
            onClick={() => onChange({ option: null, value: option.value })}
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
          onChange({ option: null, value: event.target.value })
        }
      />
    );
  }

  return (
    <RemoteOptionPicker
      canBrowseItem={(option) => isFolderPicker && option.type === "folder"}
      emptyMessage={`선택할 수 있는 ${getTargetSchemaLabel(mode.target_schema)}이 없습니다.`}
      errorMessage={isError ? getApiErrorMessage(error) : null}
      getBrowseLabel={(option) => `${option.label} 내부 폴더 보기`}
      getItemIcon={getOptionIcon}
      hasMore={Boolean(hasNextPage)}
      isLoading={isLoading}
      isLoadingMore={isFetchingNextPage}
      items={items}
      path={isFolderPicker ? pickerPath : undefined}
      renderItemMetadata={renderOptionMetadata}
      rootLabel={getPickerRootLabel(serviceKey, schemaType)}
      searchPlaceholder={`${getTargetSchemaLabel(mode.target_schema)} 검색`}
      searchValue={searchQuery}
      selectedId={value.value}
      onBrowse={isFolderPicker ? handleBrowseOption : undefined}
      onLoadMore={() => void fetchNextPage()}
      onPathSelect={isFolderPicker ? handlePathSelect : undefined}
      onResetPath={isFolderPicker ? handleResetPath : undefined}
      onRetry={() => void refetch()}
      onSearchChange={setScopedSearchQuery}
      onSelect={handleSelectOption}
    />
  );
};
