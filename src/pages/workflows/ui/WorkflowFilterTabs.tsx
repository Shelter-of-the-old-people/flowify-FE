import { Button, HStack } from "@chakra-ui/react";

import { WORKFLOW_FILTERS, type WorkflowFilterKey } from "../model";

type Props = {
  activeFilter: WorkflowFilterKey;
  onChange: (filter: WorkflowFilterKey) => void;
};

export const WorkflowFilterTabs = ({ activeFilter, onChange }: Props) => (
  <HStack gap={6} px={2} py={3}>
    {WORKFLOW_FILTERS.map((filter) => {
      const isActive = filter.key === activeFilter;

      return (
        <Button
          key={filter.key}
          type="button"
          variant="ghost"
          minW="auto"
          minH="auto"
          h="auto"
          px={0}
          py={0.5}
          border="none"
          fontSize="sm"
          fontWeight={isActive ? "semibold" : "medium"}
          color="text.primary"
          borderBottom="1px solid"
          borderColor={isActive ? "neutral.950" : "transparent"}
          transition="border-color 160ms ease"
          borderRadius="none"
          boxShadow="none"
          bg="transparent"
          _hover={{ bg: "transparent" }}
          _active={{ bg: "transparent" }}
          _focusVisible={{
            outline: "none",
            boxShadow: "none",
          }}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </Button>
      );
    })}
  </HStack>
);
