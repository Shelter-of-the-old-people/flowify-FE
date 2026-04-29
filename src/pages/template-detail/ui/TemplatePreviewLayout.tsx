import { type ReactNode } from "react";

import { Box, Grid, GridItem } from "@chakra-ui/react";

type Props = {
  sidebar: ReactNode;
  preview: ReactNode;
};

export const TemplatePreviewLayout = ({ sidebar, preview }: Props) => (
  <Grid
    maxW="1600px"
    mx="auto"
    w="full"
    minH="calc(100vh - 80px)"
    templateColumns={{ base: "1fr", lg: "390px minmax(0, 1fr)" }}
    gap={{ base: 6, lg: 8 }}
    alignItems="stretch"
  >
    <GridItem>{sidebar}</GridItem>
    <GridItem minW={0}>
      <Box
        position="relative"
        minH={{ base: "420px", lg: "calc(100vh - 128px)" }}
        borderRadius="40px"
        border="1px solid"
        borderColor="transparent"
        overflow="hidden"
        bgImage="radial-gradient(circle, rgba(157,163,177,0.32) 1px, transparent 1px)"
        bgSize="16px 16px"
        bgColor="bg.canvas"
      >
        {preview}
      </Box>
    </GridItem>
  </Grid>
);
