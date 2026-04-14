import {
  Box,
  Button,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  DrawerTitle,
  Icon,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
  Text,
} from "@chakra-ui/react";

import { getNodesByCategory } from "@/entities/node";
import { type NodeCategory } from "@/entities/node";
import { type NodeType } from "@/entities/node";

import { getDemoNodeAvailability } from "../model/demoPalette";
import { useAddNode } from "../model/useAddNode";

interface NodeCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { label: string; value: NodeCategory }[] = [
  { label: "도메인", value: "domain" },
  { label: "프로세싱", value: "processing" },
  { label: "AI", value: "ai" },
];

export const NodeCategoryDrawer = ({
  open,
  onClose,
}: NodeCategoryDrawerProps) => {
  const { addNode } = useAddNode();

  const handleNodeClick = (type: NodeType) => {
    if (!getDemoNodeAvailability(type).enabled) {
      return;
    }

    addNode(type);
    onClose();
  };

  return (
    <DrawerRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      placement="start"
      size="sm"
    >
      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>노드 추가</DrawerTitle>
          </DrawerHeader>
          <DrawerCloseTrigger />
          <DrawerBody>
            <TabsRoot defaultValue="domain">
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <Box display="flex" flexDirection="column" gap={2} pt={2}>
                    {getNodesByCategory(tab.value).map((meta) => (
                      <Button
                        key={meta.type}
                        variant="ghost"
                        justifyContent="space-between"
                        gap={2}
                        disabled={!getDemoNodeAvailability(meta.type).enabled}
                        onClick={() => handleNodeClick(meta.type)}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Icon as={meta.iconComponent} boxSize={5} />
                          <Text>{meta.label}</Text>
                        </Box>
                        <Text
                          fontSize="2xs"
                          color={
                            getDemoNodeAvailability(meta.type).enabled
                              ? "orange.600"
                              : "gray.500"
                          }
                          fontWeight="semibold"
                        >
                          {getDemoNodeAvailability(meta.type).badgeLabel}
                        </Text>
                      </Button>
                    ))}
                  </Box>
                </TabsContent>
              ))}
            </TabsRoot>
          </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
};
