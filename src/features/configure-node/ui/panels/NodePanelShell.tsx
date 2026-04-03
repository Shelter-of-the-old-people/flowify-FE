import type { ReactNode } from "react";

import { Box, Heading, Text } from "@chakra-ui/react";

interface NodePanelShellProps {
  description?: string | null;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}

export const NodePanelShell = ({
  description,
  eyebrow,
  title,
  children,
}: NodePanelShellProps) => {
  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Box display="flex" flexDirection="column" gap={1}>
        {eyebrow ? (
          <Text fontSize="xs" fontWeight="medium" color="text.secondary">
            {eyebrow}
          </Text>
        ) : null}
        <Heading size="md" color="text.primary">
          {title}
        </Heading>
        {description ? (
          <Text fontSize="sm" color="text.secondary">
            {description}
          </Text>
        ) : null}
      </Box>

      {children}
    </Box>
  );
};
