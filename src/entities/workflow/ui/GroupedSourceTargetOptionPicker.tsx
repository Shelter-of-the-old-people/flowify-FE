import { type IconType } from "react-icons";
import { MdSearch } from "react-icons/md";

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { type SourceTargetOptionItemResponse } from "../api";
import {
  getSourceTargetOptionGroupLabel,
  getSourceTargetOptionItemLabel,
} from "../lib";

type GroupedOption = {
  items: SourceTargetOptionItemResponse[];
  label: string;
};

type Props = {
  disabled?: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  getItemIcon?: (item: SourceTargetOptionItemResponse) => IconType;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  items: SourceTargetOptionItemResponse[];
  searchPlaceholder?: string;
  searchValue: string;
  selectedId?: string | null;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (item: SourceTargetOptionItemResponse) => void;
};

const groupOptions = (
  items: SourceTargetOptionItemResponse[],
): GroupedOption[] => {
  const groups = new Map<string, SourceTargetOptionItemResponse[]>();

  items.forEach((item) => {
    const groupLabel = getSourceTargetOptionGroupLabel(item);
    const groupItems = groups.get(groupLabel) ?? [];
    groupItems.push(item);
    groups.set(groupLabel, groupItems);
  });

  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    items: groupItems,
    label,
  }));
};

export const GroupedSourceTargetOptionPicker = ({
  disabled = false,
  emptyMessage,
  errorMessage,
  getItemIcon,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  items,
  searchPlaceholder = "검색",
  searchValue,
  selectedId,
  onLoadMore,
  onRetry,
  onSearchChange,
  onSelect,
}: Props) => {
  const groups = groupOptions(items);

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
      ) : groups.length === 0 ? (
        <Text color="text.secondary" fontSize="sm" py={4} textAlign="center">
          {emptyMessage}
        </Text>
      ) : (
        <VStack align="stretch" gap={4} maxH="320px" overflowY="auto">
          {groups.map((group) => (
            <Box key={group.label}>
              <Text
                color="text.secondary"
                fontSize="xs"
                fontWeight="bold"
                mb={2}
              >
                {group.label}
              </Text>
              <VStack align="stretch" gap={2}>
                {group.items.map((item) => {
                  const ItemIcon = getItemIcon?.(item);
                  const isSelected = selectedId === item.id;
                  const itemLabel = getSourceTargetOptionItemLabel(item);

                  return (
                    <Button
                      key={item.id}
                      disabled={disabled}
                      bg={isSelected ? "blue.50" : "white"}
                      border="1px solid"
                      borderColor={isSelected ? "blue.300" : "gray.100"}
                      borderRadius="2xl"
                      h="auto"
                      justifyContent="flex-start"
                      minH="48px"
                      px={4}
                      py={3}
                      textAlign="left"
                      variant="ghost"
                      whiteSpace="normal"
                      _hover={{
                        bg: isSelected ? "blue.50" : "gray.50",
                        borderColor: isSelected ? "blue.300" : "gray.200",
                      }}
                      onClick={() => onSelect(item)}
                    >
                      <HStack gap={3} minW={0} w="full">
                        {ItemIcon ? (
                          <Icon
                            as={ItemIcon}
                            boxSize={5}
                            color={isSelected ? "blue.600" : "gray.600"}
                            flexShrink={0}
                          />
                        ) : null}
                        <Text fontSize="sm" fontWeight="semibold" minW={0}>
                          {itemLabel}
                        </Text>
                      </HStack>
                    </Button>
                  );
                })}
              </VStack>
            </Box>
          ))}
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
          더보기
        </Button>
      ) : null}
    </Box>
  );
};
