import { Grid, GridItem, Text, VStack } from "@chakra-ui/react";

type MetaItem = {
  label: string;
  value: string;
};

type Props = {
  items: MetaItem[];
};

export const TemplateMetaSection = ({ items }: Props) => (
  <Grid
    templateColumns={{ base: "repeat(2, minmax(0, 1fr))", xl: "1fr" }}
    gap={3}
  >
    {items.map((item) => (
      <GridItem
        key={item.label}
        px={4}
        py={3}
        borderRadius="20px"
        bg="bg.muted"
        border="1px solid"
        borderColor="border.muted"
      >
        <VStack align="stretch" gap={1}>
          <Text fontSize="xs" fontWeight="medium" color="text.secondary">
            {item.label}
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="text.primary">
            {item.value}
          </Text>
        </VStack>
      </GridItem>
    ))}
  </Grid>
);
