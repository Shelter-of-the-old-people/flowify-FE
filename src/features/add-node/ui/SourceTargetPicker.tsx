import { useMemo, useState } from "react";
import { type KeyboardEvent } from "react";
import {
  MdCalendarMonth,
  MdFolder,
  MdInsertDriveFile,
  MdSchool,
  MdSearch,
} from "react-icons/md";

import {
  Box,
  Button,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  type SourceModeResponse,
  type SourceTargetOptionItemResponse,
  useInfiniteSourceTargetOptionsQuery,
} from "@/entities/workflow";

import {
  DAY_PICKER_OPTIONS,
  type SourceTargetPickerValue,
  getTargetSchemaLabel,
  getTargetSchemaPlaceholder,
  getTargetSchemaType,
  isRemoteTargetPicker,
} from "../model/source-target-picker";

type SourceTargetPickerProps = {
  mode: SourceModeResponse;
  onChange: (value: SourceTargetPickerValue) => void;
  serviceKey: string;
  value: SourceTargetPickerValue;
};

const TARGET_OPTION_ICON_MAP = {
  course: MdSchool,
  file: MdInsertDriveFile,
  folder: MdFolder,
  term: MdCalendarMonth,
};

const getOptionIcon = (type: string) =>
  TARGET_OPTION_ICON_MAP[type as keyof typeof TARGET_OPTION_ICON_MAP] ??
  MdFolder;

const formatMetadataValue = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
};

const getMetadataSummary = (
  metadata: SourceTargetOptionItemResponse["metadata"],
) => {
  const summaryKeys = [
    "term",
    "courseCount",
    "mimeType",
    "modifiedTime",
    "size",
  ];

  return summaryKeys
    .map((key) => {
      const value = formatMetadataValue(metadata[key]);
      return value ? `${key}: ${value}` : null;
    })
    .filter((value): value is string => value !== null)
    .join(" · ");
};

const SourceTargetOptionRow = ({
  isSelected,
  onSelect,
  option,
}: {
  isSelected: boolean;
  onSelect: () => void;
  option: SourceTargetOptionItemResponse;
}) => {
  const metadataSummary = getMetadataSummary(option.metadata);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelect();
  };

  return (
    <Box
      alignItems="flex-start"
      bg={isSelected ? "blue.50" : "white"}
      border="1px solid"
      borderColor={isSelected ? "blue.300" : "gray.100"}
      borderRadius="2xl"
      cursor="pointer"
      display="flex"
      gap={3}
      px={4}
      py={3}
      role="button"
      tabIndex={0}
      transition="border-color 150ms ease, background 150ms ease"
      _hover={{
        bg: isSelected ? "blue.50" : "gray.50",
        borderColor: isSelected ? "blue.300" : "gray.200",
      }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <Box flexShrink={0} pt={1}>
        <Icon as={getOptionIcon(option.type)} boxSize={5} color="gray.600" />
      </Box>

      <Box minW={0}>
        <Text fontSize="sm" fontWeight="semibold">
          {option.label}
        </Text>
        {option.description ? (
          <Text color="text.secondary" fontSize="xs" mt={1}>
            {option.description}
          </Text>
        ) : null}
        {metadataSummary ? (
          <Text color="text.secondary" fontSize="xs" mt={1}>
            {metadataSummary}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

export const SourceTargetPicker = ({
  mode,
  onChange,
  serviceKey,
  value,
}: SourceTargetPickerProps) => {
  const schemaType = getTargetSchemaType(mode.target_schema);
  const isRemotePicker = isRemoteTargetPicker(mode.target_schema);
  const [searchQuery, setSearchQuery] = useState("");
  const targetOptionsParams = useMemo(
    () =>
      isRemotePicker
        ? {
            mode: mode.key,
            query: searchQuery,
          }
        : undefined,
    [isRemotePicker, mode.key, searchQuery],
  );
  const {
    data: targetOptions,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
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

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery);
  };

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box position="relative">
        <Input
          placeholder={`${getTargetSchemaLabel(mode.target_schema)} 검색`}
          pr={10}
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
        <Box
          pointerEvents="none"
          position="absolute"
          right={4}
          top="50%"
          transform="translateY(-50%)"
        >
          <Icon as={MdSearch} boxSize={5} color="gray.500" />
        </Box>
      </Box>

      {isLoading ? (
        <Box alignItems="center" display="flex" gap={2}>
          <Spinner color="gray.500" size="sm" />
          <Text color="text.secondary" fontSize="sm">
            선택지를 불러오는 중입니다.
          </Text>
        </Box>
      ) : isError ? (
        <Box bg="red.50" borderRadius="2xl" px={4} py={3}>
          <Text color="red.600" fontSize="sm">
            선택지를 불러오지 못했습니다.
          </Text>
          <Button mt={3} size="sm" variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </Box>
      ) : items.length === 0 ? (
        <Text color="text.secondary" fontSize="sm" py={4} textAlign="center">
          선택할 수 있는 {getTargetSchemaLabel(mode.target_schema)}이 없습니다.
        </Text>
      ) : (
        <VStack align="stretch" gap={2} maxH="320px" overflowY="auto">
          {items.map((option) => (
            <SourceTargetOptionRow
              key={option.id}
              isSelected={value.value === option.id}
              option={option}
              onSelect={() => onChange({ option, value: option.id })}
            />
          ))}
        </VStack>
      )}

      {hasNextPage ? (
        <Button
          disabled={isFetching}
          loading={isFetchingNextPage}
          size="sm"
          variant="outline"
          onClick={() => void fetchNextPage()}
        >
          더 보기
        </Button>
      ) : null}
    </Box>
  );
};
