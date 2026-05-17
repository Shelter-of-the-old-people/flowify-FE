import { useState } from "react";
import { MdClose, MdLanguage } from "react-icons/md";

import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";

import {
  RemoteOptionPicker,
  type RemoteOptionPickerItem,
} from "./RemoteOptionPicker";

type Props = {
  customValues: string[];
  disabled?: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  items: RemoteOptionPickerItem[];
  maxItems: number;
  searchValue: string;
  selectedOptions: RemoteOptionPickerItem[];
  onAddCustomValue: (value: string) => void;
  onLoadMore?: () => void;
  onRemoveCustomValue: (value: string) => void;
  onRemoveOption: (id: string) => void;
  onRetry?: () => void;
  onSearchChange: (value: string) => void;
  onSelectOption: (option: RemoteOptionPickerItem) => void;
};

const getMetadataText = (item: RemoteOptionPickerItem) => {
  const metadata = item.metadata ?? {};
  const values = [
    metadata.category,
    metadata.language,
    metadata.sourceType,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return values.join(" · ");
};

const isValidHttpsUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const FeedSourcePicker = ({
  customValues,
  disabled = false,
  emptyMessage,
  errorMessage,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  items,
  maxItems,
  searchValue,
  selectedOptions,
  onAddCustomValue,
  onLoadMore,
  onRemoveCustomValue,
  onRemoveOption,
  onRetry,
  onSearchChange,
  onSelectOption,
}: Props) => {
  const [customValue, setCustomValue] = useState("");
  const selectedCount = selectedOptions.length + customValues.length;
  const isLimitReached = selectedCount >= maxItems;
  const trimmedCustomValue = customValue.trim();
  const customValidationMessage =
    trimmedCustomValue.length > 0 && !isValidHttpsUrl(trimmedCustomValue)
      ? "https://로 시작하는 사이트 주소를 입력해 주세요."
      : null;
  const canAddCustomValue =
    !disabled &&
    !isLimitReached &&
    trimmedCustomValue.length > 0 &&
    customValidationMessage === null;

  const handleAddCustomValue = () => {
    if (!canAddCustomValue) {
      return;
    }

    onAddCustomValue(trimmedCustomValue);
    setCustomValue("");
  };

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <RemoteOptionPicker
        disabled={disabled}
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        getItemIcon={() => MdLanguage}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        items={items}
        renderItemMetadata={(item) => {
          const metadataText = getMetadataText(item);
          return metadataText ? (
            <Text color="text.secondary" fontSize="xs">
              {metadataText}
            </Text>
          ) : null;
        }}
        searchPlaceholder="언론사, 사이트, 주제 검색"
        searchValue={searchValue}
        onLoadMore={onLoadMore}
        onRetry={onRetry}
        onSearchChange={onSearchChange}
        onSelect={(item) => {
          if (!isLimitReached) {
            onSelectOption(item);
          }
        }}
      />

      <Box>
        <HStack justifyContent="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="semibold">
            선택한 출처
          </Text>
          <Text color="text.secondary" fontSize="xs">
            {selectedCount}/{maxItems}
          </Text>
        </HStack>
        {selectedCount > 0 ? (
          <Box display="flex" flexWrap="wrap" gap={2}>
            {selectedOptions.map((option) => (
              <HStack
                key={option.id}
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="full"
                gap={1}
                maxW="full"
                px={3}
                py={1}
              >
                <Icon as={MdLanguage} boxSize={4} color="gray.500" />
                <Text fontSize="xs" fontWeight="medium">
                  {option.label}
                </Text>
                <IconButton
                  aria-label={`${option.label} 제거`}
                  disabled={disabled}
                  minW={5}
                  size="xs"
                  variant="ghost"
                  onClick={() => onRemoveOption(option.id)}
                >
                  <Icon as={MdClose} boxSize={3} />
                </IconButton>
              </HStack>
            ))}
            {customValues.map((value) => (
              <HStack
                key={value}
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="full"
                gap={1}
                maxW="full"
                px={3}
                py={1}
              >
                <Icon as={MdLanguage} boxSize={4} color="gray.500" />
                <Text fontSize="xs" fontWeight="medium">
                  {value}
                </Text>
                <IconButton
                  aria-label={`${value} 제거`}
                  disabled={disabled}
                  minW={5}
                  size="xs"
                  variant="ghost"
                  onClick={() => onRemoveCustomValue(value)}
                >
                  <Icon as={MdClose} boxSize={3} />
                </IconButton>
              </HStack>
            ))}
          </Box>
        ) : (
          <Text color="text.secondary" fontSize="sm">
            아직 선택한 출처가 없습니다.
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          직접 입력
        </Text>
        <HStack alignItems="flex-start">
          <Box flex={1}>
            <Input
              disabled={disabled || isLimitReached}
              placeholder="https://example.com/feed"
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddCustomValue();
                }
              }}
            />
            {customValidationMessage ? (
              <Text color="orange.500" fontSize="xs" mt={2}>
                {customValidationMessage}
              </Text>
            ) : null}
          </Box>
          <Button
            disabled={!canAddCustomValue}
            flexShrink={0}
            onClick={handleAddCustomValue}
          >
            추가
          </Button>
        </HStack>
        {isLimitReached ? (
          <Text color="text.secondary" fontSize="xs" mt={2}>
            출처는 최대 {maxItems}개까지 선택할 수 있습니다.
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
