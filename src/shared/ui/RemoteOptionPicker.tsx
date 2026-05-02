import { MdChevronRight, MdFolder, MdSearch } from "react-icons/md";

import {
  Box,
  Button,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

export interface RemoteOptionPickerItem {
  id: string;
  label: string;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown>;
}

interface RemoteOptionPickerProps {
  disabled?: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  items: RemoteOptionPickerItem[];
  listMaxHeight?: string;
  path?: Array<{ id: string; label: string }>;
  rootLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
  selectedId?: string | null;
  onBrowse?: (item: RemoteOptionPickerItem) => void;
  onLoadMore?: () => void;
  onPathSelect?: (index: number) => void;
  onResetPath?: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (item: RemoteOptionPickerItem) => void;
}

const isBrowsableFolder = (item: RemoteOptionPickerItem) =>
  item.type === "folder";

export const RemoteOptionPicker = ({
  disabled = false,
  emptyMessage,
  errorMessage,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  items,
  listMaxHeight = "min(240px, 30vh)",
  onBrowse,
  onLoadMore,
  onPathSelect,
  onResetPath,
  onSearchChange,
  onSelect,
  path = [],
  rootLabel = "루트",
  searchPlaceholder = "검색",
  searchValue,
  selectedId,
}: RemoteOptionPickerProps) => {
  const hasPath = path.length > 0;
  const showInitialLoading = isLoading && items.length === 0;

  return (
    <VStack align="stretch" gap={3}>
      <Box position="relative">
        <Input
          disabled={disabled}
          placeholder={searchPlaceholder}
          pr={12}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
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

      {hasPath || onResetPath ? (
        <Box alignItems="center" display="flex" flexWrap="wrap" gap={2}>
          <Button
            disabled={disabled}
            size="sm"
            variant={hasPath ? "ghost" : "outline"}
            onClick={() => onResetPath?.()}
          >
            {rootLabel}
          </Button>
          {path.map((item, index) => (
            <Box
              key={`${item.id}-${index}`}
              alignItems="center"
              display="flex"
              gap={2}
            >
              <Icon as={MdChevronRight} boxSize={4} color="gray.500" />
              <Button
                disabled={disabled}
                size="sm"
                variant="ghost"
                onClick={() => onPathSelect?.(index)}
              >
                {item.label}
              </Button>
            </Box>
          ))}
        </Box>
      ) : null}

      {showInitialLoading ? (
        <Box alignItems="center" display="flex" gap={2} py={6}>
          <Spinner color="gray.500" size="sm" />
          <Text color="text.secondary" fontSize="sm">
            옵션을 불러오는 중입니다.
          </Text>
        </Box>
      ) : null}

      {!showInitialLoading && errorMessage ? (
        <Text color="status.error" fontSize="sm">
          {errorMessage}
        </Text>
      ) : null}

      {!showInitialLoading && !errorMessage && items.length === 0 ? (
        <Text color="text.secondary" fontSize="sm">
          {emptyMessage}
        </Text>
      ) : null}

      {!showInitialLoading && items.length > 0 ? (
        <Box maxH={listMaxHeight} overflowY="auto" pr={1}>
          <VStack align="stretch" gap={3}>
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              const canBrowse = Boolean(onBrowse && isBrowsableFolder(item));

              return (
                <Box
                  key={item.id}
                  border="1px solid"
                  borderColor={isSelected ? "black" : "gray.200"}
                  borderRadius="2xl"
                  cursor={disabled ? "default" : "pointer"}
                  opacity={disabled ? 0.7 : 1}
                  px={4}
                  py={4}
                  transition="background 150ms ease, border-color 150ms ease"
                  _hover={disabled ? undefined : { bg: "gray.50" }}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }

                    onSelect(item);
                  }}
                >
                  <Box
                    alignItems="flex-start"
                    display="flex"
                    gap={3}
                    justifyContent="space-between"
                  >
                    <Box flex="1">
                      <Box alignItems="center" display="flex" gap={2}>
                        {isBrowsableFolder(item) ? (
                          <Icon as={MdFolder} boxSize={5} color="gray.600" />
                        ) : null}
                        <Text fontSize="sm" fontWeight="semibold">
                          {item.label}
                        </Text>
                      </Box>

                      {item.description ? (
                        <Text color="text.secondary" fontSize="xs" mt={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </Box>

                    {canBrowse ? (
                      <Button
                        disabled={disabled}
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          if (disabled) {
                            return;
                          }

                          event.stopPropagation();
                          onBrowse(item);
                        }}
                      >
                        열기
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              );
            })}
          </VStack>
        </Box>
      ) : null}

      {hasMore ? (
        <Button
          alignSelf="flex-start"
          disabled={disabled}
          loading={isLoadingMore}
          size="sm"
          variant="outline"
          onClick={() => onLoadMore?.()}
        >
          더 보기
        </Button>
      ) : null}
    </VStack>
  );
};
