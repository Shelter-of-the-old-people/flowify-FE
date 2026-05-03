import { type ReactNode } from "react";
import { type IconType } from "react-icons";
import { MdChevronRight, MdSearch } from "react-icons/md";

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
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

export interface RemoteOptionPathItem {
  id: string;
  label: string;
}

type Props = {
  canBrowseItem?: (item: RemoteOptionPickerItem) => boolean;
  disabled?: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  getBrowseLabel?: (item: RemoteOptionPickerItem) => string;
  getItemIcon?: (item: RemoteOptionPickerItem) => IconType;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  items: RemoteOptionPickerItem[];
  path?: RemoteOptionPathItem[];
  renderItemMetadata?: (item: RemoteOptionPickerItem) => ReactNode;
  rootLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
  selectedId?: string | null;
  onBrowse?: (item: RemoteOptionPickerItem) => void;
  onLoadMore?: () => void;
  onPathSelect?: (index: number) => void;
  onResetPath?: () => void;
  onRetry?: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (item: RemoteOptionPickerItem) => void;
};

export const RemoteOptionPicker = ({
  canBrowseItem,
  disabled = false,
  emptyMessage,
  errorMessage,
  getBrowseLabel,
  getItemIcon,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  items,
  path = [],
  renderItemMetadata,
  rootLabel = "Root",
  searchPlaceholder = "검색",
  searchValue,
  selectedId,
  onBrowse,
  onLoadMore,
  onPathSelect,
  onResetPath,
  onRetry,
  onSearchChange,
  onSelect,
}: Props) => {
  const hasPath = path.length > 0;

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box position="relative">
        <Input
          disabled={disabled}
          placeholder={searchPlaceholder}
          pr={10}
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
        <HStack gap={1} overflowX="auto" py={1}>
          <Button
            disabled={disabled || !onResetPath}
            flexShrink={0}
            size="xs"
            variant={hasPath ? "outline" : "solid"}
            onClick={onResetPath}
          >
            {rootLabel}
          </Button>
          {path.map((pathItem, index) => (
            <HStack key={pathItem.id} flexShrink={0} gap={1}>
              <Text color="text.secondary" fontSize="xs">
                /
              </Text>
              <Button
                disabled={disabled || !onPathSelect}
                size="xs"
                variant={index === path.length - 1 ? "solid" : "outline"}
                onClick={() => onPathSelect?.(index)}
              >
                {pathItem.label}
              </Button>
            </HStack>
          ))}
        </HStack>
      ) : null}

      {isLoading ? (
        <Flex alignItems="center" gap={2}>
          <Spinner color="gray.500" size="sm" />
          <Text color="text.secondary" fontSize="sm">
            선택지를 불러오는 중입니다.
          </Text>
        </Flex>
      ) : errorMessage ? (
        <Box bg="red.50" borderRadius="2xl" px={4} py={3}>
          <Text color="red.600" fontSize="sm">
            {errorMessage}
          </Text>
          {onRetry ? (
            <Button
              disabled={disabled}
              mt={3}
              size="sm"
              variant="outline"
              onClick={onRetry}
            >
              다시 시도
            </Button>
          ) : null}
        </Box>
      ) : items.length === 0 ? (
        <Text color="text.secondary" fontSize="sm" py={4} textAlign="center">
          {emptyMessage}
        </Text>
      ) : (
        <VStack align="stretch" gap={2} maxH="320px" overflowY="auto">
          {items.map((item) => {
            const ItemIcon = getItemIcon?.(item);
            const isSelected = selectedId === item.id;
            const canBrowse =
              Boolean(onBrowse) && (canBrowseItem?.(item) ?? true);

            return (
              <Flex
                key={item.id}
                alignItems="stretch"
                bg={isSelected ? "blue.50" : "white"}
                border="1px solid"
                borderColor={isSelected ? "blue.300" : "gray.100"}
                borderRadius="2xl"
                gap={2}
                p={1}
                transition="border-color 150ms ease, background 150ms ease"
                _hover={{
                  bg: isSelected ? "blue.50" : "gray.50",
                  borderColor: isSelected ? "blue.300" : "gray.200",
                }}
              >
                <Button
                  disabled={disabled}
                  flex={1}
                  h="auto"
                  justifyContent="flex-start"
                  minW={0}
                  px={3}
                  py={2}
                  textAlign="left"
                  variant="ghost"
                  whiteSpace="normal"
                  onClick={() => onSelect(item)}
                >
                  <Flex alignItems="flex-start" gap={3} minW={0} w="full">
                    {ItemIcon ? (
                      <Box flexShrink={0} pt={1}>
                        <Icon as={ItemIcon} boxSize={5} color="gray.600" />
                      </Box>
                    ) : null}

                    <Box minW={0}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text color="text.secondary" fontSize="xs" mt={1}>
                          {item.description}
                        </Text>
                      ) : null}
                      {renderItemMetadata ? (
                        <Box mt={1}>{renderItemMetadata(item)}</Box>
                      ) : null}
                    </Box>
                  </Flex>
                </Button>

                {canBrowse ? (
                  <IconButton
                    aria-label={getBrowseLabel?.(item) ?? `${item.label} 열기`}
                    disabled={disabled}
                    flexShrink={0}
                    minH="44px"
                    size="sm"
                    variant="ghost"
                    onClick={() => onBrowse?.(item)}
                  >
                    <Icon as={MdChevronRight} boxSize={5} />
                  </IconButton>
                ) : null}
              </Flex>
            );
          })}
        </VStack>
      )}

      {hasMore ? (
        <Button
          disabled={disabled}
          loading={isLoadingMore}
          size="sm"
          variant="outline"
          onClick={onLoadMore}
        >
          더 보기
        </Button>
      ) : null}
    </Box>
  );
};
